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
    expect(signOutNamesOf([], 'en')).toBe('');
  });

  it('names a single record', () => {
    expect(signOutNamesOf(records(1), 'en')).toBe('Form 1');
  });

  it('joins two names with "and"', () => {
    expect(signOutNamesOf(records(2), 'en')).toBe('Form 1 and Form 2');
  });

  it('names all five', () => {
    expect(signOutNamesOf(records(5), 'en')).toBe('Form 1, Form 2, Form 3, Form 4 and Form 5');
  });

  it('names five of eight, then how many more', () => {
    expect(signOutNamesOf(records(8), 'en')).toBe(
      'Form 1, Form 2, Form 3, Form 4, Form 5 and 3 more'
    );
  });

  it('calls a record without a name "Untitled connection"', () => {
    expect(signOutNamesOf([record(''), record('  ', 1), record('Parking permit', 2)], 'en')).toBe(
      'Untitled connection, Untitled connection and Parking permit'
    );
  });

  it('joins the names in German (spec 009)', () => {
    expect(signOutNamesOf(records(2), 'de')).toBe('Form 1 und Form 2');
    expect(signOutNamesOf(records(5), 'de')).toBe('Form 1, Form 2, Form 3, Form 4 und Form 5');
    expect(signOutNamesOf(records(8), 'de')).toBe(
      'Form 1, Form 2, Form 3, Form 4, Form 5 und 3 weitere'
    );
  });
});

describe('userMenuReducer', () => {
  it('closes the menu when it asks before signing out', () => {
    const open = userMenuReducer(INITIAL_USER_MENU_STATE, { type: 'opened' });
    const asked = userMenuReducer(open, { type: 'signOutAsked', records: records(1) });
    expect(asked).toEqual({ open: false, signOutRecords: records(1), signingOut: false });
  });

  it('keeps the records, so that the names are joined in the language shown (spec 009)', () => {
    const asked = userMenuReducer(INITIAL_USER_MENU_STATE, {
      type: 'signOutAsked',
      records: records(8),
    });
    const kept = asked.signOutRecords ?? [];
    expect(signOutNamesOf(kept, 'en')).toBe('Form 1, Form 2, Form 3, Form 4, Form 5 and 3 more');
    expect(signOutNamesOf(kept, 'de')).toBe('Form 1, Form 2, Form 3, Form 4, Form 5 und 3 weitere');
  });

  it('closes the warning on cancel, but not while signing out', () => {
    const asked = userMenuReducer(INITIAL_USER_MENU_STATE, {
      type: 'signOutAsked',
      records: records(1),
    });
    expect(userMenuReducer(asked, { type: 'signOutCancelled' }).signOutRecords).toBeNull();
    const confirmed = userMenuReducer(asked, { type: 'signOutConfirmed' });
    expect(userMenuReducer(confirmed, { type: 'signOutCancelled' })).toBe(confirmed);
  });

  it('toggles the menu', () => {
    const open = userMenuReducer(INITIAL_USER_MENU_STATE, { type: 'toggled' });
    expect(open.open).toBe(true);
    expect(userMenuReducer(open, { type: 'toggled' }).open).toBe(false);
  });
});
