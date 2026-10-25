import { describe, expect, it } from 'vitest';

import type {
  BranchInput,
  Combinator,
  GroupItem,
  RuleItem,
  RuleTreeItem,
} from '../../types/form-connections';
import {
  addRuleToBranch,
  changeItem,
  copyRule,
  deleteFromBranch,
  deletionEffects,
  duplicateInBranch,
  groupInBranch,
  newBranch,
  propagateMain,
  propagateToBranches,
  removeItem,
  renameClash,
  resetBranchOperator,
  resetItem,
  restoreItem,
  setBranchOperator,
  takenNames,
  ungroupInBranch,
} from './branches';
import { rule, target } from './testData';
import {
  addRule,
  deleteItem,
  effectiveItems,
  findItem,
  flattenItems,
  groupItems,
  isDissolved,
  newRule,
  replaceItem,
  ungroupItem,
} from './tree';

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function group(
  number: number,
  items: RuleTreeItem[],
  operator: Combinator = 'or',
  name = `Group 0${number}`
): GroupItem {
  return { type: 'group', id: `group-${number}`, name, mark: null, operator, message: null, items };
}

function ageRule(number: number, years: number): RuleItem {
  return rule(number, target('pid', 'birthdate'), { operator: 'at_least_years_ago', years });
}

// Standard: rule-1, group-1 (rule-2, rule-3, OR), rule-4, combined with AND; frozen, so no test
// can change it
const MAIN: BranchInput = deepFreeze({
  id: 'main-id',
  name: 'Standard',
  description: null,
  origin: 'main',
  operator: 'and',
  operator_mark: null,
  items: [
    ageRule(1, 21),
    group(1, [ageRule(2, 18), ageRule(3, 2)]),
    rule(4, target('pid', 'address_locality'), {
      operator: 'equal_to',
      value: 'Stuttgart',
      match_case: false,
    }),
  ],
});

function basedOn(main: BranchInput = MAIN, name = 'Ambulance'): BranchInput {
  return deepFreeze({ ...newBranch(main, 'based', name, null), id: `${name}-id` });
}

function emptyBranch(name = 'Taxi'): BranchInput {
  return deepFreeze({ ...newBranch(MAIN, 'empty', name, null), id: `${name}-id` });
}

/** The main branch with other items, for a change of the main branch. */
function mainWith(items: RuleTreeItem[], operator: Combinator = MAIN.operator): BranchInput {
  return deepFreeze({ ...MAIN, operator, items });
}

function item(branch: Pick<BranchInput, 'items'>, id: string): RuleTreeItem {
  const found = findItem(branch.items, id);
  if (!found) {
    throw new Error(`${id} is missing`);
  }
  return found.item;
}

/** The identifiers of a level, in order: the top level for null. */
function levelIds(branch: Pick<BranchInput, 'items'>, parentId: string | null = null): string[] {
  const level = parentId === null ? branch.items : (item(branch, parentId) as GroupItem).items;
  return level.map((entry) => entry.id);
}

function marksOf(branch: Pick<BranchInput, 'items'>): Record<string, string | null> {
  return Object.fromEntries(flattenItems(branch.items).map((entry) => [entry.id, entry.mark]));
}

/** The item with a changed condition, as the rule editor gives it back. */
function withYears(entry: RuleTreeItem, years: number): RuleItem {
  return { ...(entry as RuleItem), condition: { operator: 'at_least_years_ago', years } };
}

function must<T>(value: T | null): T {
  if (value === null) {
    throw new Error('expected a result');
  }
  return value;
}

/**
 * What counts as a change, as data-model.md "Validation" defines equal: a rule's target,
 * condition, message and name; a group's AND/OR, name and message; never members or places.
 * Written apart from branches.ts, as the server's `_change_of` is.
 */
function changeOf(entry: RuleTreeItem): string {
  const blank = (text: string | null) => text?.trim() || null;
  if (entry.type === 'rule') {
    const condition = Object.fromEntries(
      Object.entries(entry.condition ?? {}).filter(([, value]) => value !== null)
    );
    return JSON.stringify([entry.name.trim(), entry.target, condition, entry.message.trim()]);
  }
  return JSON.stringify([entry.name.trim(), entry.operator, blank(entry.message)]);
}

/**
 * The server's checks of a branch against the main branch (T053; research R4): what a correct
 * propagation always satisfies. The problems found, none when the branch is in step.
 */
function invariantProblems(main: BranchInput, branch: BranchInput): string[] {
  const problems: string[] = [];
  const entries = flattenItems(branch.items);
  const ids = entries.map((entry) => entry.id);
  if (new Set(ids).size !== ids.length) {
    problems.push('an identifier appears twice');
  }
  if (branch.origin !== 'based') {
    if (branch.operator_mark !== null || entries.some((entry) => entry.mark !== null)) {
      problems.push('marks outside a based branch');
    }
    return problems;
  }
  const inherited = new Map(flattenItems(main.items).map((entry) => [entry.id, entry]));
  for (const id of inherited.keys()) {
    if (!ids.includes(id)) {
      problems.push(`${id} of the main branch is missing`);
    }
  }
  for (const entry of entries) {
    const original = inherited.get(entry.id);
    if (!original !== (entry.mark === 'added')) {
      problems.push(`${entry.id} is ${entry.mark ?? 'unmarked'}`);
    }
    if (original && (entry.mark === null || entry.mark === 'removed')) {
      if (changeOf(entry) !== changeOf(original)) {
        problems.push(`${entry.id} differs from the main branch's`);
      }
    }
    if (entry.type === 'group' && entry.mark === 'added') {
      if (effectiveItems(entry.items, true).length < 2) {
        problems.push(`${entry.id} has fewer than two members`);
      }
    }
  }
  if (branch.operator_mark === null && branch.operator !== main.operator) {
    problems.push('the top level differs from the main branch');
  }
  return problems;
}

/** Checks a branch against the main branch, and returns it frozen for the next step. */
function inStep(main: BranchInput, branch: BranchInput | null): BranchInput {
  expect(branch).not.toBeNull();
  expect(invariantProblems(main, branch as BranchInput)).toEqual([]);
  return deepFreeze(branch as BranchInput);
}

/** A change of the main branch, and the based branch after it, checked. */
function propagated(newMain: BranchInput, branch: BranchInput, oldMain = MAIN): BranchInput {
  return inStep(newMain, propagateMain(oldMain, newMain, branch));
}

describe('new branches (FR-019)', () => {
  it('copies the main branch into a based branch, unmarked and following its AND/OR', () => {
    const main = mainWith(MAIN.items, 'or');
    const branch = newBranch(main, 'based', '  Ambulance ', '  For ambulances ');
    expect(branch).toMatchObject({
      id: null,
      name: 'Ambulance',
      description: 'For ambulances',
      origin: 'based',
      operator: 'or',
      operator_mark: null,
    });
    expect(branch.items).toEqual(main.items);
    inStep(main, branch);
  });

  it('starts an empty branch without rules, with AND, and a blank description as none', () => {
    const branch = newBranch(mainWith(MAIN.items, 'or'), 'empty', 'Taxi', '   ');
    expect(branch).toMatchObject({
      origin: 'empty',
      operator: 'and',
      items: [],
      description: null,
    });
  });
});

describe('propagateMain: content (rule 1)', () => {
  const edited = mainWith(replaceItem(MAIN.items, withYears(item(MAIN, 'rule-1'), 25)));

  it('gives unmarked and removed items the main branch’s new content', () => {
    const removed = must(removeItem(MAIN, basedOn(), 'rule-1'));
    expect(item(propagated(edited, basedOn()), 'rule-1')).toEqual(item(edited, 'rule-1'));
    const after = propagated(edited, removed);
    expect(item(after, 'rule-1')).toEqual({ ...item(edited, 'rule-1'), mark: 'removed' });
  });

  it('keeps a changed item’s own version (EC-11)', () => {
    const changed = must(changeItem(MAIN, basedOn(), withYears(item(MAIN, 'rule-1'), 19)));
    const after = propagated(edited, changed);
    expect(item(after, 'rule-1')).toMatchObject({ mark: 'changed', condition: { years: 19 } });
  });

  it('gives an unmarked group the main branch’s AND/OR, name and message, not its members', () => {
    const withOwnRule = must(addRuleToBranch(basedOn(), ageRule(9, 30), 'group-1'));
    const main = mainWith(
      replaceItem(MAIN.items, { ...(item(MAIN, 'group-1') as GroupItem), operator: 'and' })
    );
    const after = propagated(main, withOwnRule);
    expect(item(after, 'group-1')).toMatchObject({ operator: 'and', mark: null });
    expect(levelIds(after, 'group-1')).toEqual(['rule-2', 'rule-3', 'rule-9']);
  });

  it('keeps a changed item changed when the main branch makes them equal (FR-024)', () => {
    const changed = must(changeItem(MAIN, basedOn(), withYears(item(MAIN, 'rule-1'), 19)));
    const equal = mainWith(replaceItem(MAIN.items, withYears(item(MAIN, 'rule-1'), 19)));
    expect(item(propagated(equal, changed), 'rule-1').mark).toBe('changed');
  });
});

describe('propagateMain: deletions (rule 2)', () => {
  const withoutRule4 = mainWith(must(deleteItem(MAIN.items, 'rule-4')).items);

  it('drops an unmarked or removed item the main branch deleted', () => {
    expect(levelIds(propagated(withoutRule4, basedOn()))).toEqual(['rule-1', 'group-1']);
    const removed = must(removeItem(MAIN, basedOn(), 'rule-4'));
    expect(levelIds(propagated(withoutRule4, removed))).toEqual(['rule-1', 'group-1']);
  });

  it('keeps a changed item where it was, as added, with its identifier (EC-12, EC-13)', () => {
    const changed = must(changeItem(MAIN, basedOn(), { ...item(MAIN, 'rule-4'), name: 'City' }));
    const after = propagated(withoutRule4, changed);
    expect(levelIds(after)).toEqual(['rule-1', 'group-1', 'rule-4']);
    expect(item(after, 'rule-4')).toMatchObject({ mark: 'added', name: 'City' });
  });
});

describe('propagateMain: additions (rule 3)', () => {
  const added = mainWith(addRule(MAIN.items, ageRule(5, 30)));

  it('adds the main branch’s new item unmarked, after the sibling both branches have', () => {
    const withOwn = must(addRuleToBranch(basedOn(), ageRule(9, 40)));
    const after = propagated(added, withOwn);
    expect(levelIds(after)).toEqual(['rule-1', 'group-1', 'rule-4', 'rule-5', 'rule-9']);
    expect(item(after, 'rule-5')).toEqual(ageRule(5, 30));
  });

  it('puts it after a group of the branch’s own that holds that sibling', () => {
    const own = must(addRuleToBranch(basedOn(), ageRule(9, 40)));
    const grouped = must(groupInBranch(own, ['rule-4', 'rule-9'], { rule: 10, group: 5 })).branch;
    const after = propagated(added, inStep(MAIN, grouped));
    expect(levelIds(after)).toEqual(['rule-1', 'group-1', 'group-5', 'rule-5']);
  });

  it('puts an item first in its level when no sibling before it is there', () => {
    const first = mainWith([ageRule(5, 30), ...MAIN.items]);
    expect(levelIds(propagated(first, basedOn()))[0]).toBe('rule-5');
  });

  it('doesn’t add it to a branch that started empty (US3-AS6)', () => {
    const empty = emptyBranch();
    expect(propagateMain(MAIN, added, empty)).toBe(empty);
  });

  it('adds a rule to a group the branch removed, where it isn’t evaluated', () => {
    const removed = must(removeItem(MAIN, basedOn(), 'group-1'));
    const main = mainWith(addRule(MAIN.items, ageRule(5, 30), 'group-1'));
    const after = propagated(main, removed);
    expect(levelIds(after, 'group-1')).toEqual(['rule-2', 'rule-3', 'rule-5']);
    expect(marksOf(after)).toMatchObject({ 'group-1': 'removed', 'rule-5': null });
    expect(effectiveItems(after.items, true).map((entry) => entry.id)).toEqual([
      'rule-1',
      'rule-4',
    ]);
  });

  it('adds a rule to a group the branch changed, where it follows the main branch', () => {
    const switched = { ...(item(MAIN, 'group-1') as GroupItem), operator: 'and' as const };
    const changed = must(changeItem(MAIN, basedOn(), switched));
    const main = mainWith(addRule(MAIN.items, ageRule(5, 30), 'group-1'));
    const after = propagated(main, changed);
    expect(levelIds(after, 'group-1')).toEqual(['rule-2', 'rule-3', 'rule-5']);
    expect(marksOf(after)).toMatchObject({ 'group-1': 'changed', 'rule-5': null });
  });

  it('brings an inherited group dissolved in the branch back once two members count (EC-16)', () => {
    const removed = must(removeItem(MAIN, basedOn(), 'rule-2'));
    expect(isDissolved(item(removed, 'group-1'), true)).toBe(true);
    const main = mainWith(addRule(MAIN.items, ageRule(5, 30), 'group-1'));
    const after = propagated(main, removed);
    expect(isDissolved(item(after, 'group-1'), true)).toBe(false);
  });
});

describe('propagateMain: moves (rule 4)', () => {
  // Standard groups rule-1 and rule-4 into group-2, in rule-1's place
  const grouped = mainWith(
    must(groupItems(MAIN.items, ['rule-1', 'rule-4'], { rule: 5, group: 2 })).items
  );

  it('moves followed and changed items as the main branch does (FR-021)', () => {
    const changed = must(changeItem(MAIN, basedOn(), withYears(item(MAIN, 'rule-4'), 1)));
    const after = propagated(grouped, inStep(MAIN, changed));
    expect(levelIds(after)).toEqual(['group-2', 'group-1']);
    expect(levelIds(after, 'group-2')).toEqual(['rule-1', 'rule-4']);
    expect(item(after, 'rule-4').mark).toBe('changed');
  });

  it('keeps rules in a group of the branch’s own (FR-022)', () => {
    const own = must(groupInBranch(basedOn(), ['rule-1', 'rule-4'], { rule: 5, group: 7 }));
    const after = propagated(grouped, inStep(MAIN, own.branch));
    expect(levelIds(after, 'group-7')).toEqual(['rule-1', 'rule-4']);
    expect(levelIds(after, 'group-2')).toEqual([]);
    // The main branch's new group has nothing that counts there, so it is dissolved
    expect(isDissolved(item(after, 'group-2'), true)).toBe(true);
  });
});

describe('propagateMain: dissolved groups (rule 5)', () => {
  // Standard deletes rule-2, one of group-1's two members: group-1 dissolves, rule-3 takes its place
  const dissolved = mainWith(must(deleteItem(MAIN.items, 'rule-2')).items);
  const switched = { ...(item(MAIN, 'group-1') as GroupItem), operator: 'and' as const };

  it('dissolves a group the branch follows', () => {
    expect(levelIds(propagated(dissolved, basedOn()))).toEqual(['rule-1', 'rule-3', 'rule-4']);
  });

  it('dissolves a group the branch changed all the same, and its change goes', () => {
    const changed = must(changeItem(MAIN, basedOn(), switched));
    const after = propagated(dissolved, changed);
    expect(levelIds(after)).toEqual(['rule-1', 'rule-3', 'rule-4']);
    expect(marksOf(after)).toEqual({ 'rule-1': null, 'rule-3': null, 'rule-4': null });
  });

  it('keeps a changed group that still has two members, as added', () => {
    const changedGroup = must(changeItem(MAIN, basedOn(), switched));
    const both = must(changeItem(MAIN, changedGroup, withYears(item(MAIN, 'rule-2'), 17)));
    const after = propagated(dissolved, both);
    expect(levelIds(after, 'group-1')).toEqual(['rule-2', 'rule-3']);
    expect(marksOf(after)).toMatchObject({ 'group-1': 'added', 'rule-2': 'added', 'rule-3': null });
  });
});

describe('propagateMain: the top level’s AND/OR (rule 6)', () => {
  const or = mainWith(MAIN.items, 'or');

  it('follows the main branch while it isn’t switched in the branch', () => {
    expect(propagated(or, basedOn()).operator).toBe('or');
  });

  it('keeps the branch’s own once switched there (FR-021)', () => {
    const switched = setBranchOperator(MAIN, basedOn(), 'or');
    const back = mainWith(MAIN.items, 'or');
    const after = propagateMain(MAIN, back, inStep(MAIN, switched));
    expect(after).toMatchObject({ operator: 'or', operator_mark: 'changed' });
    const main = mainWith(MAIN.items, 'and');
    expect(propagateMain(or, main, after)).toMatchObject({
      operator: 'or',
      operator_mark: 'changed',
    });
  });
});

describe('propagateMain: ungroup and delete group (rule 8)', () => {
  const ungrouped = mainWith(must(ungroupItem(MAIN.items, 'group-1')).items);
  const deletedGroup = mainWith(must(deleteItem(MAIN.items, 'group-1')).items);

  it('puts the members in the group’s place where the branch follows the group', () => {
    const after = propagated(ungrouped, basedOn());
    expect(levelIds(after)).toEqual(['rule-1', 'rule-2', 'rule-3', 'rule-4']);
  });

  it('keeps the members’ own removals where the branch removed the group', () => {
    const memberRemoved = must(removeItem(MAIN, basedOn(), 'rule-2'));
    const removed = must(removeItem(MAIN, memberRemoved, 'group-1'));
    const after = propagated(ungrouped, removed);
    expect(levelIds(after)).toEqual(['rule-1', 'rule-2', 'rule-3', 'rule-4']);
    expect(marksOf(after)).toMatchObject({ 'rule-2': 'removed', 'rule-3': null });
  });

  it('keeps a group the branch changed as added, with its members', () => {
    const changed = must(
      changeItem(MAIN, basedOn(), { ...item(MAIN, 'group-1'), name: 'Experience' })
    );
    const after = propagated(ungrouped, changed);
    expect(levelIds(after)).toEqual(['rule-1', 'group-1', 'rule-4']);
    expect(levelIds(after, 'group-1')).toEqual(['rule-2', 'rule-3']);
    expect(item(after, 'group-1').mark).toBe('added');
  });

  it('reaches the branch as deletions with "Delete group"', () => {
    const changed = must(changeItem(MAIN, basedOn(), withYears(item(MAIN, 'rule-3'), 5)));
    const after = propagated(deletedGroup, changed);
    expect(levelIds(after)).toEqual(['rule-1', 'rule-3', 'rule-4']);
    expect(item(after, 'rule-3').mark).toBe('added');
  });

  it('keeps a sub-group that reaches the top level with its identifier', () => {
    const nested = mainWith([
      group(1, [ageRule(1, 21), group(2, [ageRule(2, 1), ageRule(3, 2)], 'and', 'Sub-group 02')]),
    ]);
    const branch = basedOn(nested);
    const after = propagated(
      mainWith(must(ungroupItem(nested.items, 'group-1')).items),
      branch,
      nested
    );
    expect(levelIds(after)).toEqual(['rule-1', 'group-2']);
    expect(item(after, 'group-2')).toMatchObject({ name: 'Sub-group 02', operator: 'and' });
  });
});

describe('propagateMain: other branches', () => {
  it('returns a branch that started empty, and the main branch, as they are', () => {
    const changed = mainWith(addRule(MAIN.items, ageRule(5, 30)));
    const empty = emptyBranch();
    expect(propagateMain(MAIN, changed, empty)).toBe(empty);
    expect(propagateMain(MAIN, changed, MAIN)).toBe(MAIN);
  });

  it('gives the same result when it runs twice', () => {
    const changed = must(changeItem(MAIN, basedOn(), withYears(item(MAIN, 'rule-2'), 17)));
    const main = mainWith(must(deleteItem(MAIN.items, 'rule-2')).items);
    const once = propagated(main, changed);
    expect(propagateMain(MAIN, main, once)).toEqual(once);
  });

  it('updates every based branch, and nothing while the main branch is unchanged', () => {
    const branches = [MAIN, basedOn(), emptyBranch()];
    expect(propagateToBranches(MAIN, branches)).toBe(branches);
    const main = mainWith(addRule(MAIN.items, ageRule(5, 30)));
    const [, based, empty] = propagateToBranches(MAIN, [main, ...branches.slice(1)]);
    expect(inStep(main, based).items).toHaveLength(4);
    expect(empty).toBe(branches[2]);
  });
});

describe('mark transitions (FR-022 to FR-024)', () => {
  const branch = basedOn();
  const changed = must(changeItem(MAIN, branch, withYears(item(MAIN, 'rule-1'), 19)));

  it('marks an edited inherited rule as changed', () => {
    expect(inStep(MAIN, changed) && item(changed, 'rule-1')).toMatchObject({
      mark: 'changed',
      condition: { years: 19 },
    });
  });

  it('follows again after an edit back to the main branch’s content (FR-024)', () => {
    const back = must(changeItem(MAIN, changed, withYears(item(changed, 'rule-1'), 21)));
    expect(inStep(MAIN, back) && item(back, 'rule-1')).toEqual(item(MAIN, 'rule-1'));
  });

  it('counts a rename as a change, and a name with outer spaces as the same', () => {
    const renamed = must(changeItem(MAIN, branch, { ...item(MAIN, 'rule-1'), name: 'Age' }));
    expect(item(renamed, 'rule-1').mark).toBe('changed');
    const spaced = must(
      changeItem(MAIN, renamed, { ...item(renamed, 'rule-1'), name: ' Rule 01 ' })
    );
    expect(item(inStep(MAIN, spaced), 'rule-1')).toEqual(item(MAIN, 'rule-1'));
  });

  it('undoes a change with the main branch’s content (Reset to Standard)', () => {
    expect(item(inStep(MAIN, must(resetItem(MAIN, changed, 'rule-1'))), 'rule-1')).toEqual(
      item(MAIN, 'rule-1')
    );
    expect(resetItem(MAIN, branch, 'rule-1')).toBeNull();
  });

  it('removes an item with the main branch’s content, dropping a change', () => {
    const removed = inStep(MAIN, removeItem(MAIN, changed, 'rule-1'));
    expect(item(removed, 'rule-1')).toEqual({ ...item(MAIN, 'rule-1'), mark: 'removed' });
    expect(removeItem(MAIN, removed, 'rule-1')).toBeNull();
  });

  it('only restores a removed item: no change, delete or reset (FR-024)', () => {
    const removed = must(removeItem(MAIN, branch, 'rule-1'));
    expect(changeItem(MAIN, removed, withYears(item(MAIN, 'rule-1'), 30))).toBeNull();
    expect(deleteFromBranch(MAIN, removed, 'rule-1')).toBeNull();
    expect(resetItem(MAIN, removed, 'rule-1')).toBeNull();
    expect(item(inStep(MAIN, restoreItem(MAIN, removed, 'rule-1')), 'rule-1')).toEqual(
      item(MAIN, 'rule-1')
    );
    expect(restoreItem(MAIN, branch, 'rule-1')).toBeNull();
  });

  it('restores a group with the members removed inside it, and keeps their changes', () => {
    const memberRemoved = must(removeItem(MAIN, branch, 'rule-2'));
    const memberChanged = must(changeItem(MAIN, memberRemoved, withYears(item(MAIN, 'rule-3'), 9)));
    const removed = inStep(MAIN, removeItem(MAIN, memberChanged, 'group-1'));
    // Removing the group leaves its members' own marks (F15)
    expect(marksOf(removed)).toMatchObject({
      'group-1': 'removed',
      'rule-2': 'removed',
      'rule-3': 'changed',
    });
    const restored = inStep(MAIN, restoreItem(MAIN, removed, 'group-1'));
    expect(marksOf(restored)).toMatchObject({
      'group-1': null,
      'rule-2': null,
      'rule-3': 'changed',
    });
  });

  it('restores a group dissolved in the branch by restoring its removed members', () => {
    const dissolved = must(removeItem(MAIN, branch, 'rule-2'));
    expect(isDissolved(item(dissolved, 'group-1'), true)).toBe(true);
    const restored = inStep(MAIN, restoreItem(MAIN, dissolved, 'group-1'));
    expect(isDissolved(item(restored, 'group-1'), true)).toBe(false);
    expect(marksOf(restored)['rule-2']).toBeNull();
  });

  it('marks an inherited group changed when its AND/OR, name or message changes (EC-15)', () => {
    const original = item(MAIN, 'group-1') as GroupItem;
    for (const edit of [
      { ...original, operator: 'and' as const },
      { ...original, name: 'Experience' },
      { ...original, message: 'Show one of these.' },
    ]) {
      const result = inStep(MAIN, changeItem(MAIN, branch, edit));
      expect(marksOf(result)).toMatchObject({
        'group-1': 'changed',
        'rule-2': null,
        'rule-3': null,
      });
    }
    // A blank message is no message
    expect(
      item(must(changeItem(MAIN, branch, { ...original, message: '  ' })), 'group-1').mark
    ).toBeNull();
  });

  it('marks only a rule added into an inherited group', () => {
    const added = inStep(MAIN, addRuleToBranch(branch, ageRule(9, 30), 'group-1'));
    expect(marksOf(added)).toMatchObject({ 'group-1': null, 'rule-9': 'added' });
    expect(
      addRuleToBranch(must(removeItem(MAIN, branch, 'group-1')), ageRule(9, 30), 'group-1')
    ).toBeNull();
  });

  it('marks a group formed from inherited rules as added; its rules keep following', () => {
    const grouped = must(groupInBranch(branch, ['rule-1', 'rule-4'], { rule: 5, group: 2 }));
    expect(grouped.group).toMatchObject({ id: 'group-2', mark: 'added' });
    expect(marksOf(inStep(MAIN, grouped.branch))).toMatchObject({
      'group-2': 'added',
      'rule-1': null,
      'rule-4': null,
    });
    const removed = must(removeItem(MAIN, branch, 'rule-4'));
    expect(groupInBranch(removed, ['rule-1', 'rule-4'], { rule: 5, group: 2 })).toBeNull();
  });

  it('marks a duplicate as added, with a new identifier and its default name', () => {
    const duplicated = must(duplicateInBranch(changed, 'rule-1', { rule: 5, group: 2 }));
    expect(duplicated.rule).toMatchObject({ id: 'rule-5', name: 'Rule 05', mark: 'added' });
    expect(duplicated.rule.condition).toEqual({ operator: 'at_least_years_ago', years: 19 });
    expect(duplicated.counters).toEqual({ rule: 6, group: 2 });
    inStep(MAIN, duplicated.branch);
  });

  it('deletes an item of the branch’s own, and only that', () => {
    const added = must(addRuleToBranch(branch, ageRule(9, 30)));
    expect(levelIds(inStep(MAIN, deleteFromBranch(MAIN, added, 'rule-9')))).toEqual(
      levelIds(branch)
    );
    expect(deleteFromBranch(MAIN, branch, 'rule-1')).toBeNull();
  });

  it('keeps inherited rules, removed, when a group of the branch’s own is deleted', () => {
    const own = must(addRuleToBranch(branch, ageRule(9, 30)));
    const grouped = must(groupInBranch(own, ['rule-4', 'rule-9'], { rule: 10, group: 2 })).branch;
    const deleted = inStep(MAIN, deleteFromBranch(MAIN, grouped, 'group-2'));
    expect(levelIds(deleted)).toEqual(['rule-1', 'group-1', 'rule-4']);
    expect(item(deleted, 'rule-4').mark).toBe('removed');
  });

  it('dissolves a group of the branch’s own left with one member that counts', () => {
    const grouped = must(groupInBranch(branch, ['rule-1', 'rule-4'], { rule: 5, group: 2 })).branch;
    const removed = inStep(MAIN, removeItem(MAIN, grouped, 'rule-4'));
    expect(levelIds(removed)).toEqual(['rule-1', 'rule-4', 'group-1']);
  });

  it('ungroups only a group of the branch’s own in a based branch', () => {
    expect(ungroupInBranch(branch, 'group-1')).toBeNull();
    const grouped = must(groupInBranch(branch, ['rule-1', 'rule-4'], { rule: 5, group: 2 })).branch;
    expect(levelIds(inStep(MAIN, ungroupInBranch(grouped, 'group-2')))).toEqual([
      'rule-1',
      'rule-4',
      'group-1',
    ]);
  });

  it('marks a switched top level, and follows again when switched back', () => {
    const switched = inStep(MAIN, setBranchOperator(MAIN, branch, 'or'));
    expect(switched).toMatchObject({ operator: 'or', operator_mark: 'changed' });
    expect(setBranchOperator(MAIN, switched, 'and')).toMatchObject({ operator_mark: null });
    expect(resetBranchOperator(MAIN, switched)).toMatchObject({
      operator: 'and',
      operator_mark: null,
    });
  });

  it('marks nothing in the main branch or in a branch that started empty', () => {
    const empty = must(addRuleToBranch(emptyBranch(), ageRule(9, 30)));
    expect(item(empty, 'rule-9').mark).toBeNull();
    const edited = must(changeItem(MAIN, MAIN, withYears(item(MAIN, 'rule-1'), 30)));
    expect(item(edited, 'rule-1').mark).toBeNull();
    expect(setBranchOperator(MAIN, empty, 'or').operator_mark).toBeNull();
    const grouped = must(groupInBranch(MAIN, ['rule-1', 'rule-4'], { rule: 5, group: 2 }));
    expect(grouped.group.mark).toBeNull();
    expect(ungroupInBranch(MAIN, 'group-1')).not.toBeNull();
    // A main-branch group left with one member dissolves at once
    expect(levelIds(must(deleteFromBranch(MAIN, MAIN, 'rule-2')))).toEqual([
      'rule-1',
      'rule-3',
      'rule-4',
    ]);
  });
});

describe('copyRule (FR-022)', () => {
  const counters = { rule: 5, group: 2 };

  it('copies to other branches as new rules at the end of their top level', () => {
    const branches = [MAIN, basedOn(), emptyBranch()];
    const copied = must(copyRule(branches, 0, 'rule-1', [1, 2], counters));
    expect(
      copied.copies.map(({ branchIndex, rule: copy }) => [branchIndex, copy.id, copy.name])
    ).toEqual([
      [1, 'rule-5', 'Rule 05'],
      [2, 'rule-6', 'Rule 06'],
    ]);
    expect(copied.counters).toEqual({ rule: 7, group: 2 });
    const [main, based, empty] = copied.branches;
    expect(main).toBe(MAIN);
    expect(levelIds(based).at(-1)).toBe('rule-5');
    expect(item(based, 'rule-5')).toMatchObject({ mark: 'added', condition: { years: 21 } });
    expect(item(empty, 'rule-6').mark).toBeNull();
    inStep(MAIN, based);
  });

  it('copies to the main branch, which covers the branches based on it', () => {
    const branches = [MAIN, basedOn(), basedOn(MAIN, 'School transport'), emptyBranch()];
    const source = must(addRuleToBranch(branches[3], ageRule(9, 30)));
    const copied = must(
      copyRule([...branches.slice(0, 3), source], 3, 'rule-9', [0, 1, 3], counters)
    );
    expect(copied.copies).toHaveLength(1);
    const [main, ambulance, school] = copied.branches;
    expect(item(main, 'rule-5')).toMatchObject({ mark: null, name: 'Rule 05' });
    for (const branch of [ambulance, school]) {
      expect(item(inStep(main, branch), 'rule-5').mark).toBeNull();
    }
  });

  it('puts a copy from a based branch to the main branch beside its original there', () => {
    const changed = must(changeItem(MAIN, basedOn(), withYears(item(MAIN, 'rule-1'), 19)));
    const copied = must(copyRule([MAIN, changed], 1, 'rule-1', [0], counters));
    const [main, based] = copied.branches;
    expect(item(main, 'rule-5')).toMatchObject({ mark: null, condition: { years: 19 } });
    expect(levelIds(inStep(main, based))).toEqual(['rule-1', 'group-1', 'rule-4', 'rule-5']);
    expect(item(based, 'rule-1').mark).toBe('changed');
  });

  it('copies nothing for an unknown rule, or to the source alone', () => {
    expect(copyRule([MAIN, basedOn()], 0, 'rule-8', [1], counters)).toBeNull();
    expect(copyRule([MAIN, basedOn()], 0, 'group-1', [1], counters)).toBeNull();
    expect(copyRule([MAIN, basedOn()], 0, 'rule-1', [0], counters)).toBeNull();
  });
});

describe('deletionEffects: Standard’s delete confirmation (F14)', () => {
  it('names the branches that changed the rule and keep their version', () => {
    const ambulance = must(changeItem(MAIN, basedOn(), withYears(item(MAIN, 'rule-1'), 19)));
    const school = basedOn(MAIN, 'School transport');
    const effects = deletionEffects(
      [MAIN, ambulance, school, emptyBranch()],
      must(deleteItem(MAIN.items, 'rule-1')).items
    );
    expect(
      effects.map(({ branch, kept, dissolved }) => [
        branch.name,
        kept.map((entry) => entry.id),
        dissolved,
      ])
    ).toEqual([['Ambulance', ['rule-1'], []]]);
  });

  it('names the branches whose changed group the deletion dissolves (rule 5)', () => {
    const switched = { ...(item(MAIN, 'group-1') as GroupItem), operator: 'and' as const };
    const ambulance = must(changeItem(MAIN, basedOn(), switched));
    const [effect] = deletionEffects(
      [MAIN, ambulance],
      must(deleteItem(MAIN.items, 'rule-2')).items
    );
    expect(effect.kept).toEqual([]);
    expect(effect.dissolved.map((entry) => entry.id)).toEqual(['group-1']);
  });

  it('names the changed rules of a deleted group', () => {
    const ambulance = must(changeItem(MAIN, basedOn(), withYears(item(MAIN, 'rule-3'), 5)));
    const [effect] = deletionEffects(
      [MAIN, ambulance],
      must(deleteItem(MAIN.items, 'group-1')).items
    );
    expect(effect.kept.map((entry) => entry.id)).toEqual(['rule-3']);
  });

  it('names no branch that follows the deleted items', () => {
    expect(
      deletionEffects([MAIN, basedOn()], must(deleteItem(MAIN.items, 'rule-1')).items)
    ).toEqual([]);
  });
});

describe('names in based branches (FR-005; propagation rule 7)', () => {
  // Ambulance renamed rule-1 "Minimum age", removed rule-4 and added "Extra check"
  const renamed = must(
    changeItem(MAIN, basedOn(), { ...item(MAIN, 'rule-1'), name: 'Minimum age' })
  );
  const removed = must(removeItem(MAIN, renamed, 'rule-4'));
  const ambulance = deepFreeze(
    must(addRuleToBranch(removed, { ...ageRule(9, 30), name: 'Extra check' }))
  );
  const branches = [MAIN, ambulance, emptyBranch()];

  it('takes removed items’ names, and the main branch’s names of changed items', () => {
    const names = takenNames(MAIN, ambulance).map(({ name, ownerId }) => [name, ownerId]);
    expect(names).toEqual([
      ['Minimum age', 'rule-1'],
      ['Group 01', 'group-1'],
      ['Rule 02', 'rule-2'],
      ['Rule 03', 'rule-3'],
      ['Rule 04', 'rule-4'],
      ['Extra check', 'rule-9'],
      ['Rule 01', 'rule-1'],
    ]);
    expect(takenNames(MAIN, MAIN)).toHaveLength(5);
  });

  it('refuses a rename the branch follows, naming the branch and the item there', () => {
    const clash = must(renameClash(branches, 'rule-4', ' minimum AGE'));
    expect(clash.branch.name).toBe('Ambulance');
    expect(clash.taken).toEqual({ name: 'Minimum age', noun: 'rule', ownerId: 'rule-1' });
    expect(must(renameClash(branches, 'group-1', 'Extra check')).taken.ownerId).toBe('rule-9');
  });

  it('refuses a rename of an item the branch changed, which an undo would bring back', () => {
    expect(must(renameClash(branches, 'rule-1', 'Extra check')).branch.name).toBe('Ambulance');
  });

  it('lets an item take a name only it holds, and ignores branches that started empty', () => {
    expect(renameClash(branches, 'rule-1', 'Minimum age')).toBeNull();
    expect(renameClash(branches, 'rule-4', 'Rule 04')).toBeNull();
    const taxi = must(addRuleToBranch(emptyBranch(), { ...ageRule(9, 30), name: 'Taxi rule' }));
    expect(renameClash([MAIN, taxi], 'rule-1', 'Taxi rule')).toBeNull();
  });
});

describe('a sequence of edits stays in step', () => {
  it('keeps every based branch in step through changes in both branches', () => {
    let main = MAIN;
    let branch = basedOn();
    const step = (newMain: BranchInput) => {
      branch = propagated(newMain, branch, main);
      main = newMain;
    };
    branch = inStep(main, changeItem(main, branch, withYears(item(main, 'rule-1'), 19)));
    branch = inStep(main, removeItem(main, branch, 'rule-3'));
    const own = newRule({ rule: 5, group: 2 });
    branch = inStep(main, addRuleToBranch(branch, own.rule, 'group-1'));
    step(mainWith(addRule(main.items, ageRule(6, 30), 'group-1')));
    step(mainWith(must(groupItems(main.items, ['rule-1', 'rule-4'], { rule: 7, group: 2 })).items));
    step(mainWith(must(ungroupItem(main.items, 'group-1')).items));
    step(mainWith(must(deleteItem(main.items, 'rule-1')).items, 'or'));
    expect(marksOf(branch)).toMatchObject({
      'rule-1': 'added',
      'rule-3': 'removed',
      'rule-5': 'added',
    });
    expect(branch.operator).toBe('or');
  });
});
