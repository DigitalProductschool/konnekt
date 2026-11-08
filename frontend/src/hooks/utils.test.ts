import type { RuleTreeItem } from '@connection-portal/api-types/form-connections';
import { buildCheckedBranch } from '@connection-portal/rules/checks/checkedTree';
import type { BranchCheck } from '@connection-portal/rules/checks/types';
import { CONTEXT, mainBranch, US1_RULES } from '@connection-portal/rules/testData';
import { renameItem } from '@connection-portal/rules/tree';
import { describe, expect, it } from 'vitest';

import { emptyContent } from '../utils/localDrafts/content';
import type { CheckableBranch } from './types';
import {
  actionOf,
  byBranchFor,
  causeOf,
  isLocalDraftChange,
  localDraftActionOf,
  runBranchesOf,
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
