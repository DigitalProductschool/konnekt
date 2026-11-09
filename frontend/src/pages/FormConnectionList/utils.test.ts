import type { FormConnectionSummary } from '@connection-portal/api-types/form-connections';
import { describe, expect, it } from 'vitest';

import { ApiError } from '../../api/client';
import { INITIAL_ROW_DELETE_STATE } from './constants';
import type { ListState, RowDeleteState } from './types';
import {
  deleteDialogCopyOf,
  descriptionOf,
  filterConnections,
  formatRowDate,
  homepageOf,
  listReducer,
  rowDeleteFailureOf,
  rowDeleteReducer,
  rowMetaOf,
} from './utils';

function summary(overrides: Partial<FormConnectionSummary> = {}): FormConnectionSummary {
  return {
    id: 'c1',
    name: 'Parking permit',
    description: '12345',
    is_active: true,
    status: 'published',
    updated_at: '2026-11-04T13:32:00Z',
    ...overrides,
  };
}

// Adopted item FR-029a (CLAR Q12 (a)): the overview shows the design's one hint in every state,
// so `hintOf` and its two sentences are gone; the hint is `LIST_COPY.hint`, unconditional

// Adopted item FR-051 (27) (research R8): the overview's search filters the loaded list in the
// page, on the name and the description, ignoring letter case
describe('filterConnections (FR-051 (27))', () => {
  const list = [
    summary({ id: 'c1', name: 'Fishing licence', description: 'Annual permit for fishing.' }),
    summary({ id: 'c2', name: 'Hunting licence', description: '', status: 'draft' }),
    summary({
      id: 'c3',
      name: 'Residents’ parking permit',
      description: 'Lets residents park in their own zone.',
      is_active: false,
    }),
  ];
  const ids = (shown: FormConnectionSummary[]) => shown.map((each) => each.id);

  it('shows every row for an empty or blank query', () => {
    expect(ids(filterConnections(list, ''))).toEqual(['c1', 'c2', 'c3']);
    expect(ids(filterConnections(list, '   '))).toEqual(['c1', 'c2', 'c3']);
  });

  it('matches the name, ignoring letter case', () => {
    expect(ids(filterConnections(list, 'fish'))).toEqual(['c1']);
    expect(ids(filterConnections(list, 'LICENCE'))).toEqual(['c1', 'c2']);
    expect(ids(filterConnections(list, 'Residents’'))).toEqual(['c3']);
  });

  it('matches the description', () => {
    expect(ids(filterConnections(list, 'own zone'))).toEqual(['c3']);
    expect(ids(filterConnections(list, 'Annual'))).toEqual(['c1']);
  });

  it('ignores the spaces around the query, not those inside it', () => {
    expect(ids(filterConnections(list, '  hunting  '))).toEqual(['c2']);
    expect(ids(filterConnections(list, 'hunting  licence'))).toEqual([]);
  });

  it('keeps the list’s order and finds nothing for an unknown text', () => {
    expect(ids(filterConnections(list, 'i'))).toEqual(['c1', 'c2', 'c3']);
    expect(filterConnections(list, 'taxi')).toEqual([]);
  });

  it('returns a new array and leaves the list as it was', () => {
    const shown = filterConnections(list, '');
    expect(shown).not.toBe(list);
    expect(shown).toEqual(list);
  });
});

describe('descriptionOf (FR-005)', () => {
  it('returns the description as written, without a prefix', () => {
    expect(descriptionOf(summary())).toBe('12345');
    expect(descriptionOf(summary({ status: 'draft' }))).toBe('12345');
  });

  it('returns null for an empty description', () => {
    expect(descriptionOf(summary({ description: '' }))).toBeNull();
    expect(descriptionOf(summary({ status: 'draft', description: '' }))).toBeNull();
  });
});

// Adopted item FR-027 (research R6; CLAR 2026-11-07 #9): the welcome page replaces the empty
// overview as the homepage while no connection or draft exists
describe('homepageOf (FR-027)', () => {
  it('shows the welcome page when the loaded list is empty, whatever the memory says', () => {
    expect(homepageOf([], null)).toBe('welcome');
    expect(homepageOf([], false)).toBe('welcome');
    expect(homepageOf([], true)).toBe('welcome');
  });

  it('shows the overview when the loaded list holds a connection, whatever the memory says', () => {
    expect(homepageOf([summary()], null)).toBe('overview');
    expect(homepageOf([summary()], false)).toBe('overview');
    expect(homepageOf([summary({ is_active: false })], false)).toBe('overview');
  });

  it('counts a draft as a connection (W11)', () => {
    expect(homepageOf([summary({ status: 'draft', is_active: false })], false)).toBe('overview');
  });

  it('follows the memory while the list loads', () => {
    expect(homepageOf(null, true)).toBe('overview');
    expect(homepageOf(null, false)).toBe('welcome');
  });

  it('reads no memory as the welcome page while the list loads', () => {
    expect(homepageOf(null, null)).toBe('welcome');
  });
});

// Adopted items FR-048 and FR-052d (F52, F71; cosmetic 3): every row reads "Edited <date>" in
// dd.mm.yyyy, never "Published <date>" or "Deactivated <date>", and a draft adds its step
describe('rowMetaOf (FR-048, FR-052d)', () => {
  const noon = '2026-10-28T12:00:00Z';

  it('formats the date as dd.mm.yyyy', () => {
    expect(formatRowDate(noon)).toBe('28.10.2026');
    expect(formatRowDate('2026-03-04T12:00:00Z')).toBe('04.03.2026');
  });

  it('reads "Edited <date>" for a published connection, active or deactivated', () => {
    expect(rowMetaOf({ status: 'published', updated_at: noon })).toBe('Edited 28.10.2026');
    expect(rowMetaOf({ status: 'published', updated_at: noon, step: 'rules' })).toBe(
      'Edited 28.10.2026'
    );
  });

  it('adds the step a draft was saved in (FR-052d: "Edited 28.10.2026 · Rules step")', () => {
    expect(rowMetaOf({ status: 'draft', updated_at: noon, step: 'rules' })).toBe(
      'Edited 28.10.2026 · Rules step'
    );
    expect(rowMetaOf({ status: 'draft', updated_at: noon, step: 'connection' })).toBe(
      'Edited 28.10.2026 · Connection step'
    );
    expect(rowMetaOf({ status: 'draft', updated_at: noon, step: 'documents' })).toBe(
      'Edited 28.10.2026 · Documents step'
    );
    expect(rowMetaOf({ status: 'draft', updated_at: noon, step: 'test' })).toBe(
      'Edited 28.10.2026 · Test step'
    );
  });

  it('reads "Edited <date>" alone for a draft whose step is unknown', () => {
    expect(rowMetaOf({ status: 'draft', updated_at: noon })).toBe('Edited 28.10.2026');
    expect(rowMetaOf({ status: 'draft', updated_at: noon, step: null })).toBe('Edited 28.10.2026');
  });
});

// Adopted item FR-029c (F55; CLAR 2026-11-07 #12): one delete dialog, "Delete “<name>”?", whose
// body follows the connection's state; a draft keeps its own
describe('deleteDialogCopyOf (FR-029c)', () => {
  it('keeps the draft’s own body', () => {
    expect(
      deleteDialogCopyOf(summary({ name: 'Hunting licence', status: 'draft', is_active: true }))
    ).toEqual({
      title: 'Delete “Hunting licence”?',
      text: 'Hunting licence will be deleted for good. It was never live, so nothing changes for serviceBW.',
    });
  });

  it('warns that an active connection’s links stop working', () => {
    expect(deleteDialogCopyOf(summary({ name: 'Fishing licence' }))).toEqual({
      title: 'Delete “Fishing licence”?',
      text: 'This connection is active. Citizens won’t be able to use it, and its links stop working.',
    });
  });

  it('says a deactivated connection’s documents and rules go too', () => {
    expect(deleteDialogCopyOf(summary({ name: 'Parking', is_active: false }))).toEqual({
      title: 'Delete “Parking”?',
      text: 'Its documents and rules will be deleted too.',
    });
  });
});

// Adopted item FR-028: each row offers Delete; the deleted row leaves the list, and the last one
// leaves it empty (FR-027: the welcome page)
describe('listReducer: removed (FR-028)', () => {
  const loaded: ListState = {
    status: 'loaded',
    attempt: 2,
    formConnections: [summary({ id: 'c1' }), summary({ id: 'c2' })],
  };

  it('takes the deleted row out of the loaded list, keeping the others and their order', () => {
    expect(listReducer(loaded, { type: 'removed', id: 'c1' })).toEqual({
      status: 'loaded',
      attempt: 2,
      formConnections: [summary({ id: 'c2' })],
    });
  });

  it('leaves the list empty after the last row', () => {
    const one = listReducer(loaded, { type: 'removed', id: 'c1' });
    const none = listReducer(one, { type: 'removed', id: 'c2' });
    expect(none.status === 'loaded' && none.formConnections).toEqual([]);
    expect(homepageOf(none.status === 'loaded' ? none.formConnections : null, true)).toBe(
      'welcome'
    );
  });

  it('changes nothing while the list loads or after a failure', () => {
    const loading: ListState = { status: 'loading', attempt: 1 };
    expect(listReducer(loading, { type: 'removed', id: 'c1' })).toBe(loading);
  });
});

describe('rowDeleteReducer (FR-028, FR-029c)', () => {
  const target = summary({ id: 'c7', name: 'Hunting licence', status: 'draft' });
  const open = rowDeleteReducer(INITIAL_ROW_DELETE_STATE, { type: 'open', target });
  const notice = { message: 'Something went wrong.', error_id: 'e-1' };

  it('opens for the row and keeps it while the dialog closes', () => {
    expect(open).toEqual({ target, open: true, deleting: false, error: null, stale: false });
    expect(rowDeleteReducer(open, { type: 'close' })).toEqual({ ...open, open: false });
  });

  it('cannot be closed while the delete runs', () => {
    const running = rowDeleteReducer(open, { type: 'start' });
    expect(running.deleting).toBe(true);
    expect(rowDeleteReducer(running, { type: 'close' })).toBe(running);
  });

  it('shows a failure, and takes it away when the delete is tried again', () => {
    const running = rowDeleteReducer(open, { type: 'start' });
    const failed = rowDeleteReducer(running, { type: 'failed', error: notice, stale: false });
    expect(failed).toEqual({ ...open, error: notice });
    expect(rowDeleteReducer(failed, { type: 'start' })).toEqual({
      ...open,
      deleting: true,
      error: null,
    });
  });

  it('closes after the delete, keeping the row for the closing dialog', () => {
    const running = rowDeleteReducer(open, { type: 'start' });
    const done: RowDeleteState = rowDeleteReducer(running, { type: 'done' });
    expect(done).toEqual({ target, open: false, deleting: false, error: null, stale: false });
  });
});

describe('rowDeleteFailureOf (FR-008)', () => {
  it('keeps the API’s message and a 5xx answer’s error ID', () => {
    const error = new ApiError(500, { error: 'internal', message: 'Failed.', error_id: 'e-9' });
    expect(rowDeleteFailureOf(error)).toEqual({
      error: { message: 'Failed.', error_id: 'e-9' },
      stale: false,
    });
  });

  it('marks the list out of date when the row was deleted or published meanwhile', () => {
    const gone = new ApiError(404, { error: 'not_found', message: 'Not found.' });
    const published = new ApiError(409, { error: 'draft_published', message: 'Published.' });
    expect(rowDeleteFailureOf(gone).stale).toBe(true);
    expect(rowDeleteFailureOf(published).stale).toBe(true);
  });

  it('says nothing changed when no answer came', () => {
    expect(rowDeleteFailureOf(new TypeError('Failed to fetch'))).toEqual({
      error: { message: 'Nothing changed. Check your connection and try again.' },
      stale: false,
    });
  });
});
