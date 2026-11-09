import { describe, expect, it } from 'vitest';

import type { RemovedDataRule } from '../types';
import { INITIAL_DOCUMENTS_VIEW_STATE } from './constants';
import { documentsViewReducer } from './reducer';
import type { DocumentsViewAction, DocumentsViewState } from './types';

const CATALOG_ORDER = ['pid', 'mdl', 'ehic'];
const RULES: RemovedDataRule[] = [
  { key: 'main-rule-2', ruleName: 'Rule 02', branchName: 'Standard' },
  { key: 'main-rule-3', ruleName: 'Rule 03', branchName: 'Standard' },
];

function run(actions: DocumentsViewAction[], from = INITIAL_DOCUMENTS_VIEW_STATE) {
  return actions.reduce(documentsViewReducer, from);
}

function state(changes: Partial<DocumentsViewState>): DocumentsViewState {
  return { ...INITIAL_DOCUMENTS_VIEW_STATE, ...changes };
}

describe('the view’s first state', () => {
  it('shows the first document, with no search and nothing pending, asked or flagged', () => {
    expect(INITIAL_DOCUMENTS_VIEW_STATE).toEqual({
      selectedIndex: 0,
      query: '',
      pendingRemoval: null,
      needsData: { documentIds: [], asking: false },
      confirmRemoval: null,
    });
  });
});

describe('select (the list and the pager)', () => {
  it('shows the document at the index', () => {
    expect(run([{ type: 'select', index: 2 }]).selectedIndex).toBe(2);
  });

  it('never goes before the first document', () => {
    expect(run([{ type: 'select', index: -1 }]).selectedIndex).toBe(0);
  });

  it('keeps the state when the document already shows', () => {
    const shown = state({ selectedIndex: 1 });
    expect(documentsViewReducer(shown, { type: 'select', index: 1 })).toBe(shown);
  });

  it('changes nothing but the selection', () => {
    const busy = state({ query: 'ce', pendingRemoval: { documentId: 'mdl' } });
    expect(documentsViewReducer(busy, { type: 'select', index: 1 })).toEqual({
      ...busy,
      selectedIndex: 1,
    });
  });
});

describe('search and clearSearch (the search card)', () => {
  it('keeps the query as typed', () => {
    expect(run([{ type: 'search', query: ' Ce' }]).query).toBe(' Ce');
  });

  it('empties the query', () => {
    expect(run([{ type: 'search', query: 'taxi' }, { type: 'clearSearch' }]).query).toBe('');
  });

  it('keeps the state when nothing changes', () => {
    const typed = state({ query: 'ce' });
    expect(documentsViewReducer(typed, { type: 'search', query: 'ce' })).toBe(typed);
    expect(documentsViewReducer(INITIAL_DOCUMENTS_VIEW_STATE, { type: 'clearSearch' })).toBe(
      INITIAL_DOCUMENTS_VIEW_STATE
    );
  });
});

describe('the removal question (F72)', () => {
  it('asks about the document with the rules that check it', () => {
    const asked = run([{ type: 'askRemoval', documentId: 'mdl', rules: RULES }]);
    expect(asked.confirmRemoval).toEqual({ documentId: 'mdl', rules: RULES });
  });

  it('asks without rules when none checks the document', () => {
    const asked = run([{ type: 'askRemoval', documentId: 'mdl', rules: [] }]);
    expect(asked.confirmRemoval).toEqual({ documentId: 'mdl', rules: [] });
  });

  it('"Keep document" closes the question and removes nothing', () => {
    const before = state({ selectedIndex: 1 });
    const kept = run(
      [{ type: 'askRemoval', documentId: 'mdl', rules: RULES }, { type: 'keepDocument' }],
      before
    );
    expect(kept).toEqual(before);
  });

  it('"Keep document" leaves an earlier removal’s Undo in place', () => {
    const earlier = state({ pendingRemoval: { documentId: 'ehic' } });
    const kept = run(
      [{ type: 'askRemoval', documentId: 'mdl', rules: [] }, { type: 'keepDocument' }],
      earlier
    );
    expect(kept.pendingRemoval).toEqual({ documentId: 'ehic' });
  });

  it('"Keep document" without a question keeps the state', () => {
    expect(documentsViewReducer(INITIAL_DOCUMENTS_VIEW_STATE, { type: 'keepDocument' })).toBe(
      INITIAL_DOCUMENTS_VIEW_STATE
    );
  });

  it('"Remove document" closes the question and waits for Undo', () => {
    const removed = run(
      [
        { type: 'select', index: 1 },
        { type: 'askRemoval', documentId: 'mdl', rules: RULES },
        { type: 'confirmRemovalDone', listIds: ['pid', 'mdl'] },
      ],
      INITIAL_DOCUMENTS_VIEW_STATE
    );
    expect(removed.confirmRemoval).toBeNull();
    expect(removed.pendingRemoval).toEqual({ documentId: 'mdl' });
  });

  it('"Remove document" without a question keeps the state', () => {
    const shown = state({ selectedIndex: 1 });
    expect(
      documentsViewReducer(shown, { type: 'confirmRemovalDone', listIds: ['pid', 'mdl'] })
    ).toBe(shown);
  });
});

describe('the selection after a removal (U24 A11 → A12)', () => {
  function removing(documentId: string, selectedIndex: number, listIds: string[]) {
    return run(
      [
        { type: 'askRemoval', documentId, rules: [] },
        { type: 'confirmRemovalDone', listIds },
      ],
      state({ selectedIndex })
    ).selectedIndex;
  }

  it('shows the previous document when the last, shown one goes ("Document 2 of 2" → 1 of 1)', () => {
    expect(removing('mdl', 1, ['pid', 'mdl'])).toBe(0);
  });

  it('lets the next document take the place of a shown one that goes', () => {
    expect(removing('pid', 0, ['pid', 'mdl', 'ehic'])).toBe(0);
    expect(removing('mdl', 1, ['pid', 'mdl', 'ehic'])).toBe(1);
  });

  it('keeps showing the same document when another one goes', () => {
    // Driving licence shows; Personal ID, before it, goes: Driving licence is now 1 of 1
    expect(removing('pid', 1, ['pid', 'mdl'])).toBe(0);
    // Personal ID shows; Driving licence, after it, goes
    expect(removing('mdl', 0, ['pid', 'mdl'])).toBe(0);
    expect(removing('ehic', 1, ['pid', 'mdl', 'ehic'])).toBe(1);
  });

  it('goes back to the start once the list is empty', () => {
    expect(removing('pid', 0, ['pid'])).toBe(0);
  });

  it('reads a selection past the end as the last document', () => {
    expect(removing('pid', 5, ['pid', 'mdl'])).toBe(0);
  });
});

describe('a confirmed removal (the shared bookkeeping)', () => {
  it('replaces an older removal: only the newest toast offers Undo', () => {
    const twice = run([
      { type: 'askRemoval', documentId: 'pid', rules: [] },
      { type: 'confirmRemovalDone', listIds: ['pid', 'mdl', 'ehic'] },
      { type: 'askRemoval', documentId: 'ehic', rules: [] },
      { type: 'confirmRemovalDone', listIds: ['mdl', 'ehic'] },
    ]);
    expect(twice.pendingRemoval).toEqual({ documentId: 'ehic' });
  });

  it('takes the document’s needs-data flag away, and keeps the others', () => {
    const flagged = state({ needsData: { documentIds: ['pid', 'mdl'], asking: false } });
    const removed = run(
      [
        { type: 'askRemoval', documentId: 'mdl', rules: [] },
        { type: 'confirmRemovalDone', listIds: ['pid', 'mdl'] },
      ],
      flagged
    );
    expect(removed.needsData).toEqual({ documentIds: ['pid'], asking: false });
  });
});

describe('undoRemoval (the toast’s Undo)', () => {
  it('shows the document again where the catalog puts it, and ends the removal', () => {
    // Driving licence removed from Personal ID, Driving licence, EHIC; Undo puts it back second
    const undone = run([
      { type: 'select', index: 1 },
      { type: 'askRemoval', documentId: 'mdl', rules: [] },
      { type: 'confirmRemovalDone', listIds: ['pid', 'mdl', 'ehic'] },
      { type: 'undoRemoval', listIds: ['pid', 'ehic'], catalogOrder: CATALOG_ORDER },
    ]);
    expect(undone.selectedIndex).toBe(1);
    expect(undone.pendingRemoval).toBeNull();
  });

  it('shows a document that went while another one showed', () => {
    const undone = run([
      { type: 'select', index: 1 },
      { type: 'askRemoval', documentId: 'pid', rules: [] },
      { type: 'confirmRemovalDone', listIds: ['pid', 'mdl'] },
      { type: 'undoRemoval', listIds: ['mdl'], catalogOrder: CATALOG_ORDER },
    ]);
    expect(undone.selectedIndex).toBe(0);
  });

  it('shows the document where it is when it was added again meanwhile', () => {
    const undone = documentsViewReducer(state({ pendingRemoval: { documentId: 'ehic' } }), {
      type: 'undoRemoval',
      listIds: ['pid', 'mdl', 'ehic'],
      catalogOrder: CATALOG_ORDER,
    });
    expect(undone).toEqual(state({ selectedIndex: 2 }));
  });

  it('keeps the state without a removal to undo', () => {
    const shown = state({ selectedIndex: 1 });
    expect(
      documentsViewReducer(shown, {
        type: 'undoRemoval',
        listIds: ['pid', 'mdl'],
        catalogOrder: CATALOG_ORDER,
      })
    ).toBe(shown);
  });
});

describe('expireRemoval (the toast gone without Undo)', () => {
  const pending = state({ selectedIndex: 1, pendingRemoval: { documentId: 'mdl' } });

  it('ends the removal and keeps the selection', () => {
    expect(documentsViewReducer(pending, { type: 'expireRemoval' })).toEqual(
      state({ selectedIndex: 1 })
    );
  });

  it('ends only the named document’s removal', () => {
    expect(documentsViewReducer(pending, { type: 'expireRemoval', documentId: 'mdl' })).toEqual(
      state({ selectedIndex: 1 })
    );
    expect(documentsViewReducer(pending, { type: 'expireRemoval', documentId: 'pid' })).toBe(
      pending
    );
  });

  it('keeps the state without a removal', () => {
    expect(documentsViewReducer(INITIAL_DOCUMENTS_VIEW_STATE, { type: 'expireRemoval' })).toBe(
      INITIAL_DOCUMENTS_VIEW_STATE
    );
  });

  it('leaves nothing for a later Undo', () => {
    const expired = run(
      [
        { type: 'expireRemoval' },
        { type: 'undoRemoval', listIds: ['pid'], catalogOrder: CATALOG_ORDER },
      ],
      pending
    );
    expect(expired).toEqual(state({ selectedIndex: 1 }));
  });
});

describe('flagNeedsData ("Set rules →" with documents without data; F67)', () => {
  it('flags the documents and opens the dialog', () => {
    expect(run([{ type: 'flagNeedsData', documentIds: ['mdl'] }]).needsData).toEqual({
      documentIds: ['mdl'],
      asking: true,
    });
  });

  it('flags each document once', () => {
    expect(
      run([{ type: 'flagNeedsData', documentIds: ['pid', 'mdl', 'pid'] }]).needsData.documentIds
    ).toEqual(['pid', 'mdl']);
  });

  it('flags anew on every attempt, and takes the flags away when every document has data', () => {
    const again = run([
      { type: 'flagNeedsData', documentIds: ['pid', 'mdl'] },
      { type: 'chooseData', listIds: ['pid', 'mdl'] },
      { type: 'flagNeedsData', documentIds: ['mdl'] },
    ]);
    expect(again.needsData).toEqual({ documentIds: ['mdl'], asking: true });
    expect(
      documentsViewReducer(again, { type: 'flagNeedsData', documentIds: [] }).needsData
    ).toEqual({ documentIds: [], asking: false });
  });

  it('changes neither the selection nor a pending removal', () => {
    const before = state({ selectedIndex: 1, pendingRemoval: { documentId: 'ehic' } });
    const flagged = documentsViewReducer(before, { type: 'flagNeedsData', documentIds: ['pid'] });
    expect(flagged.selectedIndex).toBe(1);
    expect(flagged.pendingRemoval).toEqual({ documentId: 'ehic' });
  });
});

describe('chooseData (the dialog’s "Choose data"; U25 A13 → A14)', () => {
  it('closes the dialog, keeps the flags and the flagged document that shows', () => {
    // Driving licence, "Document 2 of 2", has no data: it stays shown and marked
    const chosen = run([
      { type: 'select', index: 1 },
      { type: 'flagNeedsData', documentIds: ['mdl'] },
      { type: 'chooseData', listIds: ['pid', 'mdl'] },
    ]);
    expect(chosen).toEqual(
      state({ selectedIndex: 1, needsData: { documentIds: ['mdl'], asking: false } })
    );
  });

  it('shows the first flagged document when the shown one has data', () => {
    const chosen = run([
      { type: 'select', index: 0 },
      { type: 'flagNeedsData', documentIds: ['mdl', 'ehic'] },
      { type: 'chooseData', listIds: ['pid', 'mdl', 'ehic'] },
    ]);
    expect(chosen.selectedIndex).toBe(1);
  });

  it('keeps the selection when no flagged document is listed', () => {
    const chosen = run(
      [{ type: 'chooseData', listIds: ['pid', 'mdl'] }],
      state({ selectedIndex: 1, needsData: { documentIds: ['ehic'], asking: true } })
    );
    expect(chosen.selectedIndex).toBe(1);
    expect(chosen.needsData).toEqual({ documentIds: ['ehic'], asking: false });
  });
});

describe('removeNeedsDataDone (the dialog’s "Remove 1 document")', () => {
  it('takes the flags away, closes the dialog and shows a document that stays', () => {
    const removed = run([
      { type: 'select', index: 1 },
      { type: 'flagNeedsData', documentIds: ['mdl'] },
      { type: 'removeNeedsDataDone', listIds: ['pid', 'mdl'] },
    ]);
    expect(removed).toEqual(state({ selectedIndex: 0 }));
  });

  it('keeps the shown document when it stays', () => {
    const removed = run([
      { type: 'select', index: 2 },
      { type: 'flagNeedsData', documentIds: ['pid', 'mdl'] },
      { type: 'removeNeedsDataDone', listIds: ['pid', 'mdl', 'ehic'] },
    ]);
    expect(removed.selectedIndex).toBe(0);
  });

  it('goes back to the start when every document went', () => {
    const removed = run([
      { type: 'select', index: 1 },
      { type: 'flagNeedsData', documentIds: ['pid', 'mdl'] },
      { type: 'removeNeedsDataDone', listIds: ['pid', 'mdl'] },
    ]);
    expect(removed.selectedIndex).toBe(0);
  });

  it('leaves an earlier removal’s Undo in place', () => {
    const removed = run(
      [
        { type: 'flagNeedsData', documentIds: ['mdl'] },
        { type: 'removeNeedsDataDone', listIds: ['pid', 'mdl'] },
      ],
      state({ pendingRemoval: { documentId: 'ehic' } })
    );
    expect(removed.pendingRemoval).toEqual({ documentId: 'ehic' });
  });
});

describe('a whole pass through the step (quickstart V4.2–V4.4)', () => {
  it('adds, removes with Undo, removes for good, and fixes a document without data', () => {
    const steps: [DocumentsViewAction, Partial<DocumentsViewState>][] = [
      // Personal ID added from the search card ("Document 1 of 1"), then Driving licence
      [{ type: 'search', query: 'per' }, { query: 'per' }],
      [{ type: 'clearSearch' }, { query: '' }],
      [{ type: 'select', index: 1 }, { selectedIndex: 1 }],
      // The trash on Driving licence: the question, then Undo
      [
        { type: 'askRemoval', documentId: 'mdl', rules: [] },
        { confirmRemoval: { documentId: 'mdl', rules: [] } },
      ],
      [
        { type: 'confirmRemovalDone', listIds: ['pid', 'mdl'] },
        { selectedIndex: 0, confirmRemoval: null, pendingRemoval: { documentId: 'mdl' } },
      ],
      [
        { type: 'undoRemoval', listIds: ['pid'], catalogOrder: CATALOG_ORDER },
        { selectedIndex: 1, pendingRemoval: null },
      ],
      // Removed again; the toast goes with Escape
      [
        { type: 'askRemoval', documentId: 'mdl', rules: RULES },
        { confirmRemoval: { documentId: 'mdl', rules: RULES } },
      ],
      [
        { type: 'confirmRemovalDone', listIds: ['pid', 'mdl'] },
        { selectedIndex: 0, confirmRemoval: null, pendingRemoval: { documentId: 'mdl' } },
      ],
      [{ type: 'expireRemoval' }, { pendingRemoval: null }],
      // "Set rules →" with Personal ID still without data
      [
        { type: 'flagNeedsData', documentIds: ['pid'] },
        { needsData: { documentIds: ['pid'], asking: true } },
      ],
      [
        { type: 'chooseData', listIds: ['pid'] },
        { needsData: { documentIds: ['pid'], asking: false } },
      ],
      // Data chosen; "Set rules →" again flags nothing
      [
        { type: 'flagNeedsData', documentIds: [] },
        { needsData: { documentIds: [], asking: false } },
      ],
    ];
    let current = INITIAL_DOCUMENTS_VIEW_STATE;
    for (const [action, expected] of steps) {
      current = documentsViewReducer(current, action);
      expect(current).toMatchObject(expected);
    }
    expect(current).toEqual(INITIAL_DOCUMENTS_VIEW_STATE);
  });
});
