import { describe, expect, it } from 'vitest';

import type { BranchInput, GroupItem, RuleTreeItem } from '../../types/form-connections';
import { mainBranch, rule, target } from './testData';
import {
  addRule,
  countRules,
  defaultGroupName,
  defaultRuleName,
  deleteItem,
  duplicateRule,
  findItem,
  flattenItems,
  groupIdOf,
  hasAnyRule,
  newRule,
  numberOfId,
  renameItem,
  replaceItem,
  restoreItem,
  ruleIdOf,
  updateRule,
} from './tree';

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function group(number: number, items: RuleTreeItem[], name = `Group 0${number}`): GroupItem {
  return {
    type: 'group',
    id: `group-${number}`,
    name,
    mark: null,
    operator: 'or',
    message: null,
    items,
  };
}

// rule-1, group-1 (rule-2, group-2 (rule-3, rule-4)), rule-5; frozen, so no test can mutate it
const TREE: RuleTreeItem[] = deepFreeze([
  rule(1, target('pid', 'birthdate'), { operator: 'at_least_years_ago', years: 21 }),
  group(1, [
    rule(2, null, null),
    group(2, [rule(3, null, null), rule(4, null, null)], 'Sub-group 02'),
  ]),
  rule(5, null, null),
]);

function ids(items: RuleTreeItem[]): string[] {
  return flattenItems(items).map((item) => item.id);
}

describe('numbering (research R5)', () => {
  it('numbers a new rule from the counters, with a two-digit default name', () => {
    const { rule: created, counters } = newRule({ rule: 7, group: 3 });
    expect(created).toEqual({
      type: 'rule',
      id: 'rule-7',
      name: 'Rule 07',
      mark: null,
      target: null,
      condition: null,
      message: '',
    });
    expect(counters).toEqual({ rule: 8, group: 3 });
  });

  it('keeps every digit of larger numbers', () => {
    expect(defaultRuleName(123)).toBe('Rule 123');
    expect(defaultRuleName(10)).toBe('Rule 10');
  });

  it('names groups and sub-groups', () => {
    expect(defaultGroupName(3)).toBe('Group 03');
    expect(defaultGroupName(4, true)).toBe('Sub-group 04');
  });

  it('builds and reads identifiers', () => {
    expect(ruleIdOf(4)).toBe('rule-4');
    expect(groupIdOf(12)).toBe('group-12');
    expect(numberOfId('rule-4')).toBe(4);
    expect(numberOfId('group-12')).toBe(12);
    expect(numberOfId('rule-x')).toBeNull();
  });
});

describe('finding items', () => {
  it('lists every item in display order, members after their group', () => {
    expect(ids(TREE)).toEqual([
      'rule-1',
      'group-1',
      'rule-2',
      'group-2',
      'rule-3',
      'rule-4',
      'rule-5',
    ]);
  });

  it('finds an item with its parent, index and depth', () => {
    expect(findItem(TREE, 'rule-4')).toMatchObject({ parentId: 'group-2', index: 1, depth: 2 });
    expect(findItem(TREE, 'group-2')).toMatchObject({ parentId: 'group-1', index: 1, depth: 1 });
    expect(findItem(TREE, 'rule-5')).toMatchObject({ parentId: null, index: 2, depth: 0 });
    expect(findItem(TREE, 'rule-9')).toBeNull();
  });
});

describe('addRule', () => {
  it('adds a rule at the end of the top level (FR-007)', () => {
    const items = addRule(TREE, rule(6, null, null));
    expect(ids(items).at(-1)).toBe('rule-6');
    expect(items).toHaveLength(4);
  });

  it('adds a rule at the end of a group or sub-group', () => {
    expect(ids(addRule(TREE, rule(6, null, null), 'group-2'))).toEqual([
      'rule-1',
      'group-1',
      'rule-2',
      'group-2',
      'rule-3',
      'rule-4',
      'rule-6',
      'rule-5',
    ]);
  });
});

describe('updateRule', () => {
  it('changes a rule and returns it as it was, which an undo puts back', () => {
    const changed = updateRule(TREE, 'rule-1', {
      condition: { operator: 'at_least_years_ago', years: 19 },
      message: 'You must be at least 19 years old.',
    });
    expect(changed?.previous).toBe(TREE[0]);
    const updated = changed && findItem(changed.items, 'rule-1')?.item;
    expect(updated).toMatchObject({
      name: 'Rule 01',
      condition: { operator: 'at_least_years_ago', years: 19 },
      message: 'You must be at least 19 years old.',
    });
    expect(changed && replaceItem(changed.items, changed.previous)).toEqual(TREE);
  });

  it('changes a rule inside a sub-group', () => {
    const changed = updateRule(TREE, 'rule-3', { message: 'Changed.' });
    expect(changed && findItem(changed.items, 'rule-3')?.item).toMatchObject({
      message: 'Changed.',
    });
  });

  it('changes no group, and nothing unknown', () => {
    expect(updateRule(TREE, 'group-1', { name: 'X' })).toBeNull();
    expect(updateRule(TREE, 'rule-9', { name: 'X' })).toBeNull();
  });
});

describe('renameItem', () => {
  it('renames a rule or a group and returns what an undo puts back', () => {
    const renamed = renameItem(TREE, 'group-2', 'Older drivers');
    expect(renamed && findItem(renamed.items, 'group-2')?.item.name).toBe('Older drivers');
    expect(renamed && replaceItem(renamed.items, renamed.previous)).toEqual(TREE);
  });
});

describe('deleteItem and restoreItem', () => {
  it('deletes a rule and puts it back in its place', () => {
    const deleted = deleteItem(TREE, 'rule-3');
    expect(deleted?.deleted).toEqual({
      item: findItem(TREE, 'rule-3')?.item,
      parentId: 'group-2',
      index: 0,
    });
    expect(deleted && ids(deleted.items)).not.toContain('rule-3');
    expect(deleted && restoreItem(deleted.items, deleted.deleted)).toEqual(TREE);
  });

  it('deletes a top-level rule and puts it back in its place', () => {
    const deleted = deleteItem(TREE, 'rule-1');
    expect(deleted && restoreItem(deleted.items, deleted.deleted)).toEqual(TREE);
  });

  it('deletes a group with its members', () => {
    const deleted = deleteItem(TREE, 'group-1');
    expect(deleted && ids(deleted.items)).toEqual(['rule-1', 'rule-5']);
    expect(deleted && restoreItem(deleted.items, deleted.deleted)).toEqual(TREE);
  });

  it('puts an item back at the end of the top level once its group is gone', () => {
    const deletedRule = deleteItem(TREE, 'rule-3');
    const withoutGroup = deletedRule && deleteItem(deletedRule.items, 'group-2');
    expect(
      deletedRule && withoutGroup && ids(restoreItem(withoutGroup.items, deletedRule.deleted))
    ).toEqual(['rule-1', 'group-1', 'rule-2', 'rule-5', 'rule-3']);
  });

  it('deletes nothing unknown', () => {
    expect(deleteItem(TREE, 'rule-9')).toBeNull();
  });
});

describe('duplicateRule', () => {
  it('copies a rule as a new rule with its default name, at the end of its level', () => {
    const duplicated = duplicateRule(TREE, 'rule-1', { rule: 6, group: 3 });
    expect(duplicated?.rule).toEqual({ ...TREE[0], id: 'rule-6', name: 'Rule 06' });
    expect(duplicated && ids(duplicated.items).at(-1)).toBe('rule-6');
    expect(duplicated?.counters).toEqual({ rule: 7, group: 3 });
  });

  it('keeps a duplicate in the original’s group', () => {
    const duplicated = duplicateRule(TREE, 'rule-3', { rule: 6, group: 3 });
    expect(duplicated && findItem(duplicated.items, 'rule-6')).toMatchObject({
      parentId: 'group-2',
      index: 2,
    });
  });

  it('gives a renamed rule’s copy the default name', () => {
    const renamed = renameItem(TREE, 'rule-1', 'Old enough');
    const duplicated = renamed && duplicateRule(renamed.items, 'rule-1', { rule: 8, group: 1 });
    expect(duplicated?.rule.name).toBe('Rule 08');
  });

  it('duplicates no group', () => {
    expect(duplicateRule(TREE, 'group-1', { rule: 6, group: 3 })).toBeNull();
  });
});

describe('hasAnyRule', () => {
  it('is false while no branch has any rule (FR-001)', () => {
    const empty: BranchInput = { ...mainBranch([]), name: 'Taxi', origin: 'empty' };
    expect(hasAnyRule([mainBranch([]), empty])).toBe(false);
    expect(hasAnyRule([])).toBe(false);
  });

  it('is true once any branch has one, also inside a group', () => {
    expect(hasAnyRule([mainBranch([]), mainBranch([rule(1, null, null)])])).toBe(true);
    expect(hasAnyRule([mainBranch([group(1, [rule(1, null, null), rule(2, null, null)])])])).toBe(
      true
    );
  });
});

describe('countRules', () => {
  it('counts the rules that apply, in groups too, and no groups', () => {
    expect(countRules(TREE)).toBe(5);
  });

  it('leaves out removed rules and the rules of removed groups', () => {
    const items: RuleTreeItem[] = [
      { ...rule(1, null, null), mark: 'removed' },
      { ...group(1, [rule(2, null, null), rule(3, null, null)]), mark: 'removed' },
      rule(4, null, null),
    ];
    expect(countRules(items)).toBe(1);
  });
});
