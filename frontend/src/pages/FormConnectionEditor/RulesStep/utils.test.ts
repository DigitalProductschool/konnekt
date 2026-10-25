import { describe, expect, it } from 'vitest';

import type { GroupItem, RuleTreeItem } from '../../../types/form-connections';
import { rule } from '../../../utils/rules/testData';
import { findItem, flattenItems } from '../../../utils/rules/tree';
import type { RulesAction, RulesState } from './types';
import {
  initialRulesState,
  joinNames,
  neighbourOf,
  rulesReducer,
  selectionText,
  switchNoteOf,
} from './utils';

function group(number: number, items: RuleTreeItem[], name = `Group 0${number}`): GroupItem {
  return {
    type: 'group',
    id: `group-${number}`,
    name,
    mark: null,
    operator: 'and',
    message: null,
    items,
  };
}

/** A new connection's state with these items in Standard, numbering from rule 9 and group 3. */
function stateWith(items: RuleTreeItem[]): RulesState {
  const state = initialRulesState();
  const [main] = state.branches;
  return { ...state, branches: [{ ...main, items }], counters: { rule: 9, group: 3 } };
}

function run(state: RulesState, ...actions: RulesAction[]): RulesState {
  return actions.reduce(rulesReducer, state);
}

function ids(state: RulesState): string[] {
  return flattenItems(state.branches[0].items).map((item) => item.id);
}

const FLAT = [1, 2, 3].map((n) => rule(n, null, null));
const BRANCH = 'main';

describe('grouping in select mode (FR-008; U16)', () => {
  it('starts with the rule chosen, and groups two or more rules with F29’s toast', () => {
    const selecting = run(
      stateWith(FLAT),
      { type: 'startSelect', branchKey: BRANCH, itemId: 'rule-2' },
      { type: 'toggleSelect', itemId: 'rule-3' }
    );
    expect(selecting.selection).toEqual({
      branchKey: BRANCH,
      parentId: null,
      ids: ['rule-2', 'rule-3'],
    });
    const grouped = run(selecting, { type: 'groupSelected' });
    expect(ids(grouped)).toEqual(['rule-1', 'group-3', 'rule-2', 'rule-3']);
    expect(grouped.selection).toBeNull();
    expect(grouped.counters).toEqual({ rule: 9, group: 4 });
    expect(grouped.toast).toMatchObject({
      message: 'Rule 02 and Rule 03 in Standard are now Group 03.',
      actionLabel: 'Undo',
    });
  });

  it('undoes a grouping and gives its number back', () => {
    const grouped = run(
      stateWith(FLAT),
      { type: 'startSelect', branchKey: BRANCH, itemId: 'rule-3' },
      { type: 'toggleSelect', itemId: 'rule-1' },
      { type: 'groupSelected' }
    );
    const undone = run(grouped, { type: 'undo' });
    expect(undone.branches[0].items).toEqual(FLAT);
    expect(undone.counters).toEqual({ rule: 9, group: 3 });
    expect(undone.toast).toBeNull();
  });

  it('makes a sub-group from rules of a group', () => {
    const items = [group(1, FLAT)];
    const grouped = run(
      stateWith(items),
      { type: 'startSelect', branchKey: BRANCH, itemId: 'rule-1' },
      { type: 'toggleSelect', itemId: 'rule-2' },
      { type: 'groupSelected' }
    );
    expect(findItem(grouped.branches[0].items, 'group-3')).toMatchObject({
      parentId: 'group-1',
      item: { name: 'Sub-group 03' },
    });
  });

  it('groups nothing with fewer than two rules, and ends select mode on Cancel', () => {
    const one = run(stateWith(FLAT), { type: 'startSelect', branchKey: BRANCH, itemId: 'rule-1' });
    expect(run(one, { type: 'groupSelected' })).toBe(one);
    expect(run(one, { type: 'toggleSelect', itemId: 'rule-1' }).selection?.ids).toEqual([]);
    expect(run(one, { type: 'cancelSelect' }).selection).toBeNull();
  });

  it('says what is chosen and what grouping makes', () => {
    const state = stateWith([group(1, FLAT)]);
    const branch = state.branches[0];
    expect(selectionText({ branchKey: BRANCH, parentId: null, ids: [] }, branch)).toBe(
      'Select two or more rules to group.'
    );
    expect(selectionText({ branchKey: BRANCH, parentId: 'group-1', ids: ['rule-2'] }, branch)).toBe(
      'Select at least one more rule to group with Rule 02.'
    );
    expect(
      selectionText({ branchKey: BRANCH, parentId: 'group-1', ids: ['rule-2', 'rule-1'] }, branch)
    ).toBe('2 rules selected. They become a sub-group of Group 01.');
    expect(selectionText({ branchKey: BRANCH, parentId: null, ids: ['a', 'b', 'c'] }, branch)).toBe(
      '3 rules selected'
    );
  });

  it('lists names as the toasts do', () => {
    expect(joinNames(['Rule 01'])).toBe('Rule 01');
    expect(joinNames(['Rule 01', 'Rule 02'])).toBe('Rule 01 and Rule 02');
    expect(joinNames(['Rule 01', 'Rule 02', 'Rule 03'])).toBe('Rule 01, Rule 02 and Rule 03');
  });
});

describe('ungrouping and deleting groups (FR-008; W8)', () => {
  const items = [rule(1, null, null), group(1, [rule(2, null, null), rule(3, null, null)])];

  it('ungroups with an Undo toast', () => {
    const ungrouped = run(stateWith(items), {
      type: 'ungroup',
      branchKey: BRANCH,
      groupId: 'group-1',
    });
    expect(ids(ungrouped)).toEqual(['rule-1', 'rule-2', 'rule-3']);
    expect(ungrouped.toast).toMatchObject({
      message: 'Group 01 in Standard ungrouped.',
      actionLabel: 'Undo',
    });
    expect(run(ungrouped, { type: 'undo' }).branches[0].items).toEqual(items);
  });

  it('deletes a group with its members after the question, with an Undo toast', () => {
    const asked = run(stateWith(items), {
      type: 'askDeleteGroup',
      branchKey: BRANCH,
      groupId: 'group-1',
    });
    expect(asked.dialog).toEqual({ type: 'deleteGroup', branchKey: BRANCH, groupId: 'group-1' });
    const deleted = run(asked, { type: 'confirmDelete' });
    expect(ids(deleted)).toEqual(['rule-1']);
    expect(deleted.toast).toMatchObject({
      message: 'Group 01 in Standard deleted.',
      actionLabel: 'Undo',
    });
    expect(run(deleted, { type: 'undo' }).branches[0].items).toEqual(items);
  });

  it('dissolves a group when a member is deleted below two, and undoes it (US2-AS7)', () => {
    const deleted = run(
      stateWith(items),
      { type: 'askDelete', branchKey: BRANCH, ruleId: 'rule-2' },
      { type: 'confirmDelete' }
    );
    expect(ids(deleted)).toEqual(['rule-1', 'rule-3']);
    expect(deleted.toast?.message).toBe('Rule 02 in Standard deleted.');
    expect(run(deleted, { type: 'undo' }).branches[0].items).toEqual(items);
  });

  it('closes the editor of a rule deleted with its group', () => {
    const editing = run(stateWith(items), {
      type: 'editRule',
      branchKey: BRANCH,
      ruleId: 'rule-3',
    });
    expect(editing.editing?.parentId).toBe('group-1');
    const deleted = run(
      editing,
      { type: 'askDeleteGroup', branchKey: BRANCH, groupId: 'group-1' },
      { type: 'confirmDelete' }
    );
    expect(deleted.editing).toBeNull();
  });

  it('focuses the next item of the level, or the one before it', () => {
    const state = stateWith(items);
    expect(neighbourOf(state, BRANCH, 'rule-2')).toBe('rule-3');
    expect(neighbourOf(state, BRANCH, 'rule-3')).toBe('rule-2');
    expect(neighbourOf(state, BRANCH, 'group-1')).toBe('rule-1');
    expect(neighbourOf(stateWith([rule(1, null, null)]), BRANCH, 'rule-1')).toBeNull();
  });
});

describe('undo after other changes', () => {
  it('drops the Undo once the rules change otherwise, keeping the toast without its action', () => {
    const deleted = run(
      stateWith(FLAT),
      { type: 'askDelete', branchKey: BRANCH, ruleId: 'rule-1' },
      { type: 'confirmDelete' }
    );
    const renamed = run(
      deleted,
      { type: 'startRename', branchKey: BRANCH, itemId: 'rule-2' },
      { type: 'rename', name: 'Old enough' }
    );
    expect(renamed.undo).toBeNull();
    expect(renamed.toast).toEqual({ ...deleted.toast, actionLabel: undefined });
  });
});

describe('switching AND and OR (FR-007)', () => {
  it('switches the top level, the branch’s operator, with the note under it', () => {
    const switched = run(stateWith(FLAT), {
      type: 'switchOperator',
      branchKey: BRANCH,
      parentId: null,
      operator: 'or',
    });
    expect(switched.branches[0].operator).toBe('or');
    expect(switchNoteOf(switched, switched.branches[0], null)).toBe(
      'Standard now needs only one rule to be true.'
    );
    expect(switchNoteOf(switched, switched.branches[0], 'group-1')).toBeNull();
  });

  it('switches a group, and drops the note with the next change', () => {
    const switched = run(stateWith([group(1, FLAT)]), {
      type: 'switchOperator',
      branchKey: BRANCH,
      parentId: 'group-1',
      operator: 'or',
    });
    expect(findItem(switched.branches[0].items, 'group-1')?.item).toMatchObject({ operator: 'or' });
    expect(switchNoteOf(switched, switched.branches[0], 'group-1')).toBe(
      'Group 01 now needs only one rule to be true.'
    );
    const back = run(switched, {
      type: 'switchOperator',
      branchKey: BRANCH,
      parentId: 'group-1',
      operator: 'and',
    });
    expect(switchNoteOf(back, back.branches[0], 'group-1')).toBe(
      'Group 01 now needs all its rules to be true.'
    );
    const renamed = run(
      back,
      { type: 'startRename', branchKey: BRANCH, itemId: 'rule-1' },
      { type: 'rename', name: 'Old enough' }
    );
    expect(renamed.switched).toBeNull();
  });
});

describe('a group’s own message (FR-004; W6)', () => {
  it('adds, changes and removes it', () => {
    const state = stateWith([group(1, FLAT)]);
    const message = (current: RulesState) =>
      (findItem(current.branches[0].items, 'group-1')?.item as GroupItem).message;
    const added = run(state, {
      type: 'setGroupMessage',
      branchKey: BRANCH,
      groupId: 'group-1',
      message: '',
    });
    expect(message(added)).toBe('');
    const typed = run(added, {
      type: 'setGroupMessage',
      branchKey: BRANCH,
      groupId: 'group-1',
      message: 'You must meet one of these.',
    });
    expect(message(typed)).toBe('You must meet one of these.');
    expect(
      message(
        run(typed, {
          type: 'setGroupMessage',
          branchKey: BRANCH,
          groupId: 'group-1',
          message: null,
        })
      )
    ).toBeNull();
  });
});

describe('adding a rule in a group', () => {
  it('puts the new rule at the end of its group, or of the top level once the group is gone', () => {
    const items = [group(1, [rule(1, null, null), rule(2, null, null)])];
    const adding = run(stateWith(items), {
      type: 'addRule',
      branchKey: BRANCH,
      parentId: 'group-1',
    });
    expect(adding.editing).toMatchObject({ parentId: 'group-1', draft: { id: 'rule-9' } });
    expect(findItem(run(adding, { type: 'saveRule' }).branches[0].items, 'rule-9')).toMatchObject({
      parentId: 'group-1',
      index: 2,
    });
    const ungrouped = run(adding, { type: 'ungroup', branchKey: BRANCH, groupId: 'group-1' });
    expect(
      findItem(run(ungrouped, { type: 'saveRule' }).branches[0].items, 'rule-9')
    ).toMatchObject({
      parentId: null,
      index: 2,
    });
  });
});
