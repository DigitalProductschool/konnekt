import { describe, expect, it } from 'vitest';

import type { GroupItem, RuleTreeItem } from '../../../types/form-connections';
import type { BannerLine, FindingsBanner } from '../../../utils/rules/checks/types';
import { rule } from '../../../utils/rules/testData';
import { findItem, flattenItems } from '../../../utils/rules/tree';
import type { RulesAction, RulesState } from './types';
import {
  bannerViewOf,
  copyTargetsOf,
  deleteDialogText,
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

  it('keeps the Undo after its toast has gone, for Ctrl/Cmd+Z (B4)', () => {
    const deleted = run(
      stateWith(FLAT),
      { type: 'askDelete', branchKey: BRANCH, ruleId: 'rule-1' },
      { type: 'confirmDelete' }
    );
    const timedOut = run(deleted, { type: 'dismissToast' });
    expect(timedOut.toast).toBeNull();
    expect(timedOut.undo).toEqual(deleted.undo);
    expect(run(timedOut, { type: 'undo' }).branches[0].items).toEqual(FLAT);
  });

  it('drops the kept Undo with the next change (B4)', () => {
    const changed = run(
      stateWith(FLAT),
      { type: 'askDelete', branchKey: BRANCH, ruleId: 'rule-1' },
      { type: 'confirmDelete' },
      { type: 'dismissToast' },
      { type: 'startRename', branchKey: BRANCH, itemId: 'rule-2' },
      { type: 'rename', name: 'Old enough' }
    );
    expect(changed.undo).toBeNull();
    expect(changed.toast).toBeNull();
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

describe('variants (FR-019 to FR-024)', () => {
  const items = [rule(1, null, null), group(1, [rule(2, null, null), rule(3, null, null)])];
  /** Standard with these items and a variant "Ambulance" based on it, open. */
  function withVariant(origin: 'based' | 'empty' = 'based'): RulesState {
    return run(stateWith(items), {
      type: 'addVariant',
      variant: { name: ' Ambulance ', description: ' For ambulances ' },
      origin,
    });
  }
  const variantKey = (state: RulesState) => state.branches[1].key;
  const item = (state: RulesState, index: number, id: string) =>
    findItem(state.branches[index].items, id)?.item;

  it('adds a variant based on Standard, or empty, and opens it', () => {
    const based = withVariant();
    expect(based.branches[1]).toMatchObject({
      key: 'new-1',
      id: null,
      name: 'Ambulance',
      description: 'For ambulances',
      origin: 'based',
      items,
    });
    expect(based.openBranch).toBe('new-1');
    expect(withVariant('empty').branches[1].items).toEqual([]);
    const another = run(based, {
      type: 'addVariant',
      variant: { name: 'Taxi', description: null },
      origin: 'empty',
    });
    expect(another.branches.map((branch) => branch.key)).toEqual(['main', 'new-1', 'new-2']);
  });

  it('passes Standard’s changes to based variants at once (W4)', () => {
    const state = withVariant();
    const added = run(
      state,
      { type: 'addRule', branchKey: BRANCH, parentId: null },
      { type: 'saveRule' }
    );
    expect(item(added, 1, 'rule-9')).toMatchObject({ mark: null });
    const renamed = run(
      added,
      { type: 'startRename', branchKey: BRANCH, itemId: 'rule-1' },
      { type: 'rename', name: 'Old enough' }
    );
    expect(item(renamed, 1, 'rule-1')).toMatchObject({ name: 'Old enough', mark: null });
    expect(
      run(
        withVariant('empty'),
        { type: 'addRule', branchKey: BRANCH, parentId: null },
        { type: 'saveRule' }
      ).branches[1].items
    ).toEqual([]);
  });

  it('marks what a based variant changes, and follows again on Reset to Standard', () => {
    const state = withVariant();
    const key = variantKey(state);
    const renamed = run(
      state,
      { type: 'startRename', branchKey: key, itemId: 'rule-1' },
      { type: 'rename', name: 'Old enough' }
    );
    expect(item(renamed, 1, 'rule-1')).toMatchObject({ mark: 'changed', name: 'Old enough' });
    expect(item(renamed, 0, 'rule-1')).toMatchObject({ name: 'Rule 01' });
    const reset = run(renamed, { type: 'resetItem', branchKey: key, itemId: 'rule-1' });
    expect(item(reset, 1, 'rule-1')).toMatchObject({ mark: null, name: 'Rule 01' });
    const switched = run(state, {
      type: 'switchOperator',
      branchKey: key,
      parentId: null,
      operator: 'or',
    });
    expect(switched.branches[1]).toMatchObject({ operator: 'or', operator_mark: 'changed' });
    expect(run(switched, { type: 'resetOperator', branchKey: key }).branches[1]).toMatchObject({
      operator: 'and',
      operator_mark: null,
    });
  });

  it('removes and restores inherited items, and adds the variant’s own as added', () => {
    const state = withVariant();
    const key = variantKey(state);
    const removed = run(state, { type: 'removeItem', branchKey: key, itemId: 'group-1' });
    expect(item(removed, 1, 'group-1')?.mark).toBe('removed');
    expect(
      item(run(removed, { type: 'restoreItem', branchKey: key, itemId: 'group-1' }), 1, 'group-1')
        ?.mark
    ).toBeNull();
    const added = run(
      state,
      { type: 'addRule', branchKey: key, parentId: 'group-1' },
      { type: 'saveRule' }
    );
    expect(item(added, 1, 'rule-9')?.mark).toBe('added');
    expect(item(added, 0, 'rule-9')).toBeUndefined();
  });

  it('groups in a based variant with F29’s toast', () => {
    const state = withVariant();
    const key = variantKey(state);
    const grouped = run(
      state,
      { type: 'startSelect', branchKey: key, itemId: 'rule-2' },
      { type: 'toggleSelect', itemId: 'rule-3' },
      { type: 'groupSelected' }
    );
    expect(item(grouped, 1, 'group-3')?.mark).toBe('added');
    expect(grouped.toast?.message).toBe(
      'Rule 02 and Rule 03 in Ambulance are now Sub-group 03. Standard stays the same.'
    );
  });

  it('undoes a deletion in Standard in every variant', () => {
    const state = withVariant();
    const deleted = run(
      state,
      { type: 'askDelete', branchKey: BRANCH, ruleId: 'rule-1' },
      { type: 'confirmDelete' }
    );
    expect(item(deleted, 1, 'rule-1')).toBeUndefined();
    const undone = run(deleted, { type: 'undo' });
    expect(undone.branches).toEqual(state.branches);
    expect(undone.openBranch).toBe(BRANCH);
  });

  it('renames a variant and deletes it, opening Standard', () => {
    const state = withVariant();
    const key = variantKey(state);
    const edited = run(state, {
      type: 'editVariant',
      branchKey: key,
      variant: { name: 'School transport ', description: '  ' },
    });
    expect(edited.branches[1]).toMatchObject({ name: 'School transport', description: null });
    const asked = run(edited, { type: 'askDeleteVariant', branchKey: key });
    expect(asked.dialog).toEqual({ type: 'deleteVariant', branchKey: key });
    const deleted = run(asked, { type: 'confirmDelete' });
    expect(deleted.branches.map((branch) => branch.key)).toEqual([BRANCH]);
    expect(deleted.openBranch).toBe(BRANCH);
    expect(
      run(state, { type: 'askDeleteVariant', branchKey: BRANCH }, { type: 'confirmDelete' })
        .branches
    ).toHaveLength(2);
  });

  it('copies a rule to other variants with a toast whose Show opens the first (F29)', () => {
    const state = run(withVariant('empty'), {
      type: 'addVariant',
      variant: { name: 'School transport', description: null },
      origin: 'based',
    });
    const copied = run(
      state,
      { type: 'askCopyRule', branchKey: BRANCH, ruleId: 'rule-1' },
      { type: 'copyRule', targets: ['new-1', 'new-2'] }
    );
    expect(item(copied, 1, 'rule-9')).toMatchObject({ name: 'Rule 09', mark: null });
    expect(item(copied, 2, 'rule-10')).toMatchObject({ name: 'Rule 10', mark: 'added' });
    expect(copied.counters).toEqual({ rule: 11, group: 3 });
    expect(copied.toast).toMatchObject({
      message: 'Rule 01 copied to Ambulance and School transport.',
      actionLabel: 'Show',
    });
    expect(copied.showBranch).toBe('new-1');
    expect(copied.dialog).toBeNull();
  });

  it('closes "Copy to variant" without copying (bug copy-popover-cancel-crash)', () => {
    const state = withVariant('empty');
    const asked = run(state, { type: 'askCopyRule', branchKey: BRANCH, ruleId: 'rule-1' });
    const closed = run(asked, { type: 'closeDialog' });
    expect(closed).toEqual({ ...asked, dialog: null });
    expect(closed.branches).toEqual(state.branches);
    expect(closed.counters).toEqual(state.counters);
    expect(closed.toast).toEqual(state.toast);
  });

  it('drops the copy toast’s Show with the next change, as an Undo is dropped', () => {
    const copied = run(
      withVariant('empty'),
      { type: 'askCopyRule', branchKey: BRANCH, ruleId: 'rule-1' },
      { type: 'copyRule', targets: ['new-1'] }
    );
    const renamed = run(
      copied,
      { type: 'startRename', branchKey: BRANCH, itemId: 'rule-2' },
      { type: 'rename', name: 'Old enough' }
    );
    expect(renamed.toast).toEqual({ ...copied.toast, actionLabel: undefined });
  });

  it('drops the Show with its toast, which has no shortcut (B4)', () => {
    const timedOut = run(
      withVariant('empty'),
      { type: 'askCopyRule', branchKey: BRANCH, ruleId: 'rule-1' },
      { type: 'copyRule', targets: ['new-1'] },
      { type: 'dismissToast' }
    );
    expect(timedOut.toast).toBeNull();
    expect(timedOut.showBranch).toBeNull();
  });
});

describe('Standard’s delete confirmations (F14, W8; design-notes §4 and §5)', () => {
  const items = [rule(1, null, null), group(1, [rule(2, null, null), rule(3, null, null)])];
  function withVariants(...origins: ('based' | 'empty')[]): RulesState {
    return run(
      stateWith(items),
      ...origins.map((origin, index): RulesAction => ({
        type: 'addVariant',
        variant: { name: ['Ambulance', 'School transport', 'Taxi'][index], description: null },
        origin,
      }))
    );
  }
  const text = (state: RulesState, itemId: string, statement: string | null = null) =>
    deleteDialogText(state, { branchKey: BRANCH, itemId }, statement);

  it('keeps U14’s body without variants based on Standard, and in a variant', () => {
    expect(
      text(stateWith(items), 'rule-1', 'Personal ID – Date of birth (Age) is at least 21 years old')
    ).toBe(
      'Applicants will no longer be checked for “Personal ID – Date of birth (Age) is at least 21 years old”. You can undo this right after.'
    );
    expect(text(withVariants('empty'), 'rule-1')).toBe('You can undo this right after.');
    const state = withVariants('based');
    expect(deleteDialogText(state, { branchKey: 'new-1', itemId: 'group-1' }, null)).toBe(
      'Group 01 and the rules in it will be deleted. You can undo this right after.'
    );
  });

  it('names the variants that changed the rule and keep their version', () => {
    const state = withVariants('based', 'based');
    expect(text(state, 'rule-1')).toBe(
      'This rule will be removed from Standard and from the variants that follow it. You can undo this right after.'
    );
    const changed = run(
      state,
      { type: 'startRename', branchKey: 'new-1', itemId: 'rule-1' },
      { type: 'rename', name: 'Old enough' }
    );
    expect(text(changed, 'rule-1')).toBe(
      'This rule will be removed from Standard and from the variants that follow it. Ambulance changed it and keeps its own version. You can undo this right after.'
    );
    const both = run(
      changed,
      { type: 'startRename', branchKey: 'new-2', itemId: 'rule-1' },
      { type: 'rename', name: 'Of age' }
    );
    expect(text(both, 'rule-1')).toContain(
      'Ambulance and School transport changed it and keep their own versions.'
    );
  });

  it('names the variants whose changed group a deletion dissolves (FR-022’s one exception)', () => {
    const switched = run(withVariants('based'), {
      type: 'switchOperator',
      branchKey: 'new-1',
      parentId: 'group-1',
      operator: 'or',
    });
    expect(text(switched, 'rule-2')).toBe(
      'This rule will be removed from Standard and from the variants that follow it. Group 01 is left with one rule, so it’s ungrouped in Standard and its variants. Ambulance’s changes to Group 01 go with it. You can undo this right after.'
    );
  });

  it('names the changed rules of a deleted group', () => {
    const changed = run(
      withVariants('based'),
      { type: 'startRename', branchKey: 'new-1', itemId: 'rule-3' },
      { type: 'rename', name: 'Held B' }
    );
    expect(text(changed, 'group-1')).toBe(
      'This group and the rules in it will be removed from Standard and from the variants that follow them. Ambulance changed Rule 03 and keeps its own version. You can undo this right after.'
    );
  });
});

describe('copy targets (FR-022; U20)', () => {
  it('lists every other variant, and includes those based on Standard once it is chosen', () => {
    const state = run(
      stateWith(FLAT),
      { type: 'addVariant', variant: { name: 'Ambulance', description: null }, origin: 'based' },
      { type: 'addVariant', variant: { name: 'Taxi', description: null }, origin: 'empty' }
    );
    const summary = (chosen: string[]) =>
      copyTargetsOf(state, 'new-2', chosen).map(({ branch, included, hint }) => [
        branch.key,
        included,
        hint,
      ]);
    expect(summary([])).toEqual([
      ['main', false, true],
      ['new-1', false, false],
    ]);
    expect(summary(['main'])).toEqual([
      ['main', false, true],
      ['new-1', true, false],
    ]);
    expect(copyTargetsOf(state, BRANCH, []).map(({ branch }) => branch.key)).toEqual([
      'new-1',
      'new-2',
    ]);
  });
});

describe('bannerViewOf', () => {
  const rule1 = { itemId: 'rule-1', name: 'Rule 01' };
  const rule2 = { itemId: 'rule-2', name: 'Rule 02' };
  const group2 = { itemId: 'group-2', name: 'Sub-group 01' };
  const rule4 = { itemId: 'rule-4', name: 'Rule 04' };
  const rule5 = { itemId: 'rule-5', name: 'Rule 05' };
  const U01_LINE: BannerLine = {
    kind: 'conflicting',
    tone: 'warning',
    parts: [rule1, ' and ', rule2, ' can’t be met together.'],
  };
  const U05_LINE: BannerLine = {
    kind: 'conflicting',
    tone: 'warning',
    parts: [group2, ': ', rule4, ' and ', rule5, ' can’t be met together.'],
  };
  const NOTICE = {
    tone: 'warning' as const,
    text: 'No applicant can meet the rules of Standard.',
    appended: 'So no applicant can meet the rules of Standard.',
  };
  const INCOMPLETE =
    'The rules of Standard couldn’t be checked completely. Only findings that are certain are shown.';

  function banner(changes: Partial<FindingsBanner>): FindingsBanner {
    return {
      kind: 'warning',
      lines: [],
      counts: '',
      notice: null,
      incomplete: null,
      head: [],
      ...changes,
    };
  }

  it('shows one line with its kind text and no items, expanded or not (U01)', () => {
    const head = [...U01_LINE.parts, ' So no applicant can meet the rules of Standard.'];
    const u01 = banner({ lines: [U01_LINE], notice: NOTICE, head });
    for (const expanded of [false, true]) {
      expect(bannerViewOf(u01, expanded)).toEqual({
        state: 'single',
        summary: { key: 'summary', tone: 'warning', kindText: 'Conflicting:', parts: head },
        items: [],
      });
    }
  });

  it('shows the notice or FR-010’s sentence alone without a kind text (W12, W17)', () => {
    const alone = banner({ kind: 'info', incomplete: INCOMPLETE, head: [INCOMPLETE] });
    expect(bannerViewOf(alone, false)).toMatchObject({
      state: 'single',
      summary: { tone: 'info', kindText: null, parts: [INCOMPLETE] },
    });
  });

  const counts = '3 rules can’t be met together';
  const two = banner({
    lines: [U01_LINE, U05_LINE],
    counts,
    notice: NOTICE,
    incomplete: INCOMPLETE,
    head: [`${counts} · couldn’t be checked completely. ${NOTICE.appended}`],
  });

  it('is collapsed by default with two lines, showing the head (U02, W17)', () => {
    expect(bannerViewOf(two, false)).toEqual({
      state: 'collapsed',
      summary: { key: 'summary', tone: 'warning', kindText: null, parts: two.head },
      items: [],
    });
  });

  it('lists the lines, then the notice and FR-010’s sentence when expanded (U05)', () => {
    const view = bannerViewOf(two, true);
    expect(view.state).toBe('expanded');
    expect(view.summary).toMatchObject({ kindText: null, parts: [counts] });
    expect(view.items).toEqual([
      { key: 'line-0', tone: 'warning', kindText: 'Conflicting:', parts: U01_LINE.parts },
      { key: 'line-1', tone: 'warning', kindText: 'Conflicting:', parts: U05_LINE.parts },
      { key: 'notice', tone: 'warning', kindText: null, parts: [NOTICE.text] },
      { key: 'incomplete', tone: 'info', kindText: null, parts: [INCOMPLETE] },
    ]);
  });
});

describe('toggleFindings', () => {
  it('opens and closes each variant’s banner on its own, starting closed', () => {
    const start = initialRulesState();
    expect(start.expandedFindings).toEqual([]);
    const open = rulesReducer(start, { type: 'toggleFindings', branchKey: 'main' });
    expect(open.expandedFindings).toEqual(['main']);
    const both = rulesReducer(open, { type: 'toggleFindings', branchKey: 'new-1' });
    expect(both.expandedFindings).toEqual(['main', 'new-1']);
    expect(
      rulesReducer(both, { type: 'toggleFindings', branchKey: 'main' }).expandedFindings
    ).toEqual(['new-1']);
  });
});
