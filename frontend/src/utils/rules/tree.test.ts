import { describe, expect, it } from 'vitest';

import type { BranchInput, GroupItem, RuleTreeItem } from '../../types/form-connections';
import { mainBranch, rule, target } from './testData';
import {
  addRule,
  canGroup,
  countRules,
  defaultGroupName,
  defaultRuleName,
  deleteItem,
  duplicateRule,
  findItem,
  flattenItems,
  groupIdOf,
  groupItems,
  hasAnyRule,
  newRule,
  numberOfId,
  operatorOf,
  renameItem,
  replaceItem,
  ruleIdOf,
  setGroupMessage,
  setOperator,
  undoChange,
  ungroupItem,
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

  it('adds a rule at the end of a group, after its sub-group (FR-008)', () => {
    const items = addRule(TREE, rule(6, null, null), 'group-1');
    expect(findItem(items, 'rule-6')).toMatchObject({ parentId: 'group-1', index: 2, depth: 1 });
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

describe('deleteItem and undoChange', () => {
  it('deletes a rule and puts it back in its place', () => {
    const deleted = deleteItem(TREE, 'rule-1');
    expect(deleted).toMatchObject({
      deleted: TREE[0],
      dissolved: null,
      undo: { parentId: null, index: 0, before: [TREE[0]], after: [] },
    });
    expect(deleted && ids(deleted.items)).not.toContain('rule-1');
    expect(deleted && undoChange(deleted.items, deleted.undo)).toEqual(TREE);
  });

  it('deletes a rule of a group that keeps two or more members', () => {
    const items = [group(1, [rule(1, null, null), rule(2, null, null), rule(3, null, null)])];
    const deleted = deleteItem(items, 'rule-2');
    expect(deleted && ids(deleted.items)).toEqual(['group-1', 'rule-1', 'rule-3']);
    expect(deleted?.dissolved).toBeNull();
    expect(deleted && undoChange(deleted.items, deleted.undo)).toEqual(items);
  });

  it('deletes a group with its members', () => {
    const items = [...TREE, group(3, [rule(6, null, null), rule(7, null, null)])];
    const deleted = deleteItem(items, 'group-1');
    expect(deleted && ids(deleted.items)).toEqual([
      'rule-1',
      'rule-5',
      'group-3',
      'rule-6',
      'rule-7',
    ]);
    expect(deleted?.dissolved).toBeNull();
    expect(deleted && undoChange(deleted.items, deleted.undo)).toEqual(items);
  });

  it('dissolves a sub-group left with one rule: the rule takes its place (FR-008, US2-AS7)', () => {
    const deleted = deleteItem(TREE, 'rule-3');
    expect(deleted?.dissolved).toBe(findItem(TREE, 'group-2')?.item);
    expect(deleted && findItem(deleted.items, 'rule-4')).toMatchObject({
      parentId: 'group-1',
      index: 1,
      depth: 1,
    });
    expect(deleted && ids(deleted.items)).toEqual([
      'rule-1',
      'group-1',
      'rule-2',
      'rule-4',
      'rule-5',
    ]);
    expect(deleted && undoChange(deleted.items, deleted.undo)).toEqual(TREE);
  });

  it('dissolves a group left with one rule, dropping its AND/OR and message', () => {
    const items: RuleTreeItem[] = [
      rule(1, null, null),
      { ...group(1, [rule(2, null, null), rule(3, null, null)]), message: 'Own message.' },
      rule(4, null, null),
    ];
    const deleted = deleteItem(items, 'rule-2');
    expect(deleted?.items).toEqual([items[0], rule(3, null, null), items[2]]);
    expect(deleted?.undo).toEqual({
      parentId: null,
      index: 1,
      before: [items[1]],
      after: ['rule-3'],
    });
    expect(deleted && undoChange(deleted.items, deleted.undo)).toEqual(items);
  });

  it('dissolves a group whose sub-group is deleted, and keeps no empty group', () => {
    const deleted = deleteItem(TREE, 'group-2');
    expect(deleted && ids(deleted.items)).toEqual(['rule-1', 'rule-2', 'rule-5']);
    expect(deleted?.dissolved?.id).toBe('group-1');
    expect(deleted && undoChange(deleted.items, deleted.undo)).toEqual(TREE);
  });

  it('turns a sub-group that reaches the top level into a group, keeping all of it', () => {
    const subGroup = findItem(TREE, 'group-2')?.item;
    const deleted = deleteItem(TREE, 'rule-2');
    expect(deleted?.items[1]).toBe(subGroup);
    expect(deleted && findItem(deleted.items, 'group-2')).toMatchObject({
      parentId: null,
      depth: 0,
    });
    expect(deleted && undoChange(deleted.items, deleted.undo)).toEqual(TREE);
  });

  it('puts an item back at the end of the top level once its group is gone', () => {
    const items = [group(1, [rule(1, null, null), rule(2, null, null), rule(3, null, null)])];
    const deletedRule = deleteItem(items, 'rule-2');
    const withoutGroup = deletedRule && deleteItem(deletedRule.items, 'group-1');
    expect(
      deletedRule && withoutGroup && ids(undoChange(withoutGroup.items, deletedRule.undo))
    ).toEqual(['rule-2']);
  });

  it('deletes nothing unknown', () => {
    expect(deleteItem(TREE, 'rule-9')).toBeNull();
  });
});

describe('groupItems', () => {
  const FLAT: RuleTreeItem[] = deepFreeze([1, 2, 3, 4].map((n) => rule(n, null, null)));

  it('groups top-level rules into a group in the first one’s place (FR-007, FR-008)', () => {
    const grouped = groupItems(FLAT, ['rule-2', 'rule-3'], { rule: 5, group: 3 });
    expect(grouped?.group).toEqual({
      type: 'group',
      id: 'group-3',
      name: 'Group 03',
      mark: null,
      operator: 'and',
      message: null,
      items: [FLAT[1], FLAT[2]],
    });
    expect(grouped?.items).toEqual([FLAT[0], grouped?.group, FLAT[3]]);
    expect(grouped?.counters).toEqual({ rule: 5, group: 4 });
    expect(grouped && undoChange(grouped.items, grouped.undo)).toEqual(FLAT);
  });

  it('keeps the rules’ order, whatever order they were chosen in', () => {
    const grouped = groupItems(FLAT, ['rule-4', 'rule-1', 'rule-3'], { rule: 5, group: 1 });
    expect(grouped && ids(grouped.items)).toEqual([
      'group-1',
      'rule-1',
      'rule-3',
      'rule-4',
      'rule-2',
    ]);
    expect(grouped?.undo).toEqual({
      parentId: null,
      index: 0,
      before: FLAT,
      after: ['group-1', 'rule-2'],
    });
    expect(grouped && undoChange(grouped.items, grouped.undo)).toEqual(FLAT);
  });

  it('groups rules of a group into a sub-group, numbered from the same counter', () => {
    const items = [group(1, [rule(1, null, null), rule(2, null, null), rule(3, null, null)])];
    const grouped = groupItems(items, ['rule-1', 'rule-3'], { rule: 4, group: 2 });
    expect(grouped?.group).toMatchObject({ id: 'group-2', name: 'Sub-group 02' });
    expect(grouped && findItem(grouped.items, 'group-2')).toMatchObject({
      parentId: 'group-1',
      index: 0,
      depth: 1,
    });
    expect(grouped && ids(grouped.items)).toEqual([
      'group-1',
      'group-2',
      'rule-1',
      'rule-3',
      'rule-2',
    ]);
    expect(grouped && undoChange(grouped.items, grouped.undo)).toEqual(items);
  });

  it('groups nothing inside a sub-group (US2-AS6)', () => {
    expect(groupItems(TREE, ['rule-3', 'rule-4'], { rule: 6, group: 3 })).toBeNull();
    expect(canGroup(TREE, ['rule-3', 'rule-4'])).toBe(false);
  });

  it('needs two or more distinct rules of one level', () => {
    expect(canGroup(FLAT, ['rule-1'])).toBe(false);
    expect(canGroup(FLAT, ['rule-1', 'rule-1'])).toBe(false);
    expect(canGroup(TREE, ['rule-1', 'rule-2'])).toBe(false);
    expect(canGroup(TREE, ['rule-1', 'group-1'])).toBe(false);
    expect(canGroup(TREE, ['rule-1', 'rule-9'])).toBe(false);
    expect(canGroup(TREE, ['rule-1', 'rule-5'])).toBe(true);
    expect(canGroup(TREE, ['rule-2', 'group-2'])).toBe(false);
    expect(groupItems(FLAT, ['rule-1'], { rule: 5, group: 1 })).toBeNull();
  });
});

describe('ungroupItem', () => {
  it('puts a group’s members in its place, and its sub-group becomes a group (FR-008)', () => {
    const ungrouped = ungroupItem(TREE, 'group-1');
    const subGroup = findItem(TREE, 'group-2')?.item;
    expect(ungrouped && ids(ungrouped.items)).toEqual([
      'rule-1',
      'rule-2',
      'group-2',
      'rule-3',
      'rule-4',
      'rule-5',
    ]);
    expect(ungrouped?.items[2]).toBe(subGroup);
    expect(ungrouped?.group).toBe(TREE[1]);
    expect(ungrouped && undoChange(ungrouped.items, ungrouped.undo)).toEqual(TREE);
  });

  it('puts a sub-group’s rules in its place in the group', () => {
    const ungrouped = ungroupItem(TREE, 'group-2');
    expect(ungrouped && findItem(ungrouped.items, 'group-1')?.item).toMatchObject({
      items: [rule(2, null, null), rule(3, null, null), rule(4, null, null)],
    });
    expect(ungrouped && undoChange(ungrouped.items, ungrouped.undo)).toEqual(TREE);
  });

  it('ungroups no rule, and nothing unknown', () => {
    expect(ungroupItem(TREE, 'rule-1')).toBeNull();
    expect(ungroupItem(TREE, 'group-9')).toBeNull();
  });
});

describe('setOperator and operatorOf', () => {
  it('switches the top level, which is the branch’s operator (FR-007)', () => {
    const branch = mainBranch(TREE);
    const switched = setOperator(branch, null, 'or');
    expect(switched?.branch).toEqual({ ...branch, operator: 'or' });
    expect(switched?.previous).toBe('and');
    expect(switched && operatorOf(switched.branch, null)).toBe('or');
  });

  it('switches a group or a sub-group, and nothing else', () => {
    const branch = mainBranch(TREE);
    const switched = setOperator(branch, 'group-2', 'and');
    expect(switched?.previous).toBe('or');
    expect(switched && operatorOf(switched.branch, 'group-2')).toBe('and');
    expect(switched && operatorOf(switched.branch, 'group-1')).toBe('or');
    expect(switched?.branch.operator).toBe('and');
    expect(setOperator(branch, 'rule-1', 'or')).toBeNull();
    expect(setOperator(branch, 'group-9', 'or')).toBeNull();
  });
});

describe('setGroupMessage', () => {
  it('sets and removes a group’s own message, returning the group as it was (FR-004)', () => {
    const set = setGroupMessage(TREE, 'group-2', 'You must have held class B.');
    expect(set && findItem(set.items, 'group-2')?.item).toMatchObject({
      message: 'You must have held class B.',
    });
    expect(set?.previous).toBe(findItem(TREE, 'group-2')?.item);
    const removed = set && setGroupMessage(set.items, 'group-2', null);
    expect(removed?.items).toEqual(TREE);
    expect(set && replaceItem(set.items, set.previous)).toEqual(TREE);
  });

  it('sets no message on a rule', () => {
    expect(setGroupMessage(TREE, 'rule-1', 'X')).toBeNull();
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
