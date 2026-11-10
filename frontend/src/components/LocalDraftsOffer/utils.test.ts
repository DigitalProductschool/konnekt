import { describe, expect, it } from 'vitest';

import { emptyContent } from '../../utils/localDrafts/content';
import type { LocalDraftRecord } from '../../utils/localDrafts/types';
import { INITIAL_DISCARD_STATE } from './constants';
import {
  discardReducer,
  discardTextOf,
  focusAfterDiscard,
  formatChangedAt,
  metaLineOf,
  textOf,
  titleOf,
} from './utils';

/**
 * What the machine's own time zone shows, so the tests don't depend on the zone they run in:
 * "06.11.2026, 14:20" (spec 008 FR-029 and cosmetic 3: the design's numeric dates)
 */
function localTextOf(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}, ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function record(overrides: Partial<LocalDraftRecord> = {}): LocalDraftRecord {
  return {
    format: 2,
    flowKey: 'new-00000000-0000-4000-8000-000000000001',
    draftId: null,
    draftVersion: null,
    changedAt: '2026-11-04T13:32:00.000Z',
    step: 'connection',
    content: { ...emptyContent(), name: 'Parking permit' },
    ...overrides,
  };
}

describe('formatChangedAt', () => {
  it('shows the numeric date with the 24-hour time in the browser’s zone', () => {
    expect(formatChangedAt('2026-11-04T13:32:00.000Z')).toBe(
      localTextOf('2026-11-04T13:32:00.000Z')
    );
    expect(formatChangedAt('2026-03-01T05:07:00.000Z')).toBe(
      localTextOf('2026-03-01T05:07:00.000Z')
    );
  });

  it('pads the hour and never uses a 12-hour clock', () => {
    expect(formatChangedAt('2026-11-04T22:05:00.000Z')).toMatch(/, \d{2}:\d{2}$/);
    expect(formatChangedAt('2026-11-04T22:05:00.000Z')).not.toMatch(/am|pm/i);
  });
});

// The texts of spec 008 FR-029 (cosmetic 4; U16 7362:54543, 7362:54614)
describe('metaLineOf', () => {
  it('says "New, never saved" for a record without a stored draft', () => {
    const value = record();
    expect(metaLineOf(value, 'en')).toBe(`New, never saved · ${localTextOf(value.changedAt)}`);
  });

  it('says "Edited" for a stored draft’s record', () => {
    const value = record({
      flowKey: 'draft-00000000-0000-4000-8000-000000000002',
      draftId: '00000000-0000-4000-8000-000000000002',
      draftVersion: 3,
    });
    expect(metaLineOf(value, 'en')).toBe(`Edited · ${localTextOf(value.changedAt)}`);
  });
});

describe('titleOf and textOf', () => {
  const first = record({ flowKey: 'new-00000000-0000-4000-8000-00000000000a' });
  const second = record({
    flowKey: 'new-00000000-0000-4000-8000-00000000000b',
    content: { ...emptyContent(), name: '  ' },
  });

  it('names the only draft and dates it in the sub-line (FR-029d)', () => {
    expect(titleOf([first], 'en')).toBe('Unsaved changes in “Parking permit”');
    expect(titleOf([second], 'en')).toBe('Unsaved changes in “Untitled connection”');
    expect(textOf([first], 'en')).toBe(
      `Saved only on this device on ${localTextOf(first.changedAt)}, when the page closed. Nobody else can see them.`
    );
  });

  it('counts several drafts', () => {
    expect(titleOf([first, second], 'en')).toBe('Unsaved changes in 2 connections');
    expect(textOf([first, second], 'en')).toBe(
      'Saved only on this device when the page closed. Nobody else can see them.'
    );
  });
});

// Spec 009: the same lines in German, the dates unchanged (FR-012)
describe('the offer’s lines in German', () => {
  const stored = record({
    flowKey: 'draft-00000000-0000-4000-8000-000000000002',
    draftId: '00000000-0000-4000-8000-000000000002',
    draftVersion: 3,
  });
  const untitled = record({
    flowKey: 'new-00000000-0000-4000-8000-00000000000b',
    content: { ...emptyContent(), name: '' },
  });

  it('words the item lines', () => {
    const date = localTextOf(stored.changedAt);
    expect(metaLineOf(record(), 'de')).toBe(`Neu, nie gespeichert · ${date}`);
    expect(metaLineOf(stored, 'de')).toBe(`Bearbeitet · ${date}`);
  });

  it('words the heading and the sub-line for one draft and for several', () => {
    expect(titleOf([record()], 'de')).toBe('Nicht gespeicherte Änderungen in „Parking permit“');
    expect(titleOf([untitled], 'de')).toBe(
      'Nicht gespeicherte Änderungen in „Unbenannte Anbindung“'
    );
    expect(textOf([record()], 'de')).toBe(
      `Am ${localTextOf(record().changedAt)} beim Schließen der Seite nur auf diesem Gerät gespeichert. Niemand sonst kann sie sehen.`
    );
    expect(titleOf([record(), untitled], 'de')).toBe(
      'Nicht gespeicherte Änderungen in 2 Anbindungen'
    );
    expect(textOf([record(), untitled], 'de')).toBe(
      'Beim Schließen der Seite nur auf diesem Gerät gespeichert. Niemand sonst kann sie sehen.'
    );
  });

  it('words the discard dialog’s text, with the stored draft’s sentence', () => {
    expect(discardTextOf(record(), 'Parking permit', 'de')).toBe(
      'Die nicht gespeicherten Änderungen an Parking permit werden von diesem Gerät gelöscht. Das kann nicht rückgängig gemacht werden.'
    );
    expect(discardTextOf(stored, 'Parking permit', 'de')).toBe(
      'Die nicht gespeicherten Änderungen an Parking permit werden von diesem Gerät gelöscht. Das kann nicht rückgängig gemacht werden. Der gespeicherte Entwurf bleibt unverändert.'
    );
  });
});

describe('discardTextOf', () => {
  it('names the connection', () => {
    expect(discardTextOf(record(), 'Parking permit', 'en')).toBe(
      'The unsaved changes to Parking permit will be deleted from this device. This can’t be undone.'
    );
  });

  it('adds that a stored draft stays', () => {
    const value = record({ draftId: '00000000-0000-4000-8000-000000000002', draftVersion: 1 });
    expect(discardTextOf(value, 'Parking permit', 'en')).toBe(
      'The unsaved changes to Parking permit will be deleted from this device. This can’t be undone. The saved draft stays as it is.'
    );
  });
});

describe('focusAfterDiscard', () => {
  const first = record({ flowKey: 'new-00000000-0000-4000-8000-00000000000a' });
  const second = record({ flowKey: 'new-00000000-0000-4000-8000-00000000000b' });

  it('moves to the next item’s "Resume editing"', () => {
    expect(focusAfterDiscard([first, second], first.flowKey)).toEqual({
      kind: 'resume',
      flowKey: second.flowKey,
    });
  });

  it('moves to the heading after the last item or an unknown one', () => {
    expect(focusAfterDiscard([first, second], second.flowKey)).toEqual({ kind: 'heading' });
    expect(focusAfterDiscard([first], 'new-unknown')).toEqual({ kind: 'heading' });
  });
});

describe('discardReducer', () => {
  it('asks, cancels, and discards with a fresh status each time', () => {
    const value = record();
    const asked = discardReducer(INITIAL_DISCARD_STATE, { type: 'ask', record: value });
    expect(asked.pending).toBe(value);
    expect(discardReducer(asked, { type: 'cancel' }).pending).toBeNull();

    const announced = { ...asked, announced: true, discards: 1 };
    const discarded = discardReducer(announced, {
      type: 'discarded',
      focus: { kind: 'heading' },
    });
    expect(discarded).toEqual({
      pending: null,
      focus: { kind: 'heading' },
      discards: 2,
      announced: false,
    });
    expect(discardReducer(discarded, { type: 'focused' }).focus).toBeNull();
    expect(discardReducer(discarded, { type: 'announce' }).announced).toBe(true);
  });
});
