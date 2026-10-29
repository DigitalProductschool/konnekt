import { describe, expect, it } from 'vitest';

import type { RuleTreeItem } from '../../../types/form-connections';
import { rule } from '../testData';
import { MAX_EARLIER_RESULTS, WATCHDOG_MS, WORKER_STOP_MS } from './constants';
import { namesOf } from './findingMessages';
import {
  cachedResult,
  checkMessageOf,
  initialRunState,
  runStateReducer,
  watchdogAt,
  withoutGoneItems,
} from './runState';
import type {
  BranchCheck,
  BranchNotice,
  ChangeCause,
  CheckedBranch,
  ConflictingFinding,
  ItemFinding,
  NamedBranch,
  RunAction,
  RunBranch,
  RunState,
} from './types';

const STANDARD: NamedBranch = { key: 'branch-main', name: 'Standard' };
const AMBULANCE: NamedBranch = { key: 'branch-2', name: 'Ambulance' };

function tree(count: number): RuleTreeItem[] {
  return Array.from({ length: count }, (_, index) => rule(index + 1, null, null));
}

/** A checked tree of `rules` rules, whose fingerprint stands for its content */
function checkedTree(branch: NamedBranch, fingerprint: string, rules = 3): CheckedBranch {
  return {
    branchKey: branch.key,
    operator: 'and',
    items: [
      ...Array.from({ length: rules - 1 }, (_, index) => ({
        type: 'rule' as const,
        id: `rule-${index + 1}`,
        formula: true,
      })),
      {
        type: 'group',
        id: 'group-1',
        operator: 'or',
        items: [{ type: 'rule', id: `rule-${rules}`, formula: true }],
      },
    ],
    leftOut: [],
    variables: {},
    today: '2026-10-29',
    fingerprint,
  };
}

function input(branch: NamedBranch, fingerprint: string, rules = 3): RunBranch {
  return { branch, names: namesOf(tree(rules)), checked: checkedTree(branch, fingerprint, rules) };
}

function changeTo(
  branches: RunBranch[],
  {
    shown = STANDARD.key,
    cause = 'action',
    now = 1000,
  }: Partial<{
    shown: string;
    cause: ChangeCause;
    now: number;
  }> = {}
): RunAction {
  return { type: 'change', branches, shownBranchKey: shown, cause, now };
}

function conflict(itemId: string, items: string[]): ConflictingFinding {
  return { itemId, kind: 'conflicting', reason: { type: 'with', items }, today: false };
}

function result(
  branch: NamedBranch,
  fingerprint: string,
  findings: ItemFinding[] = [],
  notice: BranchNotice | null = null
): BranchCheck {
  return { branchKey: branch.key, fingerprint, complete: true, notice, findings, checkedRules: 3 };
}

function reduce(state: RunState, ...actions: RunAction[]): RunState {
  return actions.reduce(runStateReducer, state);
}

/** Standard checked once, with fingerprint `a` and these findings */
function checkedOnce(findings: ItemFinding[] = []): RunState {
  const state = reduce(initialRunState, changeTo([input(STANDARD, 'a')], { cause: 'action' }));
  const runId = state.run?.runId ?? 0;
  return reduce(
    state,
    { type: 'result', runId, check: result(STANDARD, 'a', findings) },
    { type: 'done', runId }
  );
}

describe('runStateReducer', () => {
  it('starts a run on a change: pending, never checked, the shown branch first', () => {
    const state = reduce(
      initialRunState,
      changeTo([input(STANDARD, 'a'), input(AMBULANCE, 'b')], { shown: AMBULANCE.key })
    );
    expect(state.run).toEqual({
      runId: 1,
      startedAt: 1000,
      branchKeys: ['branch-2', 'branch-main'],
    });
    expect(state.branches.map(({ status }) => status)).toEqual(['pending', 'pending']);
    expect(state.byBranch).toEqual({ 'branch-main': null, 'branch-2': null });
    const message = checkMessageOf(state);
    expect(message?.deadline).toBe(1000 + WORKER_STOP_MS);
    expect(message?.branches.map(({ branchKey }) => branchKey)).toEqual([
      'branch-2',
      'branch-main',
    ]);
    expect(watchdogAt(state.run!)).toBe(1000 + WATCHDOG_MS);
  });

  it('turns a branch done when its result is posted, and ends the run with the last one', () => {
    let state = reduce(initialRunState, changeTo([input(STANDARD, 'a'), input(AMBULANCE, 'b')]));
    const findings = [conflict('rule-2', ['rule-1'])];
    state = reduce(state, { type: 'result', runId: 1, check: result(STANDARD, 'a', findings) });
    expect(state.byBranch['branch-main']?.findings).toEqual(findings);
    expect(state.run?.runId).toBe(1);
    // A branch's first result isn't announced
    expect(state.announcement).toBe('');
    state = reduce(state, { type: 'result', runId: 1, check: result(AMBULANCE, 'b') });
    expect(state.branches.map(({ status }) => status)).toEqual(['done', 'done']);
    expect(state.run).toBeNull();
    expect(checkMessageOf(state)).toBeNull();
  });

  it('reruns a done branch whose fingerprint changed, and announces the action’s changes', () => {
    let state = checkedOnce();
    state = reduce(state, changeTo([input(STANDARD, 'b')], { now: 2000 }));
    expect(state.run).toEqual({ runId: 2, startedAt: 2000, branchKeys: ['branch-main'] });
    expect(state.byBranch['branch-main']).toEqual(result(STANDARD, 'a'));
    state = reduce(state, {
      type: 'result',
      runId: 2,
      check: result(STANDARD, 'b', [conflict('rule-2', ['rule-1'])]),
    });
    expect(state.announcement).toBe('Rule 02 conflicts with Rule 01.');
  });

  it('keeps the run and the results on a change without a new fingerprint, such as a rename', () => {
    let state = reduce(initialRunState, changeTo([input(STANDARD, 'a'), input(AMBULANCE, 'b')]));
    state = reduce(state, { type: 'result', runId: 1, check: result(STANDARD, 'a') });
    const renamed = { ...input(STANDARD, 'a'), branch: { ...STANDARD, name: 'Basic' } };
    state = reduce(state, changeTo([renamed, input(AMBULANCE, 'b')]));
    expect(state.run?.runId).toBe(1);
    expect(state.branches[0]).toMatchObject({ status: 'done', branch: { name: 'Basic' } });
  });

  it('supersedes a run on a change during it, and ignores the old run’s messages', () => {
    let state = reduce(initialRunState, changeTo([input(STANDARD, 'a'), input(AMBULANCE, 'b')]));
    state = reduce(state, { type: 'result', runId: 1, check: result(STANDARD, 'a') });
    state = reduce(state, changeTo([input(STANDARD, 'c'), input(AMBULANCE, 'b')], { now: 1500 }));
    // The new run checks the changed branch and the one the old run didn't reach
    expect(state.run).toEqual({
      runId: 2,
      startedAt: 1500,
      branchKeys: ['branch-main', 'branch-2'],
    });
    const stale = reduce(
      state,
      { type: 'result', runId: 1, check: result(AMBULANCE, 'b', [conflict('rule-2', ['rule-1'])]) },
      { type: 'done', runId: 1 },
      { type: 'watchdog', runId: 1 },
      { type: 'failed', runId: 1 }
    );
    expect(stale).toBe(state);
  });

  it('ignores a result with another fingerprint, or for a branch not in the run', () => {
    const state = reduce(initialRunState, changeTo([input(STANDARD, 'a')]));
    expect(reduce(state, { type: 'result', runId: 1, check: result(STANDARD, 'x') })).toBe(state);
    expect(reduce(state, { type: 'result', runId: 1, check: result(AMBULANCE, 'a') })).toBe(state);
  });

  it('answers an undo from the cache at once, without a run', () => {
    let state = checkedOnce();
    state = reduce(state, changeTo([input(STANDARD, 'b')]));
    state = reduce(
      state,
      { type: 'result', runId: 2, check: result(STANDARD, 'b', [conflict('rule-2', ['rule-1'])]) },
      { type: 'done', runId: 2 }
    );
    state = reduce(state, changeTo([input(STANDARD, 'a')]));
    expect(state.run).toBeNull();
    expect(state.branches[0].status).toBe('done');
    expect(state.byBranch['branch-main']).toEqual(result(STANDARD, 'a'));
    expect(state.announcement).toBe('Rule 02 no longer conflicts with Rule 01.');
    // And the redo
    state = reduce(state, changeTo([input(STANDARD, 'b')]));
    expect(state.run).toBeNull();
    expect(state.announcement).toBe('Rule 02 conflicts with Rule 01.');
  });

  it('reuses a complete result of another branch with the same fingerprint', () => {
    let state = checkedOnce();
    state = reduce(state, changeTo([input(STANDARD, 'a'), input(AMBULANCE, 'a')]));
    expect(state.run).toBeNull();
    expect(state.byBranch['branch-2']).toEqual({ ...result(STANDARD, 'a'), branchKey: 'branch-2' });
  });

  it('shows a pending branch’s last result without findings on items that are gone', () => {
    const findings = [
      conflict('rule-1', ['rule-2']),
      conflict('rule-2', ['rule-1']),
      conflict('rule-3', ['rule-1']),
    ];
    let state = checkedOnce(findings);
    // Rule 02 is deleted: Rule 03 moves up, and the findings that name rule-2 go
    const names = namesOf([rule(1, null, null), rule(3, null, null)]);
    state = reduce(state, changeTo([{ ...input(STANDARD, 'b'), names }]));
    expect(state.branches[0].status).toBe('pending');
    expect(state.byBranch['branch-main']?.findings).toEqual([conflict('rule-3', ['rule-1'])]);
    expect(state.cache.latest['branch-main'].findings).toEqual(findings);
  });

  it('keeps 50 earlier results, the newest ones', () => {
    let state = checkedOnce();
    for (let index = 1; index <= MAX_EARLIER_RESULTS + 1; index += 1) {
      const fingerprint = `f${index}`;
      state = reduce(state, changeTo([input(STANDARD, fingerprint)]));
      const runId = state.run?.runId ?? 0;
      state = reduce(state, { type: 'result', runId, check: result(STANDARD, fingerprint) });
    }
    expect(state.cache.earlier).toHaveLength(MAX_EARLIER_RESULTS);
    // 'a' was the oldest of 51 earlier results; 'f1' to 'f50' are still there
    expect(cachedResult(state.cache, 'a', STANDARD.key)).toBeNull();
    expect(cachedResult(state.cache, 'f1', STANDARD.key)?.fingerprint).toBe('f1');
    state = reduce(state, changeTo([input(STANDARD, 'a')]));
    expect(state.run).not.toBeNull();
  });

  it('caches only complete results', () => {
    let state = reduce(initialRunState, changeTo([input(STANDARD, 'a')]));
    state = reduce(state, { type: 'watchdog', runId: 1 });
    state = reduce(state, changeTo([input(STANDARD, 'b')]));
    expect(cachedResult(state.cache, 'a', STANDARD.key)).toBeNull();
    state = reduce(state, changeTo([input(STANDARD, 'a')]));
    expect(state.run?.branchKeys).toEqual(['branch-main']);
  });

  it('drops a deleted branch from byBranch, and keeps its result for an undo', () => {
    let state = reduce(initialRunState, changeTo([input(STANDARD, 'a'), input(AMBULANCE, 'b')]));
    state = reduce(
      state,
      { type: 'result', runId: 1, check: result(STANDARD, 'a') },
      { type: 'result', runId: 1, check: result(AMBULANCE, 'b') }
    );
    state = reduce(state, changeTo([input(STANDARD, 'a')]));
    expect(Object.keys(state.byBranch)).toEqual(['branch-main']);
    expect(state.cache.latest['branch-2']).toBeUndefined();
    state = reduce(state, changeTo([input(STANDARD, 'a'), input(AMBULANCE, 'b')]));
    expect(state.run).toBeNull();
    expect(state.byBranch['branch-2']).toEqual(result(AMBULANCE, 'b'));
  });

  it('ends a run whose deleted branch was the last one pending', () => {
    let state = reduce(initialRunState, changeTo([input(STANDARD, 'a'), input(AMBULANCE, 'b')]));
    state = reduce(state, { type: 'result', runId: 1, check: result(STANDARD, 'a') });
    state = reduce(state, changeTo([input(STANDARD, 'a')]));
    expect(state.run).toBeNull();
  });

  it.each(['done', 'watchdog', 'failed'] as const)(
    'turns the branches still pending into incomplete ones without findings on %s',
    (type) => {
      let state = checkedOnce([conflict('rule-2', ['rule-1'])]);
      state = reduce(state, changeTo([input(STANDARD, 'b', 4), input(AMBULANCE, 'c')]));
      state = reduce(state, { type: 'result', runId: 2, check: result(AMBULANCE, 'c') });
      state = reduce(state, { type, runId: 2 });
      expect(state.run).toBeNull();
      expect(state.byBranch).toEqual({
        'branch-main': {
          branchKey: 'branch-main',
          fingerprint: 'b',
          complete: false,
          notice: null,
          findings: [],
          checkedRules: 4,
        },
        'branch-2': result(AMBULANCE, 'c'),
      });
      // An incomplete result announces no disappearance, so FR-010's sentence stands alone
      expect(state.announcement).toBe('');
    }
  );

  it('handles a worker that can’t start: every branch of the run is done, incomplete', () => {
    let state = reduce(initialRunState, changeTo([input(STANDARD, 'a'), input(AMBULANCE, 'b', 2)]));
    state = reduce(state, { type: 'failed', runId: 1 });
    expect(state.branches.map(({ status }) => status)).toEqual(['done', 'done']);
    expect(
      Object.values(state.byBranch).map((check) => [
        check?.complete,
        check?.findings,
        check?.checkedRules,
      ])
    ).toEqual([
      [false, [], 3],
      [false, [], 2],
    ]);
  });

  it('announces nothing for a change caused by a new day', () => {
    let state = checkedOnce();
    state = reduce(state, changeTo([input(STANDARD, 'b')], { cause: 'new_day' }));
    state = reduce(state, {
      type: 'result',
      runId: 2,
      check: result(STANDARD, 'b', [conflict('rule-2', ['rule-1'])]),
    });
    expect(state.announcement).toBe('');
  });

  it('keeps the latest announcement while a result has nothing to say', () => {
    let state = checkedOnce();
    state = reduce(state, changeTo([input(STANDARD, 'b')]));
    state = reduce(state, {
      type: 'result',
      runId: 2,
      check: result(STANDARD, 'b', [conflict('rule-2', ['rule-1'])]),
    });
    state = reduce(state, changeTo([input(STANDARD, 'b'), input(AMBULANCE, 'c')]));
    state = reduce(state, { type: 'result', runId: 3, check: result(AMBULANCE, 'c') });
    expect(state.announcement).toBe('Rule 02 conflicts with Rule 01.');
  });

  it('orders the next run, and words announcements, by the branch shown', () => {
    let state = reduce(initialRunState, changeTo([input(STANDARD, 'a'), input(AMBULANCE, 'b')]));
    state = reduce(
      state,
      { type: 'result', runId: 1, check: result(STANDARD, 'a') },
      { type: 'result', runId: 1, check: result(AMBULANCE, 'b') },
      { type: 'show', shownBranchKey: AMBULANCE.key }
    );
    expect(state.run).toBeNull();
    state = reduce(
      state,
      changeTo([input(STANDARD, 'c'), input(AMBULANCE, 'd')], { shown: AMBULANCE.key })
    );
    expect(state.run?.branchKeys).toEqual(['branch-2', 'branch-main']);
    state = reduce(state, {
      type: 'result',
      runId: 2,
      check: result(STANDARD, 'c', [conflict('rule-2', ['rule-1'])]),
    });
    expect(state.announcement).toBe('In Standard: Rule 02 conflicts with Rule 01.');
  });
});

describe('withoutGoneItems', () => {
  it('returns the same result when every item is still there', () => {
    const check = result(STANDARD, 'a', [conflict('rule-2', ['rule-1'])]);
    expect(withoutGoneItems(check, namesOf(tree(3)))).toBe(check);
  });
});
