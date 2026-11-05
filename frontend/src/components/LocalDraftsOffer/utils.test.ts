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
} from './utils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** What the machine's own time zone shows, so the tests don't depend on the zone they run in */
function localTextOf(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${pad(
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
  it('shows the overview’s date with the 24-hour time in the browser’s zone', () => {
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

describe('metaLineOf', () => {
  it('says "New connection" for a record without a stored draft', () => {
    const value = record();
    expect(metaLineOf(value)).toBe(`New connection · Last change ${localTextOf(value.changedAt)}`);
  });

  it('says "Draft" for a stored draft’s record', () => {
    const value = record({
      flowKey: 'draft-00000000-0000-4000-8000-000000000002',
      draftId: '00000000-0000-4000-8000-000000000002',
      draftVersion: 3,
    });
    expect(metaLineOf(value)).toBe(`Draft · Last change ${localTextOf(value.changedAt)}`);
  });
});

describe('discardTextOf', () => {
  it('names the connection', () => {
    expect(discardTextOf(record(), 'Parking permit')).toBe(
      'The unsaved changes to Parking permit will be deleted from this device. This can’t be undone.'
    );
  });

  it('adds that a stored draft stays', () => {
    const value = record({ draftId: '00000000-0000-4000-8000-000000000002', draftVersion: 1 });
    expect(discardTextOf(value, 'Parking permit')).toBe(
      'The unsaved changes to Parking permit will be deleted from this device. This can’t be undone. The saved draft stays as it is.'
    );
  });
});

describe('focusAfterDiscard', () => {
  const first = record({ flowKey: 'new-00000000-0000-4000-8000-00000000000a' });
  const second = record({ flowKey: 'new-00000000-0000-4000-8000-00000000000b' });

  it('moves to the next item’s "Resume"', () => {
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
