import type {
  FormConnectionSummary,
  SelectionChanged,
} from '@connection-portal/api-types/form-connections';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../api/client';
import {
  EXAMPLE_DIALOG_COPY,
  INITIAL_BULK_DELETE_STATE,
  INITIAL_DELETION_STATE,
  INITIAL_EXAMPLE_DIALOG_STATE,
  INITIAL_ROW_DELETE_STATE,
  WELCOME_COPY,
} from './constants';
import type {
  BulkDeleteState,
  DeletionAction,
  DeletionState,
  ListState,
  RowDeleteState,
  Selection,
} from './types';
import {
  bulkDeleteFailureOf,
  bulkDeleteNoticeOf,
  bulkDeleteReducer,
  bulkWarningsOf,
  canRestore,
  deleteDialogCopyOf,
  deletionItemsOf,
  deletionReducer,
  deletionToastOf,
  descriptionOf,
  exampleDialogReducer,
  exampleFailureOf,
  filterConnections,
  formatRowDate,
  homepageOf,
  initialDeletionOf,
  listReducer,
  restoreFailureOf,
  rowBubbleClass,
  rowDeleteFailureOf,
  rowDeleteReducer,
  rowMetaOf,
  selectAllStateOf,
  selectionReducer,
  withRestored,
} from './utils';

function summary(overrides: Partial<FormConnectionSummary> = {}): FormConnectionSummary {
  return {
    id: 'c1',
    name: 'Parking permit',
    description: '12345',
    is_active: true,
    status: 'published',
    updated_at: '2026-11-04T13:32:00Z',
    state: 'live',
    published_at: '2026-11-04T13:32:00Z',
    deactivated_at: null,
    start_date: null,
    step: null,
    example: null,
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

// Adopted items FR-048 and FR-052d (F52, F71; cosmetic 3), changed by spec 010's FR-017 (F23): a
// row's date reads by its state in dd.mm.yyyy: "Published <date>" (once "Edited <date>", the one
// changed expectation), "Active from <date>", "Deactivated <date>", and a draft's "Edited <date>"
// with its step (FR-019; F42), alone where no step is recorded
// Bug connection-tooltip-clipped: the description's bubble opens in the top layer, anchored to the
// description, so that the card, whose rows scroll, doesn't cut it off
describe('rowBubbleClass (FR-051 (35), FR-052)', () => {
  const SIDES = ['start', 'end', 'full'] as const;

  function classesOf(value: string): string[] {
    return value.split(/\s+/).filter(Boolean);
  }

  it("anchors the bubble to its own row's description, below it or flipped above it", () => {
    for (const side of SIDES) {
      const classes = classesOf(rowBubbleClass({ side, direction: 'down' }, true, true));
      expect(classes).toContain('[position-anchor:--row-description]');
      expect(classes).toContain('top-[anchor(bottom)]');
      expect(classes).toContain('[position-try-fallbacks:flip-block,--row-description-top]');
      // The browser's popover box: centred in the window, with a border and a padding
      expect(classes).toEqual(expect.arrayContaining(['inset-auto', 'm-0', 'border-0', 'px-0']));
      // The 8px gap on both sides, whichever side the browser opens it to
      expect(classes).toContain('py-8');
    }
  });

  it('lines the bubble up with the side placementFrom() chose', () => {
    expect(classesOf(rowBubbleClass({ side: 'start', direction: 'down' }, true, true))).toEqual(
      expect.arrayContaining(['left-[anchor(left)]', 'w-280', 'max-w-[calc(100vw-32px)]'])
    );
    expect(classesOf(rowBubbleClass({ side: 'end', direction: 'down' }, true, true))).toEqual(
      expect.arrayContaining(['right-[anchor(right)]', 'w-280', 'max-w-[calc(100vw-32px)]'])
    );
    // Across the window less its gutters: the popover's fit-content width goes
    const full = classesOf(rowBubbleClass({ side: 'full', direction: 'down' }, true, true));
    expect(full).toEqual(expect.arrayContaining(['inset-x-16', 'w-auto']));
    expect(full).not.toContain('w-280');
  });

  it('places it with the anchor and the gutters, never with coordinates', () => {
    for (const side of SIDES) {
      const insets = classesOf(rowBubbleClass({ side, direction: 'up' }, true, true)).filter(
        (each) => /^-?(top|bottom|left|right|translate-[xy])-/.test(each)
      );
      expect(insets.length).toBeGreaterThan(0);
      for (const inset of insets) {
        expect(inset).toMatch(/^(top|bottom|left|right)-\[anchor\((top|bottom|left|right)\)\]$/);
      }
    }
  });

  it('leaves the direction and the showing to the browser in the top layer', () => {
    for (const side of SIDES) {
      const down = rowBubbleClass({ side, direction: 'down' }, true, true);
      expect(rowBubbleClass({ side, direction: 'up' }, false, true)).toBe(down);
      // Shown as an open popover; closed, the browser hides it
      expect(classesOf(down)).toContain('open:flex');
      expect(classesOf(down)).not.toContain('hidden');
      expect(classesOf(down)).not.toContain('absolute');
    }
  });

  it('keeps the bubble inside the row where the browser lacks anchor positioning', () => {
    expect(rowBubbleClass({ side: 'start', direction: 'down' }, true, false)).toBe(
      'absolute z-40 top-full left-0 pt-8 w-280 max-w-[calc(100vw-32px)] flex'
    );
    expect(rowBubbleClass({ side: 'end', direction: 'up' }, false, false)).toBe(
      'absolute z-40 bottom-full right-0 pb-8 w-280 max-w-[calc(100vw-32px)] hidden'
    );
  });
});

describe('rowMetaOf (FR-017, FR-019, FR-020, FR-021)', () => {
  const noon = '2026-10-28T12:00:00Z';
  const live = summary({ updated_at: '2026-11-04T09:00:00Z', published_at: noon });
  const scheduled = summary({
    is_active: false,
    state: 'scheduled',
    published_at: '2026-11-04T09:00:00Z',
    start_date: '2026-12-01',
  });
  const deactivated = summary({
    is_active: false,
    state: 'deactivated',
    updated_at: '2026-11-04T09:00:00Z',
    deactivated_at: noon,
  });
  const draft = (step: FormConnectionSummary['step']) =>
    summary({ status: 'draft', state: 'draft', updated_at: noon, published_at: null, step });

  it('formats the date as dd.mm.yyyy', () => {
    expect(formatRowDate(noon)).toBe('28.10.2026');
    expect(formatRowDate('2026-03-04T12:00:00Z')).toBe('04.03.2026');
  });

  it('reads "Published <published_at>" for a live connection, never its last change', () => {
    expect(rowMetaOf(live, 'en')).toBe('Published 28.10.2026');
    expect(rowMetaOf({ ...live, step: 'rules' }, 'en')).toBe('Published 28.10.2026');
  });

  it('reads "Active from <start_date>" for a scheduled connection', () => {
    expect(rowMetaOf(scheduled, 'en')).toBe('Active from 01.12.2026');
  });

  it('reads "Deactivated <deactivated_at>" for a deactivated connection', () => {
    expect(rowMetaOf(deactivated, 'en')).toBe('Deactivated 28.10.2026');
  });

  it('adds the step a draft was saved in (FR-019: "Edited 28.10.2026 · Rules step")', () => {
    expect(rowMetaOf(draft('rules'), 'en')).toBe('Edited 28.10.2026 · Rules step');
    expect(rowMetaOf(draft('connection'), 'en')).toBe('Edited 28.10.2026 · Connection step');
    expect(rowMetaOf(draft('documents'), 'en')).toBe('Edited 28.10.2026 · Documents step');
    expect(rowMetaOf(draft('test'), 'en')).toBe('Edited 28.10.2026 · Test step');
  });

  it('reads "Edited <date>" alone for a draft whose step is unknown', () => {
    expect(rowMetaOf(draft(null), 'en')).toBe('Edited 28.10.2026');
  });

  it('reads each state in German, the date unchanged (spec 009, FR-012)', () => {
    expect(rowMetaOf(live, 'de')).toBe('Veröffentlicht 28.10.2026');
    expect(rowMetaOf(scheduled, 'de')).toBe('Aktiv ab 01.12.2026');
    expect(rowMetaOf(deactivated, 'de')).toBe('Deaktiviert 28.10.2026');
    expect(rowMetaOf(draft('rules'), 'de')).toBe('Bearbeitet 28.10.2026 · Schritt „Regeln“');
    expect(rowMetaOf(draft('connection'), 'de')).toBe(
      'Bearbeitet 28.10.2026 · Schritt „Anbindung“'
    );
    expect(rowMetaOf(draft('documents'), 'de')).toBe('Bearbeitet 28.10.2026 · Schritt „Dokumente“');
    expect(rowMetaOf(draft('test'), 'de')).toBe('Bearbeitet 28.10.2026 · Schritt „Test“');
    expect(rowMetaOf(draft(null), 'de')).toBe('Bearbeitet 28.10.2026');
  });

  it('reads the start date as written in every time zone (FR-020)', () => {
    try {
      // West of UTC, the day would read 30.11.2026 if it went through `Date`; `vi.stubEnv` sets
      // `process.env.TZ`, which Node applies at once
      for (const zone of ['America/New_York', 'Pacific/Honolulu', 'Pacific/Kiritimati']) {
        vi.stubEnv('TZ', zone);
        expect(new Date('2026-12-01T00:00:00Z').getTimezoneOffset()).not.toBe(0);
        expect(rowMetaOf(scheduled, 'en')).toBe('Active from 01.12.2026');
        expect(rowMetaOf(scheduled, 'de')).toBe('Aktiv ab 01.12.2026');
      }
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('never leaves a row empty when its state’s date is missing (FR-021)', () => {
    expect(rowMetaOf({ ...live, published_at: null }, 'en')).toBe('Edited 04.11.2026');
    expect(rowMetaOf({ ...scheduled, start_date: null }, 'en')).toBe('Edited 04.11.2026');
    expect(rowMetaOf({ ...deactivated, deactivated_at: null }, 'en')).toBe('Edited 04.11.2026');
  });
});

// Adopted item FR-029c (F55; CLAR 2026-11-07 #12): one delete dialog, "Delete “<name>”?", whose
// body follows the connection's state; a draft keeps its own
describe('deleteDialogCopyOf (FR-029c)', () => {
  it('keeps the draft’s own body', () => {
    expect(
      deleteDialogCopyOf(
        summary({ name: 'Hunting licence', status: 'draft', is_active: true }),
        'en'
      )
    ).toEqual({
      title: 'Delete “Hunting licence”?',
      text: 'Hunting licence will be deleted for good. It was never live, so nothing changes for serviceBW.',
    });
  });

  it('warns that an active connection’s links stop working', () => {
    expect(deleteDialogCopyOf(summary({ name: 'Fishing licence' }), 'en')).toEqual({
      title: 'Delete “Fishing licence”?',
      text: 'This connection is active. Citizens won’t be able to use it, and its links stop working.',
    });
  });

  it('says a deactivated connection’s documents and rules go too', () => {
    expect(deleteDialogCopyOf(summary({ name: 'Parking', is_active: false }), 'en')).toEqual({
      title: 'Delete “Parking”?',
      text: 'Its documents and rules will be deleted too.',
    });
  });

  it('says a scheduled connection won’t become active, with its start date (FR-010)', () => {
    const scheduled = summary({
      name: 'Passenger transport licence',
      is_active: false,
      state: 'scheduled',
      published_at: '2026-11-04T13:32:00Z',
      start_date: '2026-12-01',
    });
    expect(deleteDialogCopyOf(scheduled, 'en')).toEqual({
      title: 'Delete “Passenger transport licence”?',
      text: 'This connection will be active from 01.12.2026. If you delete it, it won’t become active and its links won’t work.',
    });
    expect(deleteDialogCopyOf(scheduled, 'de')).toEqual({
      title: '„Passenger transport licence“ löschen?',
      text: 'Diese Anbindung ist ab 01.12.2026 aktiv. Wenn Sie sie löschen, wird sie nicht aktiv und ihre Links funktionieren nicht.',
    });
    // A scheduled row without its date (FR-021) keeps the inactive body
    expect(deleteDialogCopyOf({ ...scheduled, start_date: null }, 'en').text).toBe(
      'Its documents and rules will be deleted too.'
    );
  });

  it('words the title and every body in German (spec 009)', () => {
    expect(
      deleteDialogCopyOf(
        summary({ name: 'Hunting licence', status: 'draft', is_active: true }),
        'de'
      )
    ).toEqual({
      title: '„Hunting licence“ löschen?',
      text: 'Hunting licence wird endgültig gelöscht. Die Anbindung war nie aktiv, daher ändert sich für serviceBW nichts.',
    });
    expect(deleteDialogCopyOf(summary({ name: 'Fishing licence' }), 'de').text).toBe(
      'Diese Anbindung ist aktiv. Bürgerinnen und Bürger können sie dann nicht mehr nutzen, und ihre Links funktionieren nicht mehr.'
    );
    expect(deleteDialogCopyOf(summary({ name: 'Parking', is_active: false }), 'de').text).toBe(
      'Die Dokumente und Regeln der Anbindung werden ebenfalls gelöscht.'
    );
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
    expect(rowDeleteFailureOf(error, 'en')).toEqual({
      error: { message: 'Failed.', error_id: 'e-9' },
      stale: false,
    });
  });

  it('marks the list out of date when the row was deleted or published meanwhile', () => {
    const gone = new ApiError(404, { error: 'not_found', message: 'Not found.' });
    const published = new ApiError(409, { error: 'draft_published', message: 'Published.' });
    expect(rowDeleteFailureOf(gone, 'en').stale).toBe(true);
    expect(rowDeleteFailureOf(published, 'en').stale).toBe(true);
  });

  it('says nothing changed when no answer came', () => {
    expect(rowDeleteFailureOf(new TypeError('Failed to fetch'), 'en')).toEqual({
      error: { message: 'Nothing changed. Check your connection and try again.' },
      stale: false,
    });
  });

  it('says so in German without an answer, and keeps the API’s message (spec 009)', () => {
    expect(rowDeleteFailureOf(new TypeError('Failed to fetch'), 'de').error).toEqual({
      message:
        'Es wurde nichts geändert. Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
    });
    const error = new ApiError(500, { error: 'internal', message: 'Fehler.', error_id: 'e-9' });
    expect(rowDeleteFailureOf(error, 'de').error).toEqual({ message: 'Fehler.', error_id: 'e-9' });
  });
});

// Spec 010, User Story 4 (FR-033 to FR-037; S4 "After a deletion", "Undo"; W11)
describe('listReducer: restored (spec 010, FR-034)', () => {
  const rows = [
    summary({ id: 'c1', updated_at: '2026-11-10T10:00:00Z' }),
    summary({ id: 'c3', updated_at: '2026-11-08T10:00:00Z' }),
  ];
  const loaded: ListState = { status: 'loaded', attempt: 0, formConnections: rows };
  const ids = (state: ListState) =>
    state.status === 'loaded' ? state.formConnections.map((each) => each.id) : null;

  it('puts a restored row back in its place by its updated_at, without a reload', () => {
    const back = summary({ id: 'c2', updated_at: '2026-11-09T10:00:00Z' });
    expect(ids(listReducer(loaded, { type: 'restored', items: [back] }))).toEqual([
      'c1',
      'c2',
      'c3',
    ]);
  });

  it('turns the empty list of the welcome page back into the overview', () => {
    const empty: ListState = { status: 'loaded', attempt: 0, formConnections: [] };
    const back = listReducer(empty, { type: 'restored', items: [summary({ id: 'c9' })] });
    expect(homepageOf(back.status === 'loaded' ? back.formConnections : null, false)).toBe(
      'overview'
    );
  });

  it('loads the list again when it isn’t there yet, so that it can’t miss the rows', () => {
    expect(
      listReducer({ status: 'loading', attempt: 0 }, { type: 'restored', items: rows })
    ).toEqual({ status: 'loading', attempt: 1 });
    const failed: ListState = { status: 'failed', attempt: 2, notice: { message: 'x' } };
    expect(listReducer(failed, { type: 'restored', items: rows })).toEqual({
      status: 'loading',
      attempt: 3,
    });
  });
});

describe('withRestored (spec 010, FR-034)', () => {
  it('sorts by updated_at, newest first, then by id, as the server lists', () => {
    const list = [summary({ id: 'b', updated_at: '2026-11-09T10:00:00Z' })];
    const items = [
      summary({ id: 'c', updated_at: '2026-11-09T10:00:00Z' }),
      summary({ id: 'a', updated_at: '2026-11-09T10:00:00+00:00' }),
      summary({ id: 'z', updated_at: '2026-11-11T09:00:00.123456+01:00' }),
    ];
    expect(withRestored(list, items).map((each) => each.id)).toEqual(['z', 'a', 'b', 'c']);
  });

  it('replaces a row the list still holds instead of doubling it', () => {
    const old = summary({ id: 'c1', name: 'Old' });
    const back = summary({ id: 'c1', name: 'Back' });
    expect(withRestored([old], [back])).toEqual([back]);
  });
});

describe('deletionReducer (spec 010, FR-033 to FR-037)', () => {
  const deleted = deletionReducer(INITIAL_DELETION_STATE, {
    type: 'deleted',
    deletionId: 'd-1',
    names: ['Fishing licence'],
  });
  const run = (state: DeletionState, actions: DeletionAction[]) =>
    actions.reduce(deletionReducer, state);
  const restoring = run(deleted, [{ type: 'restoring', deletionId: 'd-1' }]);

  it('shows the deletion’s toast with "Undo" as a new toast', () => {
    expect(deleted).toEqual({
      toastId: 2,
      current: {
        id: 'd-1',
        names: ['Fishing licence'],
        outcome: 'deleted',
        restoring: false,
        shown: true,
        errorId: null,
      },
    });
    expect(canRestore(deleted)).toBe(true);
    expect(canRestore(INITIAL_DELETION_STATE)).toBe(false);
  });

  it('waits for the restore with the same toast, and refuses a second "Undo" meanwhile', () => {
    expect(restoring.toastId).toBe(2);
    expect(restoring.current?.restoring).toBe(true);
    expect(canRestore(restoring)).toBe(false);
    expect(deletionReducer(restoring, { type: 'restoring', deletionId: 'd-1' })).toBe(restoring);
  });

  it('shows "restored" as a new toast without "Undo"', () => {
    const restored = run(restoring, [{ type: 'restored', deletionId: 'd-1' }]);
    expect(restored.toastId).toBe(3);
    expect(restored.current).toMatchObject({ outcome: 'restored', restoring: false, shown: true });
    expect(canRestore(restored)).toBe(false);
  });

  it('says "can no longer be restored" for good after a refusal', () => {
    const refused = run(restoring, [{ type: 'notRestorable', deletionId: 'd-1' }]);
    expect(refused.current).toMatchObject({ outcome: 'notRestorable', shown: true });
    expect(canRestore(refused)).toBe(false);
  });

  it('offers "Undo" again after a failure, with a 5xx’s error ID', () => {
    const failed = run(restoring, [{ type: 'failed', deletionId: 'd-1', errorId: 'e-7' }]);
    expect(failed.toastId).toBe(3);
    expect(failed.current).toMatchObject({ outcome: 'failed', errorId: 'e-7', shown: true });
    expect(canRestore(failed)).toBe(true);
    const again = run(failed, [{ type: 'restoring', deletionId: 'd-1' }]);
    expect(again.current?.restoring).toBe(true);
    expect(run(again, [{ type: 'restored', deletionId: 'd-1' }]).current?.errorId).toBeNull();
  });

  it('takes "Undo" away with a toast that closed, leaving the deletion standing', () => {
    const closed = run(deleted, [{ type: 'dismissed' }]);
    expect(closed.current?.shown).toBe(false);
    expect(canRestore(closed)).toBe(false);
    expect(run(closed, [{ type: 'restoring', deletionId: 'd-1' }])).toBe(closed);
    expect(deletionReducer(closed, { type: 'dismissed' })).toBe(closed);
  });

  it('still shows the answer of a restore sent before its toast closed', () => {
    const closed = run(restoring, [{ type: 'dismissed' }]);
    const restored = run(closed, [{ type: 'restored', deletionId: 'd-1' }]);
    expect(restored.current).toMatchObject({ outcome: 'restored', shown: true });
  });

  it('replaces the toast with a newer deletion, whose "Undo" is its own', () => {
    const newer = run(restoring, [
      { type: 'deleted', deletionId: 'd-2', names: ['Hunting licence'] },
    ]);
    expect(newer.toastId).toBe(3);
    expect(newer.current).toMatchObject({ id: 'd-2', outcome: 'deleted', restoring: false });
    // The older restore's answer changes nothing here
    expect(run(newer, [{ type: 'restored', deletionId: 'd-1' }])).toBe(newer);
    expect(run(newer, [{ type: 'restoring', deletionId: 'd-1' }])).toBe(newer);
  });

  it('ignores an answer that no restore waits for', () => {
    expect(run(deleted, [{ type: 'restored', deletionId: 'd-1' }])).toBe(deleted);
    expect(run(deleted, [{ type: 'failed', deletionId: 'd-1', errorId: null }])).toBe(deleted);
  });

  it('offers no "Undo" for a deletion nothing can restore', () => {
    const final = deletionReducer(INITIAL_DELETION_STATE, {
      type: 'deleted',
      deletionId: null,
      names: ['Fishing licence'],
    });
    expect(canRestore(final)).toBe(false);
    expect(deletionToastOf(final, 'en')?.actionLabel).toBeUndefined();
  });
});

describe('initialDeletionOf (spec 010, FR-033)', () => {
  it('starts with the deletion the details made, its toast and its "Undo"', () => {
    const arrived = initialDeletionOf({ names: ['Fishing licence'], deletionId: 'd-1' });
    expect(arrived.current).toMatchObject({ id: 'd-1', outcome: 'deleted', shown: true });
    expect(canRestore(arrived)).toBe(true);
  });

  it('starts with none otherwise', () => {
    expect(initialDeletionOf(undefined)).toBe(INITIAL_DELETION_STATE);
  });
});

describe('deletionToastOf (spec 010; copy.md §4; design-notes §4.2 T038)', () => {
  const deleted = initialDeletionOf({ names: ['Fishing licence'], deletionId: 'd-1' });
  const restoring = deletionReducer(deleted, { type: 'restoring', deletionId: 'd-1' });
  const after = (action: DeletionAction) => deletionReducer(restoring, action);

  it('reads "“<name>” deleted." in red with "Undo", in both languages', () => {
    expect(deletionToastOf(deleted, 'en')).toEqual({
      id: 2,
      kind: 'danger',
      message: '“Fishing licence” deleted.',
      actionLabel: 'Undo',
    });
    expect(deletionToastOf(deleted, 'de')).toMatchObject({
      message: '„Fishing licence“ gelöscht.',
      actionLabel: 'Rückgängig',
    });
  });

  it('keeps the toast as it was while "Undo" waits', () => {
    expect(deletionToastOf(restoring, 'en')).toEqual(deletionToastOf(deleted, 'en'));
  });

  it('reads "“<name>” restored." in green', () => {
    const toast = deletionToastOf(after({ type: 'restored', deletionId: 'd-1' }), 'en');
    expect(toast).toEqual({ id: 3, kind: 'success', message: '“Fishing licence” restored.' });
    expect(deletionToastOf(after({ type: 'restored', deletionId: 'd-1' }), 'de')?.message).toBe(
      '„Fishing licence“ wiederhergestellt.'
    );
  });

  it('reads "“<name>” can no longer be restored." in ink, without "Undo"', () => {
    const state = after({ type: 'notRestorable', deletionId: 'd-1' });
    expect(deletionToastOf(state, 'en')).toEqual({
      id: 3,
      kind: 'neutral',
      message: '“Fishing licence” can no longer be restored.',
    });
    expect(deletionToastOf(state, 'de')?.message).toBe(
      '„Fishing licence“ kann nicht mehr wiederhergestellt werden.'
    );
  });

  it('reads "Couldn’t restore. Try again." in ink with "Undo" again and the error ID', () => {
    const state = after({ type: 'failed', deletionId: 'd-1', errorId: 'e-7' });
    expect(deletionToastOf(state, 'en')).toEqual({
      id: 3,
      kind: 'neutral',
      message: 'Couldn’t restore. Try again.',
      actionLabel: 'Undo',
      errorId: 'e-7',
    });
    expect(deletionToastOf(state, 'de')).toMatchObject({
      message: 'Wiederherstellen nicht möglich. Versuchen Sie es erneut.',
      actionLabel: 'Rückgängig',
    });
  });

  it('shows nothing before a deletion or after its toast closed', () => {
    expect(deletionToastOf(INITIAL_DELETION_STATE, 'en')).toBeNull();
    expect(deletionToastOf(deletionReducer(deleted, { type: 'dismissed' }), 'en')).toBeNull();
  });
});

describe('deletionToastOf for a bulk deletion (spec 010, FR-044; copy.md §4)', () => {
  const names = ['Fishing licence', 'Hunting licence', 'Parking permit'];
  const deleted = deletionReducer(INITIAL_DELETION_STATE, {
    type: 'deleted',
    deletionId: 'd-2',
    names,
  });
  const restoring = deletionReducer(deleted, { type: 'restoring', deletionId: 'd-2' });
  const after = (action: DeletionAction) => deletionReducer(restoring, action);

  it('reads "<n> connections deleted." in red with "Undo", in both languages', () => {
    expect(deletionToastOf(deleted, 'en')).toEqual({
      id: 2,
      kind: 'danger',
      message: '3 connections deleted.',
      actionLabel: 'Undo',
    });
    expect(deletionToastOf(deleted, 'de')).toMatchObject({
      message: '3 Anbindungen gelöscht.',
      actionLabel: 'Rückgängig',
    });
  });

  it('reads "<n> connections restored." in green', () => {
    const state = after({ type: 'restored', deletionId: 'd-2' });
    expect(deletionToastOf(state, 'en')).toEqual({
      id: 3,
      kind: 'success',
      message: '3 connections restored.',
    });
    expect(deletionToastOf(state, 'de')?.message).toBe('3 Anbindungen wiederhergestellt.');
  });

  it('reads "The connections can no longer be restored." in ink, without "Undo"', () => {
    const state = after({ type: 'notRestorable', deletionId: 'd-2' });
    expect(deletionToastOf(state, 'en')).toEqual({
      id: 3,
      kind: 'neutral',
      message: 'The connections can no longer be restored.',
    });
    expect(deletionToastOf(state, 'de')?.message).toBe(
      'Die Anbindungen können nicht mehr wiederhergestellt werden.'
    );
  });

  it('reads "Couldn’t restore. Try again." with "Undo" again, as for one connection', () => {
    const state = after({ type: 'failed', deletionId: 'd-2', errorId: null });
    expect(deletionToastOf(state, 'en')).toEqual({
      id: 3,
      kind: 'neutral',
      message: 'Couldn’t restore. Try again.',
      actionLabel: 'Undo',
      errorId: null,
    });
  });
});

describe('bulkDeleteReducer (spec 010, FR-041 to FR-043)', () => {
  const rows = [summary({ id: 'a', name: 'A' }), summary({ id: 'b', name: 'B', state: 'draft' })];
  const opened = bulkDeleteReducer(INITIAL_BULK_DELETE_STATE, { type: 'open', rows });
  const deleting = bulkDeleteReducer(opened, { type: 'start' });
  const changed: BulkDeleteState = bulkDeleteReducer(deleting, {
    type: 'failed',
    failure: { error: { message: 'Server' }, changedName: 'B', stale: true },
  });

  it('opens with the rows in the given order and no failure', () => {
    expect(opened).toEqual({
      rows,
      open: true,
      deleting: false,
      error: null,
      changedName: null,
      stale: false,
    });
  });

  it('ignores a close while the deletion runs (FR-042)', () => {
    expect(bulkDeleteReducer(deleting, { type: 'close' })).toBe(deleting);
  });

  it('stays open after a failure, naming the changed connection (FR-043)', () => {
    expect(changed).toMatchObject({ open: true, deleting: false, changedName: 'B', stale: true });
    expect(changed.error).toEqual({ message: 'Server' });
  });

  it('takes the failure away when it tries again, so that a new one is announced', () => {
    expect(bulkDeleteReducer(changed, { type: 'start' })).toMatchObject({
      deleting: true,
      error: null,
      changedName: null,
      stale: false,
    });
  });

  it('closes, keeping the rows for the fade, after "Keep connections" or the deletion', () => {
    for (const state of [
      bulkDeleteReducer(changed, { type: 'close' }),
      bulkDeleteReducer(deleting, { type: 'done' }),
    ]) {
      expect(state).toEqual({
        rows,
        open: false,
        deleting: false,
        error: null,
        changedName: null,
        stale: false,
      });
    }
  });
});

describe('deletionItemsOf (management-api "Deleting")', () => {
  it("sends each row's id and the state the dialog showed, in order", () => {
    const rows = [
      summary({ id: 'a', state: 'scheduled' }),
      summary({ id: 'b', state: 'draft', status: 'draft' }),
      summary({ id: 'c', state: 'deactivated', is_active: false }),
      summary({ id: 'd', state: 'live' }),
    ];
    expect(deletionItemsOf(rows)).toEqual([
      { id: 'a', state: 'scheduled' },
      { id: 'b', state: 'draft' },
      { id: 'c', state: 'deactivated' },
      { id: 'd', state: 'live' },
    ]);
  });
});

describe('bulkWarningsOf (spec 010, FR-041; copy.md §4)', () => {
  const rows = [
    summary({ id: 'a', name: 'Fishing licence', state: 'live' }),
    summary({ id: 'b', name: 'Hunting licence', state: 'draft', status: 'draft' }),
    summary({ id: 'c', name: 'Taxi licence', state: 'scheduled', start_date: '2026-12-01' }),
    summary({ id: 'd', name: 'Parking permit', state: 'deactivated', is_active: false }),
    summary({ id: 'e', name: 'Dog tax', state: 'live' }),
  ];

  it('warns once per active and per scheduled connection, in the list order', () => {
    expect(bulkWarningsOf(rows, 'en')).toEqual([
      { id: 'a', text: 'Fishing licence is active. Citizens won’t be able to use it.' },
      { id: 'c', text: 'Taxi licence is scheduled for 01.12.2026. It won’t become active.' },
      { id: 'e', text: 'Dog tax is active. Citizens won’t be able to use it.' },
    ]);
  });

  it('words them in German', () => {
    expect(bulkWarningsOf(rows, 'de').map((warning) => warning.text)).toEqual([
      'Fishing licence ist aktiv. Bürgerinnen und Bürger können sie dann nicht mehr nutzen.',
      'Taxi licence ist für den 01.12.2026 geplant. Sie wird nicht aktiv.',
      'Dog tax ist aktiv. Bürgerinnen und Bürger können sie dann nicht mehr nutzen.',
    ]);
  });

  it('has no line for drafts and deactivated connections', () => {
    expect(bulkWarningsOf(rows.slice(1, 2).concat(rows.slice(3, 4)), 'en')).toEqual([]);
  });
});

describe('bulkDeleteNoticeOf (spec 010, FR-043; design-notes §4.2 T084 (3))', () => {
  const server = { message: 'Nothing was deleted: a connection was deleted or changed.' };

  it('shows no notice and offers no retry without a failure', () => {
    expect(bulkDeleteNoticeOf(INITIAL_BULK_DELETE_STATE, 'en')).toEqual({
      error: null,
      retry: false,
    });
  });

  it('names the changed connection without "Try again" after selection_changed', () => {
    const state = { error: server, changedName: 'Taxi licence', stale: true };
    expect(bulkDeleteNoticeOf(state, 'en')).toEqual({
      error: {
        message: 'Nothing was deleted: “Taxi licence” was deleted or changed in the meantime.',
      },
      retry: false,
    });
    expect(bulkDeleteNoticeOf(state, 'de').retry).toBe(false);
  });

  it("keeps the server's sentence, also without a retry, for a connection it doesn't hold", () => {
    expect(bulkDeleteNoticeOf({ error: server, changedName: null, stale: true }, 'en')).toEqual({
      error: server,
      retry: false,
    });
  });

  it('offers "Try again" after another failure, with its error ID (spec 008)', () => {
    const error = { message: 'Failed.', error_id: 'e-1' };
    expect(bulkDeleteNoticeOf({ error, changedName: null, stale: false }, 'en')).toEqual({
      error,
      retry: true,
    });
    const offline = { message: 'Nothing changed. Check your connection and try again.' };
    expect(
      bulkDeleteNoticeOf({ error: offline, changedName: null, stale: false }, 'en').retry
    ).toBe(true);
  });

  it('follows the reducer: stale after selection_changed, retrying after another failure', () => {
    const rows = [summary({ id: 'a' }), summary({ id: 'b' })];
    const deleting = bulkDeleteReducer(
      bulkDeleteReducer(INITIAL_BULK_DELETE_STATE, { type: 'open', rows }),
      { type: 'start' }
    );
    const changed = bulkDeleteReducer(deleting, {
      type: 'failed',
      failure: { error: server, changedName: 'B', stale: true },
    });
    const failed = bulkDeleteReducer(deleting, {
      type: 'failed',
      failure: { error: { message: 'Failed.', error_id: 'e-1' }, changedName: null, stale: false },
    });
    expect(bulkDeleteNoticeOf(changed, 'en').retry).toBe(false);
    expect(bulkDeleteNoticeOf(failed, 'en').retry).toBe(true);
  });
});

describe('bulkDeleteFailureOf (spec 010, FR-043; W8)', () => {
  const rows = [
    summary({ id: 'a', name: 'Fishing licence' }),
    summary({ id: 'b', name: 'Hunting licence' }),
    summary({ id: 'c', name: 'Taxi licence' }),
  ];
  const changed = (ids: string[]) => {
    const body: SelectionChanged = {
      error: 'selection_changed',
      message: 'Nothing was deleted: a connection was deleted or changed in the meantime.',
      changed_ids: ids,
    };
    return new ApiError(409, body);
  };

  it('names the first changed connection the dialog holds and marks the list stale', () => {
    expect(bulkDeleteFailureOf(changed(['gone', 'c', 'b']), rows, 'en')).toEqual({
      error: {
        message: 'Nothing was deleted: a connection was deleted or changed in the meantime.',
        error_id: undefined,
      },
      changedName: 'Taxi licence',
      stale: true,
    });
  });

  it("falls back to the server's sentence for an id it doesn't hold", () => {
    expect(bulkDeleteFailureOf(changed(['gone']), rows, 'en')).toMatchObject({
      changedName: null,
      stale: true,
    });
  });

  it("shows another failure with the server's message and error ID", () => {
    const error = new ApiError(500, { error: 'internal', message: 'Failed.', error_id: 'e-1' });
    expect(bulkDeleteFailureOf(error, rows, 'en')).toEqual({
      error: { message: 'Failed.', error_id: 'e-1' },
      changedName: null,
      stale: false,
    });
    const other = new ApiError(409, { error: 'conflict', message: 'Other.' });
    expect(bulkDeleteFailureOf(other, rows, 'en').stale).toBe(false);
  });

  it('says "Nothing changed. …" without an answer, in the language shown', () => {
    expect(bulkDeleteFailureOf(new TypeError('Failed to fetch'), rows, 'de')).toEqual({
      error: {
        message:
          'Es wurde nichts geändert. Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
      },
      changedName: null,
      stale: false,
    });
  });
});

describe('restoreFailureOf (spec 010, FR-036)', () => {
  it('reads 409 not_restorable as final, by its code', () => {
    const error = new ApiError(409, { error: 'not_restorable', message: 'Anything.' });
    expect(restoreFailureOf(error)).toEqual({ type: 'notRestorable' });
  });

  it('offers "Undo" again after a server failure, with its error ID', () => {
    const error = new ApiError(500, { error: 'internal', message: 'Failed.', error_id: 'e-9' });
    expect(restoreFailureOf(error)).toEqual({ type: 'failed', errorId: 'e-9' });
  });

  it('offers "Undo" again without an answer, or after another refusal', () => {
    expect(restoreFailureOf(new TypeError('Failed to fetch'))).toEqual({
      type: 'failed',
      errorId: null,
    });
    const other = new ApiError(409, { error: 'conflict', message: 'Other.' });
    expect(restoreFailureOf(other)).toEqual({ type: 'failed', errorId: null });
  });
});

describe('selectionReducer (spec 010, FR-038 to FR-040)', () => {
  const none: Selection = new Set();
  const listed = ['a', 'b', 'c'];

  it('selects a row with its checkbox, and deselects it with a second click', () => {
    const one = selectionReducer(none, { type: 'toggle', id: 'b' });
    expect([...one]).toEqual(['b']);
    const two = selectionReducer(one, { type: 'toggle', id: 'a' });
    expect(two).toEqual(new Set(['a', 'b']));
    expect(selectionReducer(two, { type: 'toggle', id: 'b' })).toEqual(new Set(['a']));
  });

  it('never changes the state it was given', () => {
    const state: Selection = new Set(['a']);
    selectionReducer(state, { type: 'toggle', id: 'b' });
    selectionReducer(state, { type: 'toggle', id: 'a' });
    selectionReducer(state, { type: 'toggleAll', listedIds: listed });
    selectionReducer(state, { type: 'clear' });
    selectionReducer(state, { type: 'prune', listedIds: [] });
    expect([...state]).toEqual(['a']);
  });

  it('selects every listed row with the select-all, from none or from some', () => {
    expect(selectionReducer(none, { type: 'toggleAll', listedIds: listed })).toEqual(
      new Set(listed)
    );
    expect(selectionReducer(new Set(['b']), { type: 'toggleAll', listedIds: listed })).toEqual(
      new Set(listed)
    );
  });

  it('clears the selection with the select-all when every listed row is selected', () => {
    expect(selectionReducer(new Set(listed), { type: 'toggleAll', listedIds: listed }).size).toBe(
      0
    );
  });

  it('selects only the rows a search lists (EC-11)', () => {
    // The search shows "b" and "c" of the list's "a", "b", "c" and "d"
    const searched = ['b', 'c'];
    const all = selectionReducer(none, { type: 'toggleAll', listedIds: searched });
    expect(all).toEqual(new Set(searched));
    expect(all.has('a')).toBe(false);
    expect(all.has('d')).toBe(false);
    expect(selectAllStateOf(all, searched)).toBe('all');
    expect(selectAllStateOf(all, ['a', 'b', 'c', 'd'])).toBe('some');
    expect(selectionReducer(all, { type: 'toggleAll', listedIds: searched }).size).toBe(0);
  });

  it('does nothing with the select-all while nothing is listed', () => {
    expect(selectionReducer(none, { type: 'toggleAll', listedIds: [] }).size).toBe(0);
  });

  it('clears the selection ("Cancel", after a deletion)', () => {
    expect(selectionReducer(new Set(['a', 'c']), { type: 'clear' }).size).toBe(0);
    expect(selectionReducer(none, { type: 'clear' })).toBe(none);
  });

  it('takes a row that left the list out of the selection after a refresh (EC-12)', () => {
    const state: Selection = new Set(['a', 'b', 'c']);
    const pruned = selectionReducer(state, { type: 'prune', listedIds: ['a', 'c', 'd'] });
    expect(pruned).toEqual(new Set(['a', 'c']));
    expect(selectionReducer(pruned, { type: 'prune', listedIds: [] }).size).toBe(0);
  });

  it('keeps the same state when a refresh removed no selected row', () => {
    const state: Selection = new Set(['a', 'c']);
    expect(selectionReducer(state, { type: 'prune', listedIds: ['c', 'b', 'a'] })).toBe(state);
    expect(selectionReducer(none, { type: 'prune', listedIds: listed })).toBe(none);
  });
});

describe('selectAllStateOf (spec 010, FR-040)', () => {
  const listed = ['a', 'b', 'c'];

  it('reads none, some (mixed) or all for the listed rows', () => {
    expect(selectAllStateOf(new Set(), listed)).toBe('none');
    expect(selectAllStateOf(new Set(['a', 'b']), listed)).toBe('some');
    expect(selectAllStateOf(new Set(listed), listed)).toBe('all');
  });

  it('counts only the listed rows', () => {
    expect(selectAllStateOf(new Set(['x']), listed)).toBe('none');
    expect(selectAllStateOf(new Set(['x', ...listed]), listed)).toBe('all');
  });

  it('reads none while nothing is listed', () => {
    expect(selectAllStateOf(new Set(['a']), [])).toBe('none');
  });
});

// Spec 010, S3 (FR-053 to FR-055; F24): the welcome page's example dialog
describe('exampleDialogReducer (FR-054, FR-055)', () => {
  const open = exampleDialogReducer(INITIAL_EXAMPLE_DIALOG_STATE, { type: 'open' });
  const notice = { message: 'Something went wrong.', error_id: 'e-1' };

  it('starts closed and opens without a failure', () => {
    expect(INITIAL_EXAMPLE_DIALOG_STATE).toEqual({ open: false, creating: false, error: null });
    expect(open).toEqual({ open: true, creating: false, error: null });
  });

  it('closes without creating anything ("Go back", ×, Escape, the scrim)', () => {
    expect(exampleDialogReducer(open, { type: 'close' })).toEqual(INITIAL_EXAMPLE_DIALOG_STATE);
  });

  it('is busy while the example is created, and nothing closes it then', () => {
    const creating = exampleDialogReducer(open, { type: 'start' });
    expect(creating).toEqual({ open: true, creating: true, error: null });
    expect(exampleDialogReducer(creating, { type: 'close' })).toBe(creating);
    expect(exampleDialogReducer(creating, { type: 'start' })).toBe(creating);
    expect(exampleDialogReducer(creating, { type: 'open' })).toBe(creating);
  });

  it('keeps a failure open, takes it away on a retry and when it closes', () => {
    const failed = exampleDialogReducer(exampleDialogReducer(open, { type: 'start' }), {
      type: 'failed',
      error: notice,
    });
    expect(failed).toEqual({ open: true, creating: false, error: notice });
    expect(exampleDialogReducer(failed, { type: 'start' })).toEqual({
      open: true,
      creating: true,
      error: null,
    });
    expect(exampleDialogReducer(failed, { type: 'close' })).toEqual(INITIAL_EXAMPLE_DIALOG_STATE);
    // Opened again, it shows no old failure
    const closed = exampleDialogReducer(failed, { type: 'close' });
    expect(exampleDialogReducer(closed, { type: 'open' }).error).toBeNull();
  });

  it('closes once the example is created', () => {
    const creating = exampleDialogReducer(open, { type: 'start' });
    expect(exampleDialogReducer(creating, { type: 'done' })).toEqual(INITIAL_EXAMPLE_DIALOG_STATE);
  });
});

describe('exampleFailureOf (S3)', () => {
  it("keeps the message and a 5xx answer's error ID", () => {
    const error = new ApiError(500, { error: 'internal', message: 'Failed.', error_id: 'e-9' });
    expect(exampleFailureOf(error, 'en')).toEqual({ message: 'Failed.', error_id: 'e-9' });
  });

  it('falls back to the sentence in the given language without an answer', () => {
    const offline = new TypeError('Failed to fetch');
    expect(exampleFailureOf(offline, 'en').message).toBe('Check your connection and try again.');
    expect(exampleFailureOf(offline, 'de').message).toBe(
      'Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.'
    );
  });
});

describe('the example copy (FR-053, FR-054; F24; copy.md §6; glossary)', () => {
  it('says "Start from an example", never 1b\'s "Start with an example"', () => {
    expect(WELCOME_COPY.en.startFromExample).toBe('Start from an example');
    expect(WELCOME_COPY.de.startFromExample).toBe('Mit einem Beispiel beginnen');
  });

  it("holds the design's dialog and copy.md §6's busy label and failure title", () => {
    expect(EXAMPLE_DIALOG_COPY.en).toMatchObject({
      title: 'Start from an example?',
      text: 'This creates a draft called “Passenger transport licence (example)” with 2 documents and 2 rules. It only becomes active when you publish.',
      cancel: 'Go back',
      confirm: 'Create the example',
      busy: 'Creating…',
      errorTitle: 'Couldn’t create the example',
    });
    expect(EXAMPLE_DIALOG_COPY.de).toMatchObject({
      confirm: 'Beispiel erstellen',
      busy: 'Wird erstellt …',
      errorTitle: 'Das Beispiel konnte nicht erstellt werden',
    });
    // The German text names the example as it is created in German (data-model §5)
    expect(EXAMPLE_DIALOG_COPY.de.text).toContain('„Personenbeförderungsschein (Beispiel)“');
  });
});
