import type {
  BranchInput,
  Combinator,
  GroupItem,
  RuleItem,
  RuleTreeItem,
} from '@connection-portal/api-types/form-connections';
import { describe, expect, it } from 'vitest';

import { newBranch } from './branches';
import { EDIT_MESSAGES } from './constants';
import {
  addRule,
  addVariant,
  appendDocument,
  changeGroup,
  changeRule,
  copyRule,
  deleteItem,
  deleteVariant,
  duplicateRule,
  editVariant,
  groupItems,
  moveDocument,
  removeRules,
  resetItem,
  resetOperator,
  restoreDocument,
  restoreItem,
  rulesCheckingRemoval,
  setGroupMessage,
  switchOperator,
  ungroup,
} from './edits';
import { rule, target } from './testData';
import { findItem, flattenItems } from './tree';
import type { EditResult, EditState } from './types';

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

// The fixtures of branches.test.ts. Standard: rule-1, group-1 (rule-2, rule-3, OR), rule-4,
// combined with AND
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

const AMBULANCE = 'Ambulance-id';
const TAXI = 'Taxi-id';

/** Standard, Ambulance based on it and Taxi started empty, numbering from rule 5 and group 2. */
const STATE: EditState = deepFreeze({
  branches: [
    MAIN,
    { ...newBranch(MAIN, 'based', 'Ambulance', null), id: AMBULANCE },
    { ...newBranch(MAIN, 'empty', 'Taxi', null), id: TAXI },
  ],
  counters: { rule: 5, group: 2 },
});

/** The state after an action that the test expects to succeed. */
function done<T extends object>(result: EditResult<T>): { state: EditState } & T {
  if (!result.ok) {
    throw new Error(`refused: ${result.refusal.message}`);
  }
  return result;
}

/** The refusal of an action that the test expects to be refused. */
function refusal(result: EditResult) {
  if (result.ok) {
    throw new Error('not refused');
  }
  return result.refusal;
}

function branch(state: EditState, id: string): BranchInput {
  const found = state.branches.find((entry) => entry.id === id);
  if (!found) {
    throw new Error(`${id} is missing`);
  }
  return found;
}

function item(state: EditState, branchId: string, id: string): RuleTreeItem | undefined {
  return findItem(branch(state, branchId).items, id)?.item;
}

function ids(state: EditState, branchId: string): string[] {
  return flattenItems(branch(state, branchId).items).map((entry) => entry.id);
}

function marksOf(state: EditState, branchId: string): Record<string, string | null> {
  return Object.fromEntries(
    flattenItems(branch(state, branchId).items).map((entry) => [entry.id, entry.mark])
  );
}

/** Ambulance after an action there that the test expects to succeed. */
function inAmbulance(result: EditResult): EditState {
  return done(result).state;
}

describe('addRule', () => {
  it('adds a rule to Standard, numbered from the counters, which the based variant follows', () => {
    const { state, item: added, propagatedTo } = done(addRule(STATE, 'main-id', null));
    expect(added).toEqual({
      type: 'rule',
      id: 'rule-5',
      name: 'Rule 05',
      mark: null,
      target: null,
      condition: null,
      message: '',
    });
    expect(state.counters).toEqual({ rule: 6, group: 2 });
    expect(ids(state, 'main-id')).toEqual([
      'rule-1',
      'group-1',
      'rule-2',
      'rule-3',
      'rule-4',
      'rule-5',
    ]);
    expect(item(state, AMBULANCE, 'rule-5')).toMatchObject({ mark: null });
    expect(item(state, TAXI, 'rule-5')).toBeUndefined();
    expect(propagatedTo).toEqual([AMBULANCE]);
  });

  it('adds a rule at the end of a group, with its content, incomplete as it may be', () => {
    const { state, item: added } = done(
      addRule(STATE, 'main-id', 'group-1', {
        target: target('pid', 'birthdate'),
        message: 'You must be an adult.',
      })
    );
    expect(findItem(branch(state, 'main-id').items, 'rule-5')).toMatchObject({
      parentId: 'group-1',
      index: 2,
    });
    expect(added).toMatchObject({ condition: null, message: 'You must be an adult.' });
    expect(findItem(branch(state, AMBULANCE).items, 'rule-5')?.parentId).toBe('group-1');
  });

  it('marks a rule added in a based variant as added, also in an inherited group (FR-022)', () => {
    const { state, propagatedTo } = done(addRule(STATE, AMBULANCE, 'group-1'));
    expect(marksOf(state, AMBULANCE)).toMatchObject({ 'group-1': null, 'rule-5': 'added' });
    expect(item(state, 'main-id', 'rule-5')).toBeUndefined();
    expect(propagatedTo).toEqual([]);
    expect(item(done(addRule(STATE, TAXI, null)).state, TAXI, 'rule-5')?.mark).toBeNull();
  });

  it('takes the rule editor’s number, leaving the counters as they are', () => {
    const { state, item: added } = done(addRule(STATE, 'main-id', null, { id: 'rule-9' }));
    expect(added).toMatchObject({ id: 'rule-9', name: 'Rule 09' });
    expect(state.counters).toEqual(STATE.counters);
    expect(refusal(addRule(STATE, 'main-id', null, { id: 'group-9' })).message).toBe(
      'The rules contain an invalid identifier. Reload the connection and try again.'
    );
    expect(refusal(addRule(STATE, 'main-id', null, { id: 'group-9' })).code).toBe(
      'invalidIdentifier'
    );
  });

  it('renames the new rule as renaming does, refusing a name a based variant holds', () => {
    const named = done(addRule(STATE, 'main-id', null, { name: ' Adult ' }));
    expect(named.item.name).toBe(' Adult ');
    expect(item(named.state, AMBULANCE, 'rule-5')?.name).toBe(' Adult ');
    const own = inAmbulance(addRule(STATE, AMBULANCE, null, { name: 'Resident' }));
    expect(refusal(addRule(own, 'main-id', null, { name: 'resident' }))).toEqual({
      code: 'nameTaken',
      message: 'There’s already a rule called "Resident" in Ambulance.',
      branchIndex: 0,
      itemId: 'rule-6',
    });
    expect(refusal(addRule(STATE, 'main-id', null, { name: 'Rule 01' })).message).toBe(
      'There’s already a rule called "Rule 01" in Standard.'
    );
  });

  it('refuses an unknown variant or group, a rule as the group, and a removed group', () => {
    expect(refusal(addRule(STATE, 'gone', null))).toEqual({
      code: 'unknownVariant',
      message: 'Unknown variant.',
      branchIndex: null,
      itemId: null,
    });
    expect(refusal(addRule(STATE, 'main-id', 'group-7')).message).toBe(
      'Standard has no rule or group group-7.'
    );
    expect(refusal(addRule(STATE, 'main-id', 'group-7')).code).toBe('unknownItem');
    expect(refusal(addRule(STATE, 'main-id', 'rule-1')).message).toBe(
      'Rule 01 in Standard is a rule, not a group.'
    );
    const removed = inAmbulance(deleteItem(STATE, AMBULANCE, 'group-1'));
    expect(refusal(addRule(removed, AMBULANCE, 'group-1'))).toEqual({
      code: 'removed',
      message: 'Group 01 is removed in Ambulance. Restore it first.',
      branchIndex: 1,
      itemId: 'group-1',
    });
  });

  it('leaves the state it was given as it was', () => {
    // STATE is frozen: any change to it would throw
    expect(() => addRule(STATE, 'main-id', 'group-1', { name: 'Adult' })).not.toThrow();
  });
});

describe('changeRule and changeGroup', () => {
  it('changes a rule of Standard, which the based variant follows', () => {
    const condition = { operator: 'at_least_years_ago', years: 18 };
    const {
      state,
      item: changed,
      propagatedTo,
    } = done(changeRule(STATE, 'main-id', 'rule-1', { condition, message: 'Adults only.' }));
    expect(changed).toMatchObject({ condition, message: 'Adults only.', name: 'Rule 01' });
    expect(item(state, AMBULANCE, 'rule-1')).toMatchObject({ condition, mark: null });
    expect(propagatedTo).toEqual([AMBULANCE]);
  });

  it('marks a based variant’s change, and follows again once equal (FR-022, FR-024)', () => {
    const changed = inAmbulance(changeRule(STATE, AMBULANCE, 'rule-1', { name: 'Adult' }));
    expect(item(changed, AMBULANCE, 'rule-1')).toMatchObject({ name: 'Adult', mark: 'changed' });
    expect(item(changed, 'main-id', 'rule-1')?.name).toBe('Rule 01');
    const back = done(changeRule(changed, AMBULANCE, 'rule-1', { name: 'Rule 01' }));
    expect(back.item.mark).toBeNull();
    // Standard's change doesn't reach the variant's own version
    const later = done(changeRule(changed, 'main-id', 'rule-1', { message: 'Adults only.' }));
    expect(item(later.state, AMBULANCE, 'rule-1')).toMatchObject({
      name: 'Adult',
      mark: 'changed',
    });
    expect(later.propagatedTo).toEqual([]);
  });

  it('refuses a rename of Standard’s rule that clashes in a based variant (rule 7)', () => {
    const own = inAmbulance(addRule(STATE, AMBULANCE, null, { name: 'Adult' }));
    expect(refusal(changeRule(own, 'main-id', 'rule-1', { name: ' adult' }))).toEqual({
      code: 'nameTaken',
      message: 'There’s already a rule called "Adult" in Ambulance.',
      branchIndex: 0,
      itemId: 'rule-1',
    });
  });

  it('checks a name only when it changes, and refuses an empty or reserved one', () => {
    expect(done(changeRule(STATE, 'main-id', 'rule-1', { name: ' Rule 01 ' })).item.name).toBe(
      ' Rule 01 '
    );
    expect(refusal(changeRule(STATE, 'main-id', 'rule-1', { name: '  ' })).message).toBe(
      'Enter a name.'
    );
    // A name's problem keeps the code validation.ts gives it
    expect(refusal(changeRule(STATE, 'main-id', 'rule-1', { name: '  ' })).code).toBe(
      'nameMissing'
    );
    expect(refusal(changeGroup(STATE, 'main-id', 'group-1', { name: 'Rule 07' })).message).toBe(
      'Rule 07 is kept for the rule numbered 07.'
    );
  });

  it('changes a group’s AND/OR, name and message, not its members (EC-15)', () => {
    const { state, item: changed } = done(
      changeGroup(STATE, AMBULANCE, 'group-1', { operator: 'and', message: 'One of these.' })
    );
    expect(changed).toMatchObject({ operator: 'and', message: 'One of these.', mark: 'changed' });
    expect(changed.items.map((member) => member.id)).toEqual(['rule-2', 'rule-3']);
    expect(marksOf(state, AMBULANCE)).toMatchObject({ 'rule-2': null, 'rule-3': null });
    const renamed = done(changeGroup(STATE, 'main-id', 'group-1', { name: 'Licence' }));
    expect(item(renamed.state, AMBULANCE, 'group-1')).toMatchObject({
      name: 'Licence',
      mark: null,
    });
  });

  it('adds, changes and removes a group’s own message (W6)', () => {
    const message = (state: EditState) => (item(state, 'main-id', 'group-1') as GroupItem).message;
    const added = done(setGroupMessage(STATE, 'main-id', 'group-1', '')).state;
    expect(message(added)).toBe('');
    const typed = done(setGroupMessage(added, 'main-id', 'group-1', 'One of these.')).state;
    expect(message(typed)).toBe('One of these.');
    expect((item(typed, AMBULANCE, 'group-1') as GroupItem).message).toBe('One of these.');
    expect(message(done(setGroupMessage(typed, 'main-id', 'group-1', null)).state)).toBeNull();
  });

  it('refuses a removed item, a group as a rule and a rule as a group', () => {
    const removed = inAmbulance(deleteItem(STATE, AMBULANCE, 'rule-1'));
    expect(refusal(changeRule(removed, AMBULANCE, 'rule-1', { message: 'x' }))).toEqual({
      code: 'removed',
      message: 'Rule 01 is removed in Ambulance. Restore it first.',
      branchIndex: 1,
      itemId: 'rule-1',
    });
    expect(refusal(changeRule(STATE, 'main-id', 'group-1', {})).message).toBe(
      'Group 01 in Standard is a group, not a rule.'
    );
    expect(refusal(setGroupMessage(STATE, 'main-id', 'rule-1', '')).message).toBe(
      'Rule 01 in Standard is a rule, not a group.'
    );
  });
});

describe('duplicateRule', () => {
  it('copies a rule at the end of its level with the next number and its default name', () => {
    const { state, item: copy, propagatedTo } = done(duplicateRule(STATE, 'main-id', 'rule-2'));
    expect(copy).toEqual({ ...ageRule(5, 18), name: 'Rule 05' });
    expect(findItem(branch(state, 'main-id').items, 'rule-5')).toMatchObject({
      parentId: 'group-1',
      index: 2,
    });
    expect(state.counters).toEqual({ rule: 6, group: 2 });
    expect(propagatedTo).toEqual([AMBULANCE]);
  });

  it('marks a based variant’s duplicate as added, and refuses a removed rule', () => {
    const { state } = done(duplicateRule(STATE, AMBULANCE, 'rule-1'));
    expect(marksOf(state, AMBULANCE)).toMatchObject({ 'rule-1': null, 'rule-5': 'added' });
    const removed = inAmbulance(deleteItem(STATE, AMBULANCE, 'rule-1'));
    expect(refusal(duplicateRule(removed, AMBULANCE, 'rule-1')).message).toBe(
      'Rule 01 is removed in Ambulance. Restore it first.'
    );
  });
});

describe('deleteItem', () => {
  it('deletes a rule of Standard, which goes in the variants that follow it', () => {
    const { state, action, item: deleted, effects } = done(deleteItem(STATE, 'main-id', 'rule-1'));
    expect(action).toBe('deleted');
    expect(deleted).toEqual(MAIN.items[0]);
    expect(effects).toEqual([]);
    expect(ids(state, AMBULANCE)).toEqual(['group-1', 'rule-2', 'rule-3', 'rule-4']);
  });

  it('says which based variants keep their changed version (F14)', () => {
    const changed = inAmbulance(changeRule(STATE, AMBULANCE, 'rule-1', { name: 'Adult' }));
    const { state, effects } = done(deleteItem(changed, 'main-id', 'rule-1'));
    expect(effects).toEqual([
      { branchId: AMBULANCE, kept: [item(changed, AMBULANCE, 'rule-1')], dissolved: [] },
    ]);
    expect(item(state, AMBULANCE, 'rule-1')).toMatchObject({ name: 'Adult', mark: 'added' });
  });

  it('dissolves a group left with one rule, also where a variant changed it (rule 5)', () => {
    const switched = inAmbulance(changeGroup(STATE, AMBULANCE, 'group-1', { operator: 'and' }));
    const { state, effects } = done(deleteItem(switched, 'main-id', 'rule-2'));
    expect(ids(state, 'main-id')).toEqual(['rule-1', 'rule-3', 'rule-4']);
    expect(ids(state, AMBULANCE)).toEqual(['rule-1', 'rule-3', 'rule-4']);
    expect(effects).toEqual([
      { branchId: AMBULANCE, kept: [], dissolved: [item(switched, AMBULANCE, 'group-1')] },
    ]);
  });

  it('deletes a group with its members, or ungroups it with keepMembers', () => {
    expect(ids(done(deleteItem(STATE, 'main-id', 'group-1')).state, 'main-id')).toEqual([
      'rule-1',
      'rule-4',
    ]);
    const kept = done(deleteItem(STATE, 'main-id', 'group-1', { keepMembers: true }));
    expect(kept.action).toBe('ungrouped');
    expect(ids(kept.state, 'main-id')).toEqual(['rule-1', 'rule-2', 'rule-3', 'rule-4']);
    expect(ids(kept.state, AMBULANCE)).toEqual(['rule-1', 'rule-2', 'rule-3', 'rule-4']);
    // A rule has no members to keep: it is deleted
    expect(done(deleteItem(STATE, 'main-id', 'rule-1', { keepMembers: true })).action).toBe(
      'deleted'
    );
  });

  it('removes what a based variant inherits, and deletes only its own (FR-023)', () => {
    const removed = done(deleteItem(STATE, AMBULANCE, 'group-1'));
    expect(removed.action).toBe('removed');
    expect(removed.effects).toEqual([]);
    expect(marksOf(removed.state, AMBULANCE)).toMatchObject({
      'group-1': 'removed',
      'rule-2': null,
      'rule-3': null,
    });
    expect(ids(removed.state, 'main-id')).toEqual(ids(STATE, 'main-id'));
    const own = inAmbulance(addRule(STATE, AMBULANCE, null));
    const deleted = done(deleteItem(own, AMBULANCE, 'rule-5'));
    expect(deleted.action).toBe('deleted');
    expect(ids(deleted.state, AMBULANCE)).toEqual(ids(STATE, AMBULANCE));
  });

  it('keeps inherited rules, removed, when a group of the variant’s own is deleted', () => {
    const grouped = inAmbulance(groupItems(STATE, AMBULANCE, ['rule-1', 'rule-4']));
    const { state } = done(deleteItem(grouped, AMBULANCE, 'group-2'));
    expect(marksOf(state, AMBULANCE)).toMatchObject({ 'rule-1': 'removed', 'rule-4': 'removed' });
    expect(item(state, AMBULANCE, 'group-2')).toBeUndefined();
  });

  it('refuses an item already removed, and ungrouping an inherited group', () => {
    const removed = inAmbulance(deleteItem(STATE, AMBULANCE, 'rule-1'));
    expect(refusal(deleteItem(removed, AMBULANCE, 'rule-1'))).toEqual({
      code: 'alreadyRemoved',
      message: 'Rule 01 is already removed in Ambulance.',
      branchIndex: 1,
      itemId: 'rule-1',
    });
    expect(refusal(deleteItem(STATE, AMBULANCE, 'group-1', { keepMembers: true })).message).toBe(
      'Group 01 in Ambulance follows Standard, so it can only be ungrouped in Standard. Remove it from Ambulance instead.'
    );
    expect(refusal(deleteItem(STATE, TAXI, 'rule-1')).message).toBe(
      'Taxi has no rule or group rule-1.'
    );
  });
});

describe('ungroup', () => {
  it('puts the members in the group’s place, in the variants that follow it too (rule 8)', () => {
    const { state, item: ungrouped, effects } = done(ungroup(STATE, 'main-id', 'group-1'));
    expect(ungrouped).toEqual(MAIN.items[1]);
    expect(effects).toEqual([]);
    expect(ids(state, 'main-id')).toEqual(['rule-1', 'rule-2', 'rule-3', 'rule-4']);
    expect(ids(state, AMBULANCE)).toEqual(['rule-1', 'rule-2', 'rule-3', 'rule-4']);
  });

  it('says which based variants keep the group they changed, as their own', () => {
    const changed = inAmbulance(changeGroup(STATE, AMBULANCE, 'group-1', { name: 'Licence' }));
    const { state, effects } = done(ungroup(changed, 'main-id', 'group-1'));
    expect(effects).toEqual([
      { branchId: AMBULANCE, kept: [item(changed, AMBULANCE, 'group-1')], dissolved: [] },
    ]);
    expect(item(state, AMBULANCE, 'group-1')).toMatchObject({ name: 'Licence', mark: 'added' });
  });

  it('ungroups a based variant’s own group only', () => {
    const grouped = inAmbulance(groupItems(STATE, AMBULANCE, ['rule-1', 'rule-4']));
    expect(ids(done(ungroup(grouped, AMBULANCE, 'group-2')).state, AMBULANCE)).toEqual([
      'rule-1',
      'rule-4',
      'group-1',
      'rule-2',
      'rule-3',
    ]);
    expect(refusal(ungroup(STATE, AMBULANCE, 'group-1'))).toEqual({
      code: 'inheritedGroup',
      message:
        'Group 01 in Ambulance follows Standard, so it can only be ungrouped in Standard. Remove it from Ambulance instead.',
      branchIndex: 1,
      itemId: 'group-1',
    });
    const removed = inAmbulance(deleteItem(STATE, AMBULANCE, 'group-1'));
    expect(refusal(ungroup(removed, AMBULANCE, 'group-1')).message).toBe(
      'Group 01 is removed in Ambulance. Restore it first.'
    );
  });
});

describe('restoreItem and resetItem (FR-024)', () => {
  it('restores a removed group with the members removed inside it', () => {
    const memberRemoved = inAmbulance(deleteItem(STATE, AMBULANCE, 'rule-2'));
    const removed = inAmbulance(deleteItem(memberRemoved, AMBULANCE, 'group-1'));
    const { state, item: restored } = done(restoreItem(removed, AMBULANCE, 'group-1'));
    expect(restored.mark).toBeNull();
    expect(marksOf(state, AMBULANCE)).toMatchObject({ 'group-1': null, 'rule-2': null });
  });

  it('restores a group dissolved in the variant', () => {
    const dissolved = inAmbulance(deleteItem(STATE, AMBULANCE, 'rule-2'));
    const { state } = done(restoreItem(dissolved, AMBULANCE, 'group-1'));
    expect(marksOf(state, AMBULANCE)).toMatchObject({ 'group-1': null, 'rule-2': null });
  });

  it('resets a changed item to Standard’s content', () => {
    const changed = inAmbulance(changeRule(STATE, AMBULANCE, 'rule-1', { name: 'Adult' }));
    const { item: reset } = done(resetItem(changed, AMBULANCE, 'rule-1'));
    expect(reset).toEqual(MAIN.items[0]);
  });

  it('refuses what it can’t restore or reset, naming why', () => {
    expect(refusal(restoreItem(STATE, AMBULANCE, 'rule-1'))).toEqual({
      code: 'notRemoved',
      message: 'Rule 01 in Ambulance isn’t removed, so there is nothing to restore.',
      branchIndex: 1,
      itemId: 'rule-1',
    });
    expect(refusal(resetItem(STATE, AMBULANCE, 'rule-1')).message).toBe(
      'Rule 01 in Ambulance isn’t changed: it follows Standard already.'
    );
    const removed = inAmbulance(deleteItem(STATE, AMBULANCE, 'rule-1'));
    expect(refusal(resetItem(removed, AMBULANCE, 'rule-1')).message).toBe(
      'Rule 01 is removed in Ambulance. Restore it first.'
    );
    expect(refusal(restoreItem(STATE, 'main-id', 'rule-1'))).toEqual({
      code: 'notBased',
      message: 'Standard isn’t based on Standard, so it has nothing to reset or restore.',
      branchIndex: 0,
      itemId: null,
    });
    const own = inAmbulance(addRule(STATE, TAXI, null));
    expect(refusal(resetItem(own, TAXI, 'rule-5')).message).toBe(
      'Taxi isn’t based on Standard, so it has nothing to reset or restore.'
    );
  });
});

describe('groupItems', () => {
  it('groups rules of the top level in the first one’s place, numbered from the counters', () => {
    const {
      state,
      item: grouped,
      propagatedTo,
    } = done(groupItems(STATE, 'main-id', ['rule-4', 'rule-1']));
    expect(grouped).toMatchObject({ id: 'group-2', name: 'Group 02', operator: 'and', mark: null });
    expect(grouped.items.map((member) => member.id)).toEqual(['rule-1', 'rule-4']);
    expect(branch(state, 'main-id').items.map((entry) => entry.id)).toEqual(['group-2', 'group-1']);
    expect(state.counters).toEqual({ rule: 5, group: 3 });
    expect(item(state, AMBULANCE, 'group-2')?.mark).toBeNull();
    expect(propagatedTo).toEqual([AMBULANCE]);
  });

  it('makes a sub-group from rules of a group, and an added group in a based variant', () => {
    const sub = done(groupItems(STATE, 'main-id', ['rule-2', 'rule-3'])).item;
    expect(sub.name).toBe('Sub-group 02');
    const { state } = done(groupItems(STATE, AMBULANCE, ['rule-2', 'rule-3']));
    expect(marksOf(state, AMBULANCE)).toMatchObject({
      'group-2': 'added',
      'rule-2': null,
      'rule-3': null,
    });
    expect(item(state, 'main-id', 'group-2')).toBeUndefined();
  });

  it('sets the name, AND/OR and message as the group’s menu does', () => {
    const { item: grouped } = done(
      groupItems(STATE, 'main-id', ['rule-1', 'rule-4'], {
        name: 'Residents',
        operator: 'or',
        message: 'Live here.',
      })
    );
    expect(grouped).toMatchObject({ name: 'Residents', operator: 'or', message: 'Live here.' });
    expect(
      refusal(groupItems(STATE, 'main-id', ['rule-1', 'rule-4'], { name: 'Group 01' }))
    ).toEqual({
      code: 'nameTaken',
      message: 'There’s already a group called "Group 01" in Standard.',
      branchIndex: 0,
      itemId: 'group-2',
    });
  });

  it('refuses fewer than two rules, other levels, groups and removed rules', () => {
    const cant =
      'Choose two or more rules of one level in Standard to group. A sub-group can’t hold groups.';
    expect(refusal(groupItems(STATE, 'main-id', ['rule-1']))).toEqual({
      code: 'cantGroup',
      message: cant,
      branchIndex: 0,
      itemId: 'rule-1',
    });
    expect(refusal(groupItems(STATE, 'main-id', ['rule-1', 'rule-2'])).message).toBe(cant);
    expect(refusal(groupItems(STATE, 'main-id', ['rule-1', 'group-1'])).message).toBe(cant);
    const removed = inAmbulance(deleteItem(STATE, AMBULANCE, 'rule-1'));
    expect(refusal(groupItems(removed, AMBULANCE, ['rule-1', 'rule-4'])).message).toBe(
      'Rule 01 is removed in Ambulance. Restore it first.'
    );
  });
});

describe('switchOperator and resetOperator (FR-007, FR-021, FR-024)', () => {
  it('switches Standard’s top level, which the variants that haven’t switched theirs follow', () => {
    const {
      state,
      item: switched,
      propagatedTo,
    } = done(switchOperator(STATE, 'main-id', null, 'or'));
    expect(switched).toBeNull();
    expect(branch(state, AMBULANCE)).toMatchObject({ operator: 'or', operator_mark: null });
    expect(branch(state, TAXI).operator).toBe('and');
    expect(propagatedTo).toEqual([AMBULANCE]);
    const own = inAmbulance(switchOperator(STATE, AMBULANCE, null, 'or'));
    const later = done(switchOperator(own, 'main-id', null, 'or'));
    expect(later.propagatedTo).toEqual([]);
  });

  it('marks a based variant’s switch, and resets it to Standard’s', () => {
    const { state } = done(switchOperator(STATE, AMBULANCE, null, 'or'));
    expect(branch(state, AMBULANCE)).toMatchObject({ operator: 'or', operator_mark: 'changed' });
    const reset = done(resetOperator(state, AMBULANCE));
    expect(reset.branch).toMatchObject({ operator: 'and', operator_mark: null });
    expect(refusal(resetOperator(STATE, TAXI)).message).toBe(
      'Taxi isn’t based on Standard, so it has nothing to reset or restore.'
    );
  });

  it('switches a group as its menu does', () => {
    const { item: switched } = done(switchOperator(STATE, AMBULANCE, 'group-1', 'and'));
    expect(switched).toMatchObject({ operator: 'and', mark: 'changed' });
  });
});

describe('copyRule (FR-022)', () => {
  it('copies to other variants as new rules at the end of their top level', () => {
    const { state, copies, propagatedTo } = done(copyRule(STATE, 'main-id', 'rule-2', [TAXI]));
    expect(copies).toEqual([{ branchId: TAXI, item: { ...ageRule(5, 18), name: 'Rule 05' } }]);
    expect(ids(state, TAXI)).toEqual(['rule-5']);
    expect(state.counters).toEqual({ rule: 6, group: 2 });
    expect(propagatedTo).toEqual([]);
  });

  it('copies to Standard, which covers the variants based on it', () => {
    const { state, copies, propagatedTo } = done(
      copyRule(STATE, AMBULANCE, 'rule-1', ['main-id', TAXI])
    );
    expect(copies.map(({ branchId, item: copy }) => [branchId, copy.id, copy.mark])).toEqual([
      ['main-id', 'rule-5', null],
      [TAXI, 'rule-6', null],
    ]);
    expect(item(state, AMBULANCE, 'rule-5')?.mark).toBeNull();
    expect(propagatedTo).toEqual([AMBULANCE]);
  });

  it('refuses an unknown variant, and nothing to copy to', () => {
    expect(refusal(copyRule(STATE, 'main-id', 'rule-1', ['gone'])).message).toBe(
      'Unknown variant.'
    );
    expect(refusal(copyRule(STATE, 'main-id', 'rule-1', ['main-id']))).toEqual({
      code: 'noCopyTarget',
      message: 'Choose another variant to copy Rule 01 to.',
      branchIndex: 0,
      itemId: 'rule-1',
    });
  });
});

describe('variants (FR-019, FR-020)', () => {
  const ID = 'c8a2f1e0-1b2c-4d3e-8f40-5a6b7c8d9e0f';

  it('adds a variant based on Standard with exactly the id given', () => {
    const { state, branch: added } = done(
      addVariant(STATE, { name: ' School ', description: ' Pupils ' }, 'based', ID)
    );
    expect(added).toEqual({ ...newBranch(MAIN, 'based', 'School', 'Pupils'), id: ID });
    expect(state.branches.map((entry) => entry.id)).toEqual(['main-id', AMBULANCE, TAXI, ID]);
    expect(
      done(addVariant(STATE, { name: 'Bus', description: null }, 'empty', ID)).branch
    ).toMatchObject({ id: ID, origin: 'empty', items: [] });
  });

  it('refuses as the Add variant dialog does, and an id another variant has', () => {
    const add = (name: string, description: string | null = null, id = ID) =>
      refusal(addVariant(STATE, { name, description }, 'based', id));
    expect(add(' ambulance ')).toEqual({
      code: 'variantNameTaken',
      message: 'There’s already a variant called "Ambulance".',
      branchIndex: null,
      itemId: null,
    });
    expect(add('  ').message).toBe('Enter a name for the variant.');
    expect(add('a'.repeat(101)).message).toBe('A variant’s name can have at most 100 characters.');
    expect(add('School', 'a'.repeat(501)).message).toBe(
      'The description of School can have at most 500 characters.'
    );
    expect(add('School', null, TAXI).message).toBe('Unknown variant.');
    const full: EditState = {
      ...STATE,
      branches: [
        MAIN,
        ...Array.from({ length: 19 }, (_, index) => ({
          ...newBranch(MAIN, 'empty', `V${index}`, null),
          id: `v-${index}`,
        })),
      ],
    };
    expect(
      refusal(addVariant(full, { name: 'School', description: null }, 'based', ID)).message
    ).toBe('A connection can have at most 20 variants.');
  });

  it('renames and describes a variant, Standard too, keeping what isn’t given', () => {
    const { branch: edited } = done(
      editVariant(STATE, AMBULANCE, { name: ' Emergency ', description: '  ' })
    );
    expect(edited).toMatchObject({ name: 'Emergency', description: null });
    const described = done(editVariant(STATE, 'main-id', { description: ' Everyone ' })).branch;
    expect(described).toMatchObject({ name: 'Standard', description: 'Everyone' });
    expect(done(editVariant(STATE, AMBULANCE, { name: 'Ambulance' })).branch.name).toBe(
      'Ambulance'
    );
    expect(refusal(editVariant(STATE, AMBULANCE, { name: 'taxi' }))).toEqual({
      code: 'variantNameTaken',
      message: 'There’s already a variant called "Taxi".',
      branchIndex: 1,
      itemId: null,
    });
  });

  it('deletes a variant, never Standard', () => {
    const { state, branch: deleted } = done(deleteVariant(STATE, AMBULANCE));
    expect(deleted.id).toBe(AMBULANCE);
    expect(state.branches.map((entry) => entry.id)).toEqual(['main-id', TAXI]);
    expect(refusal(deleteVariant(STATE, 'main-id'))).toEqual({
      code: 'mainVariant',
      message: 'Standard is the main variant and can’t be deleted.',
      branchIndex: 0,
      itemId: null,
    });
    expect(refusal(deleteVariant(STATE, 'gone')).message).toBe('Unknown variant.');
  });
});

describe('rulesCheckingRemoval and removeRules (FR-029)', () => {
  const documents = [{ document_type: 'pid', fields: ['birthdate', 'address_locality'] }];
  const named = (state: EditState, removal: Parameters<typeof rulesCheckingRemoval>[1]) =>
    rulesCheckingRemoval(state.branches, removal, documents).map(
      ({ branchIndex, rule: found }) => `${found.id} in ${state.branches[branchIndex].name}`
    );

  it('names the rules of a document, a field, "All data" and dropped data, in every variant', () => {
    const field = { type: 'field', documentType: 'pid', field: 'address_locality' } as const;
    expect(named(STATE, field)).toEqual(['rule-4 in Standard', 'rule-4 in Ambulance']);
    expect(named(STATE, { type: 'document', documentType: 'pid' })).toHaveLength(8);
    expect(named(STATE, { type: 'allFields', documentType: 'pid' })).toHaveLength(8);
    expect(
      named(STATE, { type: 'dropped', items: [{ documentType: 'pid', field: 'birthdate' }] })
    ).toEqual([
      'rule-1 in Standard',
      'rule-2 in Standard',
      'rule-3 in Standard',
      'rule-1 in Ambulance',
      'rule-2 in Ambulance',
      'rule-3 in Ambulance',
    ]);
    expect(named(STATE, { type: 'document', documentType: 'mdl' })).toEqual([]);
  });

  it('leaves out rules on data already not requested', () => {
    const withoutLocality = [{ document_type: 'pid', fields: ['birthdate'] }];
    expect(
      rulesCheckingRemoval(
        STATE.branches,
        { type: 'allFields', documentType: 'pid' },
        withoutLocality
      ).map(({ rule: found }) => found.id)
    ).not.toContain('rule-4');
  });

  it('removes them from every variant as deleting them in the editor would', () => {
    const field = { type: 'field', documentType: 'pid', field: 'birthdate' } as const;
    const found = rulesCheckingRemoval(STATE.branches, field, documents).map(
      ({ branchIndex, rule: entry }) => ({
        branchId: STATE.branches[branchIndex].id ?? '',
        ruleId: entry.id,
      })
    );
    const { state, removed } = done(removeRules(STATE, found));
    expect(removed).toEqual(found);
    expect(ids(state, 'main-id')).toEqual(['rule-4']);
    expect(ids(state, AMBULANCE)).toEqual(['rule-4']);
  });

  it('keeps a variant’s own version that checks other data, and removes one that doesn’t', () => {
    const elsewhere = inAmbulance(
      changeRule(STATE, AMBULANCE, 'rule-1', { target: target('pid', 'address_locality') })
    );
    const older = inAmbulance(
      changeRule(elsewhere, AMBULANCE, 'rule-2', {
        condition: { operator: 'at_least_years_ago', years: 16 },
      })
    );
    const field = { type: 'field', documentType: 'pid', field: 'birthdate' } as const;
    const found = rulesCheckingRemoval(older.branches, field, documents).map(
      ({ branchIndex, rule: entry }) => ({
        branchId: older.branches[branchIndex].id ?? '',
        ruleId: entry.id,
      })
    );
    expect(found).toContainEqual({ branchId: AMBULANCE, ruleId: 'rule-2' });
    expect(found).not.toContainEqual({ branchId: AMBULANCE, ruleId: 'rule-1' });
    const { state } = done(removeRules(older, found));
    expect(ids(state, AMBULANCE)).toEqual(['rule-1', 'rule-4']);
    expect(marksOf(state, AMBULANCE)).toMatchObject({ 'rule-1': 'added' });
  });

  it('refuses an unknown variant or rule, and a group', () => {
    expect(refusal(removeRules(STATE, [{ branchId: 'gone', ruleId: 'rule-1' }])).message).toBe(
      'Unknown variant.'
    );
    expect(refusal(removeRules(STATE, [{ branchId: TAXI, ruleId: 'rule-1' }])).message).toBe(
      'Taxi has no rule or group rule-1.'
    );
    expect(refusal(removeRules(STATE, [{ branchId: 'main-id', ruleId: 'group-1' }])).message).toBe(
      'Group 01 in Standard is a group, not a rule.'
    );
  });
});

describe('a sequence of edits', () => {
  it('keeps the based variant in step with Standard, as branches.ts does', () => {
    let state = STATE;
    const apply = (result: EditResult) => {
      state = done(result).state;
    };
    apply(changeRule(state, AMBULANCE, 'rule-1', { name: 'Adult' }));
    apply(addRule(state, 'main-id', 'group-1'));
    apply(groupItems(state, 'main-id', ['rule-1', 'rule-4']));
    apply(deleteItem(state, AMBULANCE, 'rule-3'));
    apply(switchOperator(state, 'main-id', 'group-1', 'and'));
    apply(copyRule(state, 'main-id', 'rule-5', [TAXI]));
    expect(marksOf(state, AMBULANCE)).toEqual({
      'group-2': null,
      'rule-1': 'changed',
      'rule-4': null,
      'group-1': null,
      'rule-2': null,
      'rule-3': 'removed',
      'rule-5': null,
    });
    expect((item(state, AMBULANCE, 'group-1') as GroupItem).operator).toBe('and');
    expect(ids(state, TAXI)).toEqual(['rule-6']);
    expect(state.counters).toEqual({ rule: 7, group: 3 });
  });
});

describe('the documents’ order (spec 010, R6; FR-045)', () => {
  const PID = deepFreeze({ document_type: 'pid', fields: ['birthdate'] });
  const MDL = deepFreeze({ document_type: 'mdl', fields: ['driving_privileges'] });
  const EHIC = deepFreeze({ document_type: 'ehic', fields: [] });
  const TWO = deepFreeze([PID, MDL]);
  const THREE = deepFreeze([PID, MDL, EHIC]);
  const keys = (documents: { document_type: string }[]) =>
    documents.map((document) => document.document_type);
  const moved = (result: ReturnType<typeof moveDocument<(typeof THREE)[number]>>) => {
    expect(result.ok).toBe(true);
    return result.ok ? keys(result.documents) : [];
  };
  const refused = (result: ReturnType<typeof moveDocument<(typeof THREE)[number]>>) => {
    expect(result.ok).toBe(false);
    return result.ok ? null : result.refusal;
  };

  describe('moveDocument', () => {
    it('swaps two documents either way', () => {
      expect(moved(moveDocument(TWO, 'pid', 1))).toEqual(['mdl', 'pid']);
      expect(moved(moveDocument(TWO, 'mdl', 0))).toEqual(['mdl', 'pid']);
    });

    it('moves one of three up, down and across the list, the others keeping their order', () => {
      expect(moved(moveDocument(THREE, 'pid', 2))).toEqual(['mdl', 'ehic', 'pid']);
      expect(moved(moveDocument(THREE, 'pid', 1))).toEqual(['mdl', 'pid', 'ehic']);
      expect(moved(moveDocument(THREE, 'ehic', 0))).toEqual(['ehic', 'pid', 'mdl']);
      expect(moved(moveDocument(THREE, 'ehic', 1))).toEqual(['pid', 'ehic', 'mdl']);
      expect(moved(moveDocument(THREE, 'mdl', 0))).toEqual(['mdl', 'pid', 'ehic']);
      expect(moved(moveDocument(THREE, 'mdl', 2))).toEqual(['pid', 'ehic', 'mdl']);
    });

    it('keeps each document as it is, fields included', () => {
      const result = moveDocument(THREE, 'pid', 2);
      expect(result.ok && result.documents).toEqual([MDL, EHIC, PID]);
      expect(result.ok && result.documents[2]).toBe(PID);
    });

    it('refuses a document the list doesn’t hold', () => {
      expect(refused(moveDocument(THREE, 'photo_id', 0))).toEqual({
        code: 'documentNotRequested',
        message: 'The connection doesn’t request “photo_id”.',
        branchIndex: null,
        itemId: null,
      });
    });

    it('refuses an index outside the list, counting positions from 1', () => {
      for (const index of [-1, 3, 1.5, Number.NaN]) {
        expect(refused(moveDocument(THREE, 'pid', index))).toMatchObject({
          code: 'positionOutside',
          message: 'Choose a position from 1 to 3.',
        });
      }
      expect(refused(moveDocument(TWO, 'mdl', 2))?.message).toBe('Choose a position from 1 to 2.');
    });

    it('refuses the place the document already has', () => {
      expect(refused(moveDocument(TWO, 'pid', 0))).toMatchObject({
        code: 'alreadyInPosition',
        message: '“pid” is already in position 1.',
      });
      expect(refused(moveDocument(THREE, 'ehic', 2))?.message).toBe(
        '“ehic” is already in position 3.'
      );
      expect(refused(moveDocument([PID], 'pid', 0))?.code).toBe('alreadyInPosition');
    });

    it('has its refusals in German too', () => {
      const german = EDIT_MESSAGES.de;
      expect(german.documentNotRequested('photo_id')).toBe(
        'Die Anbindung fordert „photo_id“ nicht an.'
      );
      expect(german.positionOutside(3)).toBe('Wählen Sie eine Position von 1 bis 3.');
      expect(german.alreadyInPosition('pid', 1)).toBe('„pid“ ist bereits auf Position 1.');
    });
  });

  describe('appendDocument', () => {
    it('puts a new document at the end of two and of three', () => {
      expect(keys(appendDocument([PID], MDL))).toEqual(['pid', 'mdl']);
      expect(keys(appendDocument([EHIC, PID], MDL))).toEqual(['ehic', 'pid', 'mdl']);
      expect(keys(appendDocument([], PID))).toEqual(['pid']);
    });

    it('replaces a document already there in its place', () => {
      const changed = { document_type: 'pid', fields: ['birthdate', 'family_name'] };
      expect(appendDocument(TWO, changed)).toEqual([changed, MDL]);
      const middle = { document_type: 'mdl', fields: [] };
      expect(appendDocument(THREE, middle)).toEqual([PID, middle, EHIC]);
    });
  });

  describe('restoreDocument', () => {
    it('puts a removed document back at the index it had', () => {
      expect(keys(restoreDocument([MDL], PID, 0))).toEqual(['pid', 'mdl']);
      expect(keys(restoreDocument([PID], MDL, 1))).toEqual(['pid', 'mdl']);
      expect(keys(restoreDocument([PID, EHIC], MDL, 1))).toEqual(['pid', 'mdl', 'ehic']);
      expect(keys(restoreDocument([MDL, EHIC], PID, 0))).toEqual(['pid', 'mdl', 'ehic']);
      expect(keys(restoreDocument([PID, MDL], EHIC, 2))).toEqual(['pid', 'mdl', 'ehic']);
    });

    it('clamps the index to the list', () => {
      expect(keys(restoreDocument([PID], EHIC, 2))).toEqual(['pid', 'ehic']);
      expect(keys(restoreDocument([PID, MDL], EHIC, 7))).toEqual(['pid', 'mdl', 'ehic']);
      expect(keys(restoreDocument([PID, MDL], EHIC, -1))).toEqual(['ehic', 'pid', 'mdl']);
      expect(keys(restoreDocument([], EHIC, 1))).toEqual(['ehic']);
    });

    it('answers a list that holds the document already as it is', () => {
      expect(restoreDocument(THREE, { document_type: 'mdl', fields: [] }, 0)).toEqual(THREE);
    });

    it('undoes a removal: remove, then restore at the old index', () => {
      const index = THREE.indexOf(MDL);
      const without = THREE.filter((document) => document !== MDL);
      expect(restoreDocument(without, MDL, index)).toEqual(THREE);
    });
  });

  it('never changes its inputs', () => {
    // Frozen inputs throw on a change; the lists are compared too
    const documents = deepFreeze([PID, MDL, EHIC]);
    moveDocument(documents, 'pid', 2);
    moveDocument(documents, 'pid', 9);
    appendDocument(documents, deepFreeze({ document_type: 'photo_id', fields: [] }));
    appendDocument(documents, deepFreeze({ document_type: 'mdl', fields: [] }));
    restoreDocument(deepFreeze([PID]), MDL, 0);
    expect(documents).toEqual([PID, MDL, EHIC]);
    expect(MDL).toEqual({ document_type: 'mdl', fields: ['driving_privileges'] });
  });
});
