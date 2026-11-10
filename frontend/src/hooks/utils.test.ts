import type {
  FormConnectionOrDraft,
  RuleTreeItem,
} from '@connection-portal/api-types/form-connections';
import { buildCheckedBranch } from '@connection-portal/rules/checks/checkedTree';
import type { BranchCheck } from '@connection-portal/rules/checks/types';
import { CONTEXT, mainBranch, US1_RULES } from '@connection-portal/rules/testData';
import { renameItem } from '@connection-portal/rules/tree';
import { describe, expect, it } from 'vitest';

import { emptyContent } from '../utils/localDrafts/content';
import type { CatalogCacheAction, CatalogCacheState, CheckableBranch } from './types';
import {
  actionOf,
  byBranchFor,
  catalogCacheReducer,
  catalogListOf,
  catalogViewOf,
  causeOf,
  fetchLanguageOf,
  formConnectionReducer,
  INITIAL_FORM_CONNECTION_STATE,
  initialCatalogCacheState,
  isLocalDraftChange,
  localDraftActionOf,
  prefetchLanguageOf,
  runBranchesOf,
  sameChange,
  sameRunBranches,
  writeDelayOf,
} from './utils';

const TODAY = '2026-10-29';
const CHECKED_TREE = { buildCheckedBranch };

function branch(key: string, name: string, items: RuleTreeItem[] = US1_RULES): CheckableBranch {
  return { ...mainBranch(items), key, name };
}

function renamed(items: RuleTreeItem[], id: string, name: string): RuleTreeItem[] {
  const result = renameItem(items, id, name);
  if (!result) {
    throw new Error(`no item ${id}`);
  }
  return result.items;
}

function check(branchKey: string): BranchCheck {
  return {
    branchKey,
    fingerprint: 'f',
    complete: true,
    notice: null,
    findings: [],
    checkedRules: 1,
  };
}

describe('runBranchesOf', () => {
  it('builds every branch’s key, name, item names and checked tree, in tab order', () => {
    const runBranches = runBranchesOf(
      [branch('b-main', 'Standard'), branch('b-2', 'Ambulance', US1_RULES.slice(0, 1))],
      CONTEXT,
      TODAY,
      CHECKED_TREE
    );
    expect(runBranches.map(({ branch: named }) => named)).toEqual([
      { key: 'b-main', name: 'Standard' },
      { key: 'b-2', name: 'Ambulance' },
    ]);
    expect([...runBranches[0].names]).toEqual([
      ['rule-1', 'Rule 01'],
      ['rule-2', 'Rule 02'],
      ['rule-3', 'Rule 03'],
    ]);
    expect(runBranches[0].checked.branchKey).toBe('b-main');
    expect(runBranches[0].checked.today).toBe(TODAY);
    expect(runBranches[1].checked.items).toHaveLength(1);
  });
});

describe('sameRunBranches', () => {
  const build = (branches: CheckableBranch[], today = TODAY) =>
    runBranchesOf(branches, CONTEXT, today, CHECKED_TREE);
  const before = build([branch('b-main', 'Standard'), branch('b-2', 'Ambulance')]);

  it('is true for the same branches built again', () => {
    expect(
      sameRunBranches(before, build([branch('b-main', 'Standard'), branch('b-2', 'Ambulance')]))
    ).toBe(true);
  });

  it('is false for a changed rule, another day, another order or another branch', () => {
    expect(
      sameRunBranches(
        before,
        build([branch('b-main', 'Standard'), branch('b-2', 'Ambulance', US1_RULES.slice(1))])
      )
    ).toBe(false);
    expect(
      sameRunBranches(
        before,
        build([branch('b-main', 'Standard'), branch('b-2', 'Ambulance')], '2026-10-30')
      )
    ).toBe(false);
    expect(
      sameRunBranches(before, build([branch('b-2', 'Ambulance'), branch('b-main', 'Standard')]))
    ).toBe(false);
    expect(sameRunBranches(before, build([branch('b-main', 'Standard')]))).toBe(false);
  });

  it('is false for a renamed rule or branch, whose fingerprint is the same', () => {
    const renamedRule = build([
      branch('b-main', 'Standard'),
      branch('b-2', 'Ambulance', renamed(US1_RULES, 'rule-2', 'Licence')),
    ]);
    expect(renamedRule[1].checked.fingerprint).toBe(before[1].checked.fingerprint);
    expect(sameRunBranches(before, renamedRule)).toBe(false);
    expect(
      sameRunBranches(before, build([branch('b-main', 'Standard'), branch('b-2', 'Fire')]))
    ).toBe(false);
  });
});

describe('sameChange', () => {
  const branches = runBranchesOf([branch('b-main', 'Standard')], CONTEXT, TODAY, CHECKED_TREE);
  const again = runBranchesOf([branch('b-main', 'Standard')], CONTEXT, TODAY, CHECKED_TREE);

  it('is true for the same branches in the same language', () => {
    expect(
      sameChange(
        { branches, today: TODAY, language: 'en' },
        { branches: again, today: TODAY, language: 'en' }
      )
    ).toBe(true);
  });

  it('is false for a switch of the language alone, which the run state is told of', () => {
    expect(
      sameChange(
        { branches, today: TODAY, language: 'en' },
        { branches: again, today: TODAY, language: 'de' }
      )
    ).toBe(false);
  });

  it('is false for other branches in the same language', () => {
    const other = runBranchesOf([branch('b-main', 'Fire')], CONTEXT, TODAY, CHECKED_TREE);
    expect(
      sameChange(
        { branches, today: TODAY, language: 'de' },
        { branches: other, today: TODAY, language: 'de' }
      )
    ).toBe(false);
  });
});

describe('catalogCacheReducer', () => {
  type Item = { label: string };
  const EN: Item[] = [{ label: 'Identity card' }];
  const DE: Item[] = [{ label: 'Personalausweis' }];
  const run = (state: CatalogCacheState<Item>, ...actions: CatalogCacheAction<Item>[]) =>
    actions.reduce(catalogCacheReducer<Item>, state);
  const initial = initialCatalogCacheState<Item>('en');

  it('loads the current language first, with nothing to show yet', () => {
    expect(initial.status).toBe('loading');
    expect(fetchLanguageOf(initial)).toBe('en');
    expect(prefetchLanguageOf(initial)).toBeNull();
    expect(catalogListOf(initial)).toEqual([]);
  });

  it('shows the loaded language and then fetches the other in the background', () => {
    const state = run(initial, { type: 'loaded', language: 'en', items: EN });
    expect(state.status).toBe('loaded');
    expect(catalogListOf(state)).toBe(EN);
    expect(fetchLanguageOf(state)).toBeNull();
    expect(prefetchLanguageOf(state)).toBe('de');
  });

  it('switches at once once both are loaded, and fetches nothing more', () => {
    const both = run(
      initial,
      { type: 'loaded', language: 'en', items: EN },
      { type: 'loaded', language: 'de', items: DE }
    );
    expect(catalogListOf(both)).toBe(EN);
    expect(prefetchLanguageOf(both)).toBeNull();
    const switched = run(both, { type: 'language', language: 'de' });
    expect(switched.status).toBe('loaded');
    expect(catalogListOf(switched)).toBe(DE);
    expect(fetchLanguageOf(switched)).toBeNull();
    expect(prefetchLanguageOf(switched)).toBeNull();
    expect(run(switched, { type: 'language', language: 'de' })).toBe(switched);
  });

  it('keeps the other language on screen after a switch before the prefetch arrived', () => {
    const switched = run(
      initial,
      { type: 'loaded', language: 'en', items: EN },
      { type: 'language', language: 'de' }
    );
    expect(switched.status).toBe('loading');
    expect(catalogListOf(switched)).toBe(EN);
    expect(fetchLanguageOf(switched)).toBe('de');
    expect(prefetchLanguageOf(switched)).toBeNull();
    const loaded = run(switched, { type: 'loaded', language: 'de', items: DE });
    expect(loaded.status).toBe('loaded');
    expect(catalogListOf(loaded)).toBe(DE);
    expect(prefetchLanguageOf(loaded)).toBeNull();
  });

  it('keeps a failed prefetch silent until the next switch, which fetches it again', () => {
    const failed = run(
      initial,
      { type: 'loaded', language: 'en', items: EN },
      { type: 'failed', language: 'de' }
    );
    expect(failed.status).toBe('loaded');
    expect(catalogListOf(failed)).toBe(EN);
    expect(prefetchLanguageOf(failed)).toBeNull();
    const switched = run(failed, { type: 'language', language: 'de' });
    expect(switched.prefetchFailed).toBe(false);
    expect(fetchLanguageOf(switched)).toBe('de');
    expect(catalogListOf(switched)).toBe(EN);
  });

  it('fails the list when the current language fails, and a retry loads it again', () => {
    const failed = run(initial, { type: 'failed', language: 'en' });
    expect(failed.status).toBe('failed');
    expect(catalogListOf(failed)).toEqual([]);
    expect(fetchLanguageOf(failed)).toBeNull();
    const retried = run(failed, { type: 'retry' });
    expect(retried.status).toBe('loading');
    expect(retried.attempt).toBe(1);
    expect(fetchLanguageOf(retried)).toBe('en');
    expect(catalogListOf(run(retried, { type: 'loaded', language: 'en', items: EN }))).toBe(EN);
  });

  it('keeps a loaded language through a retry of the other', () => {
    const failed = run(
      initial,
      { type: 'loaded', language: 'en', items: EN },
      { type: 'failed', language: 'de' },
      { type: 'language', language: 'de' },
      { type: 'failed', language: 'de' }
    );
    expect(failed.status).toBe('failed');
    expect(catalogListOf(failed)).toEqual([]);
    const retried = run(failed, { type: 'retry' });
    expect(retried.loaded.en).toBe(EN);
    expect(catalogListOf(retried)).toBe(EN);
    expect(catalogListOf(run(retried, { type: 'language', language: 'en' }))).toBe(EN);
  });
});

// What the hooks report on a switch (spec 009, FR-003): never a loader or a failed state once a
// list has been on screen, so that the steps keep an open editor, a typed search or the personas
describe('catalogViewOf', () => {
  type Item = { label: string };
  const EN: Item[] = [{ label: 'Identity card' }];
  const DE: Item[] = [{ label: 'Personalausweis' }];
  const run = (state: CatalogCacheState<Item>, ...actions: CatalogCacheAction<Item>[]) =>
    actions.reduce(catalogCacheReducer<Item>, state);
  const initial = initialCatalogCacheState<Item>('en');
  const english = run(initial, { type: 'loaded', language: 'en', items: EN });

  it('loads, then shows the list or fails with a retry, before any list was on screen', () => {
    expect(catalogViewOf(initial)).toEqual({ status: 'loading', items: [] });
    const failed = run(initial, { type: 'failed', language: 'en' });
    expect(catalogViewOf(failed)).toEqual({ status: 'failed', items: [] });
    const retried = run(failed, { type: 'retry' });
    expect(catalogViewOf(retried)).toEqual({ status: 'loading', items: [] });
    expect(catalogViewOf(run(retried, { type: 'loaded', language: 'en', items: EN }))).toEqual({
      status: 'loaded',
      items: EN,
    });
  });

  it('keeps the other language’s list loaded after a switch before the prefetch landed', () => {
    const switched = run(english, { type: 'language', language: 'de' });
    expect(fetchLanguageOf(switched)).toBe('de');
    expect(catalogViewOf(switched)).toEqual({ status: 'loaded', items: EN });
    expect(catalogViewOf(run(switched, { type: 'loaded', language: 'de', items: DE }))).toEqual({
      status: 'loaded',
      items: DE,
    });
  });

  it('keeps the list loaded after a switch that follows a failed prefetch', () => {
    const switched = run(
      english,
      { type: 'failed', language: 'de' },
      { type: 'language', language: 'de' }
    );
    expect(fetchLanguageOf(switched)).toBe('de');
    expect(catalogViewOf(switched)).toEqual({ status: 'loaded', items: EN });
    expect(catalogViewOf(run(switched, { type: 'loaded', language: 'de', items: DE })).items).toBe(
      DE
    );
  });

  it('keeps a failed fetch of the new language silent, until the next switch fetches it', () => {
    const failed = run(
      english,
      { type: 'language', language: 'de' },
      { type: 'failed', language: 'de' }
    );
    expect(catalogViewOf(failed)).toEqual({ status: 'loaded', items: EN });
    expect(fetchLanguageOf(failed)).toBeNull();
    expect(prefetchLanguageOf(failed)).toBeNull();
    // Back to English: its list at once, and German in the background
    const back = run(failed, { type: 'language', language: 'en' });
    expect(catalogViewOf(back)).toEqual({ status: 'loaded', items: EN });
    expect(prefetchLanguageOf(back)).toBe('de');
    // German again before that answer: fetched as the current language, English on screen
    const again = run(back, { type: 'language', language: 'de' });
    expect(fetchLanguageOf(again)).toBe('de');
    expect(catalogViewOf(again)).toEqual({ status: 'loaded', items: EN });
  });

  it('stays loaded through quick switches back and forth, and takes a late answer', () => {
    let state = english;
    for (const language of ['de', 'en', 'de', 'en', 'de'] as const) {
      state = run(state, { type: 'language', language });
      expect(catalogViewOf(state)).toEqual({ status: 'loaded', items: EN });
    }
    expect(fetchLanguageOf(state)).toBe('de');
    const landed = run(state, { type: 'loaded', language: 'de', items: DE });
    expect(catalogViewOf(landed)).toEqual({ status: 'loaded', items: DE });
    // An answer for the language not shown is kept for the next switch
    const late = run(
      english,
      { type: 'language', language: 'de' },
      { type: 'language', language: 'en' },
      { type: 'loaded', language: 'de', items: DE }
    );
    expect(catalogViewOf(late)).toEqual({ status: 'loaded', items: EN });
    expect(catalogViewOf(run(late, { type: 'language', language: 'de' }))).toEqual({
      status: 'loaded',
      items: DE,
    });
  });

  it('keeps the failed state through a switch before any list, and retries in the new language', () => {
    const failed = run(initial, { type: 'failed', language: 'en' });
    const switched = run(failed, { type: 'language', language: 'de' });
    expect(catalogViewOf(switched)).toEqual({ status: 'failed', items: [] });
    expect(fetchLanguageOf(switched)).toBeNull();
    const retried = run(switched, { type: 'retry' });
    expect(fetchLanguageOf(retried)).toBe('de');
    expect(catalogViewOf(retried).status).toBe('loading');
  });

  it('loads the new language when the switch comes while the first list loads', () => {
    const switched = run(initial, { type: 'language', language: 'de' });
    expect(catalogViewOf(switched)).toEqual({ status: 'loading', items: [] });
    expect(fetchLanguageOf(switched)).toBe('de');
  });
});

describe('formConnectionReducer', () => {
  // Only its identity matters here
  const formConnection = { id: 'c-1' } as FormConnectionOrDraft;
  const loaded = formConnectionReducer(INITIAL_FORM_CONNECTION_STATE, {
    type: 'loaded',
    formConnection,
  });

  it('keeps a loaded connection when a refetch for the language fails', () => {
    expect(formConnectionReducer(loaded, { type: 'failed', notice: null, refresh: true })).toBe(
      loaded
    );
    expect(formConnectionReducer(loaded, { type: 'notFound', refresh: true })).toBe(loaded);
  });

  it('shows the failure of any other load, as before', () => {
    expect(formConnectionReducer(loaded, { type: 'notFound' })).toEqual({
      status: 'notFound',
      attempt: 0,
    });
    expect(
      formConnectionReducer(INITIAL_FORM_CONNECTION_STATE, {
        type: 'failed',
        notice: null,
        refresh: true,
      })
    ).toEqual({ status: 'failed', attempt: 0, notice: null });
  });
});

describe('causeOf', () => {
  it('is new_day only when the day differs from the last change’s', () => {
    expect(causeOf(null, TODAY)).toBe('action');
    expect(causeOf(TODAY, TODAY)).toBe('action');
    expect(causeOf('2026-10-28', TODAY)).toBe('new_day');
  });
});

describe('actionOf', () => {
  it('turns the worker’s messages into the run state’s actions', () => {
    expect(actionOf({ type: 'result', runId: 3, check: check('b-main') })).toEqual({
      type: 'result',
      runId: 3,
      check: check('b-main'),
    });
    expect(actionOf({ type: 'done', runId: 3 })).toEqual({ type: 'done', runId: 3 });
  });
});

describe('byBranchFor', () => {
  it('gives every current branch its result, or null when the run state has none', () => {
    expect(
      byBranchFor([branch('b-main', 'Standard'), branch('b-2', 'Ambulance')], {
        'b-main': check('b-main'),
        gone: check('gone'),
      })
    ).toEqual({ 'b-main': check('b-main'), 'b-2': null });
  });
});

describe('isLocalDraftChange', () => {
  it('ignores a content with a new identity but the same structure', () => {
    expect(
      isLocalDraftChange(
        { content: emptyContent(), step: 'connection' },
        { content: emptyContent(), step: 'connection' }
      )
    ).toBe(false);
  });

  it('counts a changed content', () => {
    expect(
      isLocalDraftChange(
        { content: emptyContent(), step: 'connection' },
        { content: { ...emptyContent(), name: 'Parking permit' }, step: 'connection' }
      )
    ).toBe(true);
  });

  it('counts a changed step alone', () => {
    expect(
      isLocalDraftChange(
        { content: emptyContent(), step: 'connection' },
        { content: emptyContent(), step: 'documents' }
      )
    ).toBe(true);
  });
});

describe('localDraftActionOf', () => {
  const changed = { ...emptyContent(), description: 'F-1' };

  it('writes a content that differs from the baseline', () => {
    expect(localDraftActionOf(changed, emptyContent())).toBe('write');
  });

  it('removes the record when the content is back at the baseline', () => {
    expect(localDraftActionOf(emptyContent(), emptyContent())).toBe('remove');
  });

  it('always writes without a baseline, even an empty content', () => {
    expect(localDraftActionOf(changed, null)).toBe('write');
    expect(localDraftActionOf(emptyContent(), null)).toBe('write');
  });
});

describe('writeDelayOf', () => {
  it('writes the first time at once', () => {
    expect(writeDelayOf(null, 5000, 1000)).toBe(0);
  });

  it('waits for the rest of the interval after a write', () => {
    expect(writeDelayOf(5000, 5300, 1000)).toBe(700);
  });

  it('writes at once once the interval has passed', () => {
    expect(writeDelayOf(5000, 6000, 1000)).toBe(0);
    expect(writeDelayOf(5000, 9000, 1000)).toBe(0);
  });
});
