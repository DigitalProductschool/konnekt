import type { GroupItem, RuleTreeItem } from '@connection-portal/api-types/form-connections';
import type { BannerLine, FindingsBanner } from '@connection-portal/rules/checks/types';
import * as edits from '@connection-portal/rules/edits';
import { rule } from '@connection-portal/rules/testData';
import { findItem, flattenItems } from '@connection-portal/rules/tree';
import type { EditResult, EditState } from '@connection-portal/rules/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RulesAction, RulesBranch, RulesState } from './types';
import {
  bannerViewOf,
  copyTargetsOf,
  deleteDialogText,
  editStateOf,
  findingTargetIdsOf,
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

/**
 * The id `crypto.randomUUID()` gives in these cases, which name the variants as the step keyed
 * them before it keyed them by id (spec 007, T053): `main` for a new connection's Standard, and
 * `new-1`, `new-2`… for the variants added after it. The keys are ids all the same: nothing in
 * the step reads them but to find a branch (see "variants keyed by id" for real UUIDs)
 */
let nextKey = 'main';

function keyAfter(branches: RulesBranch[]): string {
  const taken = new Set(branches.map((branch) => branch.key));
  let number = branches.length;
  while (taken.has(`new-${number}`)) {
    number += 1;
  }
  return `new-${number}`;
}

beforeEach(() => {
  nextKey = 'main';
  vi.spyOn(crypto, 'randomUUID').mockImplementation(
    () => nextKey as ReturnType<Crypto['randomUUID']>
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** A new connection's state with these items in Standard, numbering from rule 9 and group 3. */
function stateWith(items: RuleTreeItem[]): RulesState {
  nextKey = 'main';
  const state = initialRulesState();
  const [main] = state.branches;
  return { ...state, branches: [{ ...main, items }], counters: { rule: 9, group: 3 } };
}

function run(state: RulesState, ...actions: RulesAction[]): RulesState {
  return actions.reduce((current, action) => {
    nextKey = keyAfter(current.branches);
    return rulesReducer(current, action);
  }, state);
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

  const rule3 = { itemId: 'rule-3', name: 'Rule 03' };
  const rule6 = { itemId: 'rule-6', name: 'Rule 06' };
  const group1 = { itemId: 'group-1', name: 'Group 01' };
  const U04_LINE: BannerLine = {
    kind: 'redundant',
    tone: 'info',
    parts: [rule6, ' is the same as ', rule3, '.'],
  };

  it('shows a duplicate or always-met line alone in the info look, with its kind text (U04, U06)', () => {
    const u04 = banner({ kind: 'info', lines: [U04_LINE], head: U04_LINE.parts });
    expect(bannerViewOf(u04, false)).toEqual({
      state: 'single',
      summary: { key: 'summary', tone: 'info', kindText: 'Redundant:', parts: U04_LINE.parts },
      items: [],
    });
    const parts = ['Every applicant meets ', group1, ', so it doesn’t check anything.'];
    const u06 = banner({
      kind: 'info',
      lines: [{ kind: 'always_met', tone: 'info', parts }],
      head: parts,
    });
    expect(bannerViewOf(u06, false).summary).toMatchObject({ kindText: 'Always met:', parts });
  });

  it('lists a duplicate with its info icon in a warning banner (U05)', () => {
    const u05 = banner({
      lines: [U05_LINE, U04_LINE],
      counts: '2 rules can’t be met together · 1 duplicate rule',
      head: ['2 rules can’t be met together · 1 duplicate rule'],
    });
    expect(bannerViewOf(u05, true).items).toEqual([
      { key: 'line-0', tone: 'warning', kindText: 'Conflicting:', parts: U05_LINE.parts },
      { key: 'line-1', tone: 'info', kindText: 'Redundant:', parts: U04_LINE.parts },
    ]);
  });

  it('shows the notice that every applicant meets the rules alone, without a link (W8)', () => {
    const text = 'Every applicant meets the rules of Standard.';
    const w8 = banner({
      kind: 'info',
      notice: { tone: 'info', text, appended: text },
      head: [text],
    });
    expect(bannerViewOf(w8, false)).toEqual({
      state: 'single',
      summary: { key: 'summary', tone: 'info', kindText: null, parts: [text] },
      items: [],
    });
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

describe('findingTargetIdsOf', () => {
  it("moves the focus to a group's header first, then to its row or frame (W19)", () => {
    expect(findingTargetIdsOf('main', 'group-1')).toEqual([
      'rule-main-group-1-header',
      'rule-main-group-1',
    ]);
  });

  it("falls back to a rule's row, which has no header", () => {
    expect(findingTargetIdsOf('new-1', 'rule-2')).toEqual([
      'rule-new-1-rule-2-header',
      'rule-new-1-rule-2',
    ]);
  });
});

// Parity (spec 007, SC-003): the cases above that change the rules, replayed through the editor's
// actions of `@connection-portal/rules/edits`, which the agents' tools call. The reducer must hold
// the same branches and counters as the actions alone give

/** The actions applied in turn, each expected to succeed. */
function replay(start: EditState, ...steps: ((content: EditState) => EditResult)[]): EditState {
  return steps.reduce((content, step) => {
    const result = step(content);
    if (!result.ok) {
      throw new Error(`refused: ${result.refusal.message}`);
    }
    return result.state;
  }, start);
}

describe('the cases above, replayed through edits.ts (SC-003)', () => {
  const ITEMS = [rule(1, null, null), group(1, [rule(2, null, null), rule(3, null, null)])];
  const from = (items: RuleTreeItem[]) => editStateOf(stateWith(items));
  const addVariant =
    (name: string, origin: 'based' | 'empty', id: string, description: string | null = null) =>
    (content: EditState) =>
      edits.addVariant(content, { name, description }, origin, id);
  const withVariant = (origin: 'based' | 'empty' = 'based'): RulesState =>
    run(stateWith(ITEMS), {
      type: 'addVariant',
      variant: { name: ' Ambulance ', description: ' For ambulances ' },
      origin,
    });
  const AMBULANCE = addVariant(' Ambulance ', 'based', 'new-1', ' For ambulances ');
  const renameIn = (branchKey: string, itemId: string, name: string): RulesAction[] => [
    { type: 'startRename', branchKey, itemId },
    { type: 'rename', name },
  ];

  const cases: { name: string; reducer: () => RulesState; edited: () => EditState }[] = [
    {
      name: 'groups two rules',
      reducer: () =>
        run(
          stateWith(FLAT),
          { type: 'startSelect', branchKey: BRANCH, itemId: 'rule-2' },
          { type: 'toggleSelect', itemId: 'rule-3' },
          { type: 'groupSelected' }
        ),
      edited: () => replay(from(FLAT), (c) => edits.groupItems(c, BRANCH, ['rule-2', 'rule-3'])),
    },
    {
      name: 'groups rules chosen out of order',
      reducer: () =>
        run(
          stateWith(FLAT),
          { type: 'startSelect', branchKey: BRANCH, itemId: 'rule-3' },
          { type: 'toggleSelect', itemId: 'rule-1' },
          { type: 'groupSelected' }
        ),
      edited: () => replay(from(FLAT), (c) => edits.groupItems(c, BRANCH, ['rule-3', 'rule-1'])),
    },
    {
      name: 'makes a sub-group',
      reducer: () =>
        run(
          stateWith([group(1, FLAT)]),
          { type: 'startSelect', branchKey: BRANCH, itemId: 'rule-1' },
          { type: 'toggleSelect', itemId: 'rule-2' },
          { type: 'groupSelected' }
        ),
      edited: () =>
        replay(from([group(1, FLAT)]), (c) => edits.groupItems(c, BRANCH, ['rule-1', 'rule-2'])),
    },
    {
      name: 'ungroups',
      reducer: () =>
        run(stateWith(ITEMS), { type: 'ungroup', branchKey: BRANCH, groupId: 'group-1' }),
      edited: () => replay(from(ITEMS), (c) => edits.ungroup(c, BRANCH, 'group-1')),
    },
    {
      name: 'deletes a group with its members',
      reducer: () =>
        run(
          stateWith(ITEMS),
          { type: 'askDeleteGroup', branchKey: BRANCH, groupId: 'group-1' },
          { type: 'confirmDelete' }
        ),
      edited: () => replay(from(ITEMS), (c) => edits.deleteItem(c, BRANCH, 'group-1')),
    },
    {
      name: 'dissolves a group when a member is deleted below two',
      reducer: () =>
        run(
          stateWith(ITEMS),
          { type: 'askDelete', branchKey: BRANCH, ruleId: 'rule-2' },
          { type: 'confirmDelete' }
        ),
      edited: () => replay(from(ITEMS), (c) => edits.deleteItem(c, BRANCH, 'rule-2')),
    },
    {
      name: 'deletes a rule, then renames another',
      reducer: () =>
        run(
          stateWith(FLAT),
          { type: 'askDelete', branchKey: BRANCH, ruleId: 'rule-1' },
          { type: 'confirmDelete' },
          ...renameIn(BRANCH, 'rule-2', 'Old enough')
        ),
      edited: () =>
        replay(
          from(FLAT),
          (c) => edits.deleteItem(c, BRANCH, 'rule-1'),
          (c) => edits.changeRule(c, BRANCH, 'rule-2', { name: 'Old enough' })
        ),
    },
    {
      name: 'switches the top level',
      reducer: () =>
        run(stateWith(FLAT), {
          type: 'switchOperator',
          branchKey: BRANCH,
          parentId: null,
          operator: 'or',
        }),
      edited: () => replay(from(FLAT), (c) => edits.switchOperator(c, BRANCH, null, 'or')),
    },
    {
      name: 'switches a group there and back, then renames a rule',
      reducer: () =>
        run(
          stateWith([group(1, FLAT)]),
          { type: 'switchOperator', branchKey: BRANCH, parentId: 'group-1', operator: 'or' },
          { type: 'switchOperator', branchKey: BRANCH, parentId: 'group-1', operator: 'and' },
          ...renameIn(BRANCH, 'rule-1', 'Old enough')
        ),
      edited: () =>
        replay(
          from([group(1, FLAT)]),
          (c) => edits.switchOperator(c, BRANCH, 'group-1', 'or'),
          (c) => edits.switchOperator(c, BRANCH, 'group-1', 'and'),
          (c) => edits.changeRule(c, BRANCH, 'rule-1', { name: 'Old enough' })
        ),
    },
    {
      name: 'adds, changes and removes a group’s own message',
      reducer: () =>
        run(
          stateWith([group(1, FLAT)]),
          { type: 'setGroupMessage', branchKey: BRANCH, groupId: 'group-1', message: '' },
          {
            type: 'setGroupMessage',
            branchKey: BRANCH,
            groupId: 'group-1',
            message: 'You must meet one of these.',
          },
          { type: 'setGroupMessage', branchKey: BRANCH, groupId: 'group-1', message: null }
        ),
      edited: () =>
        replay(
          from([group(1, FLAT)]),
          (c) => edits.setGroupMessage(c, BRANCH, 'group-1', ''),
          (c) => edits.setGroupMessage(c, BRANCH, 'group-1', 'You must meet one of these.'),
          (c) => edits.setGroupMessage(c, BRANCH, 'group-1', null)
        ),
    },
    {
      name: 'adds a rule at the end of its group',
      reducer: () =>
        run(
          stateWith([group(1, [rule(1, null, null), rule(2, null, null)])]),
          { type: 'addRule', branchKey: BRANCH, parentId: 'group-1' },
          { type: 'saveRule' }
        ),
      edited: () =>
        replay(from([group(1, [rule(1, null, null), rule(2, null, null)])]), (c) =>
          edits.addRule(c, BRANCH, 'group-1')
        ),
    },
    {
      name: 'adds a rule at the end of the top level once its group is gone',
      reducer: () =>
        run(
          stateWith([group(1, [rule(1, null, null), rule(2, null, null)])]),
          { type: 'addRule', branchKey: BRANCH, parentId: 'group-1' },
          { type: 'ungroup', branchKey: BRANCH, groupId: 'group-1' },
          { type: 'saveRule' }
        ),
      edited: () =>
        replay(
          from([group(1, [rule(1, null, null), rule(2, null, null)])]),
          (c) => edits.ungroup(c, BRANCH, 'group-1'),
          (c) => edits.addRule(c, BRANCH, null)
        ),
    },
    {
      name: 'adds a variant based on Standard, and one that starts empty',
      reducer: () =>
        run(withVariant(), {
          type: 'addVariant',
          variant: { name: 'Taxi', description: null },
          origin: 'empty',
        }),
      edited: () => replay(from(ITEMS), AMBULANCE, addVariant('Taxi', 'empty', 'new-2')),
    },
    {
      name: 'passes Standard’s new rule and rename to a based variant',
      reducer: () =>
        run(
          withVariant(),
          { type: 'addRule', branchKey: BRANCH, parentId: null },
          { type: 'saveRule' },
          ...renameIn(BRANCH, 'rule-1', 'Old enough')
        ),
      edited: () =>
        replay(
          from(ITEMS),
          AMBULANCE,
          (c) => edits.addRule(c, BRANCH, null),
          (c) => edits.changeRule(c, BRANCH, 'rule-1', { name: 'Old enough' })
        ),
    },
    {
      name: 'passes nothing to a variant that started empty',
      reducer: () =>
        run(
          withVariant('empty'),
          { type: 'addRule', branchKey: BRANCH, parentId: null },
          { type: 'saveRule' }
        ),
      edited: () =>
        replay(from(ITEMS), addVariant(' Ambulance ', 'empty', 'new-1', ' For ambulances '), (c) =>
          edits.addRule(c, BRANCH, null)
        ),
    },
    {
      name: 'marks a based variant’s rename, and resets it to Standard',
      reducer: () =>
        run(withVariant(), ...renameIn('new-1', 'rule-1', 'Old enough'), {
          type: 'resetItem',
          branchKey: 'new-1',
          itemId: 'rule-1',
        }),
      edited: () =>
        replay(
          from(ITEMS),
          AMBULANCE,
          (c) => edits.changeRule(c, 'new-1', 'rule-1', { name: 'Old enough' }),
          (c) => edits.resetItem(c, 'new-1', 'rule-1')
        ),
    },
    {
      name: 'marks a based variant’s rename',
      reducer: () => run(withVariant(), ...renameIn('new-1', 'rule-1', 'Old enough')),
      edited: () =>
        replay(from(ITEMS), AMBULANCE, (c) =>
          edits.changeRule(c, 'new-1', 'rule-1', { name: 'Old enough' })
        ),
    },
    {
      name: 'switches a based variant’s top level, and resets it',
      reducer: () =>
        run(
          withVariant(),
          { type: 'switchOperator', branchKey: 'new-1', parentId: null, operator: 'or' },
          { type: 'resetOperator', branchKey: 'new-1' }
        ),
      edited: () =>
        replay(
          from(ITEMS),
          AMBULANCE,
          (c) => edits.switchOperator(c, 'new-1', null, 'or'),
          (c) => edits.resetOperator(c, 'new-1')
        ),
    },
    {
      name: 'removes an inherited group, and restores it',
      reducer: () =>
        run(
          withVariant(),
          { type: 'removeItem', branchKey: 'new-1', itemId: 'group-1' },
          { type: 'restoreItem', branchKey: 'new-1', itemId: 'group-1' }
        ),
      edited: () =>
        replay(
          from(ITEMS),
          AMBULANCE,
          (c) => edits.deleteItem(c, 'new-1', 'group-1'),
          (c) => edits.restoreItem(c, 'new-1', 'group-1')
        ),
    },
    {
      name: 'removes an inherited group',
      reducer: () =>
        run(withVariant(), { type: 'removeItem', branchKey: 'new-1', itemId: 'group-1' }),
      edited: () => replay(from(ITEMS), AMBULANCE, (c) => edits.deleteItem(c, 'new-1', 'group-1')),
    },
    {
      name: 'adds a based variant’s own rule to an inherited group',
      reducer: () =>
        run(
          withVariant(),
          { type: 'addRule', branchKey: 'new-1', parentId: 'group-1' },
          { type: 'saveRule' }
        ),
      edited: () => replay(from(ITEMS), AMBULANCE, (c) => edits.addRule(c, 'new-1', 'group-1')),
    },
    {
      name: 'groups in a based variant',
      reducer: () =>
        run(
          withVariant(),
          { type: 'startSelect', branchKey: 'new-1', itemId: 'rule-2' },
          { type: 'toggleSelect', itemId: 'rule-3' },
          { type: 'groupSelected' }
        ),
      edited: () =>
        replay(from(ITEMS), AMBULANCE, (c) => edits.groupItems(c, 'new-1', ['rule-2', 'rule-3'])),
    },
    {
      name: 'deletes a rule of Standard in every variant',
      reducer: () =>
        run(
          withVariant(),
          { type: 'askDelete', branchKey: BRANCH, ruleId: 'rule-1' },
          { type: 'confirmDelete' }
        ),
      edited: () => replay(from(ITEMS), AMBULANCE, (c) => edits.deleteItem(c, BRANCH, 'rule-1')),
    },
    {
      name: 'renames a variant',
      reducer: () =>
        run(withVariant(), {
          type: 'editVariant',
          branchKey: 'new-1',
          variant: { name: 'School transport ', description: '  ' },
        }),
      edited: () =>
        replay(from(ITEMS), AMBULANCE, (c) =>
          edits.editVariant(c, 'new-1', { name: 'School transport ', description: '  ' })
        ),
    },
    {
      name: 'deletes a variant',
      reducer: () =>
        run(
          withVariant(),
          { type: 'askDeleteVariant', branchKey: 'new-1' },
          { type: 'confirmDelete' }
        ),
      edited: () => replay(from(ITEMS), AMBULANCE, (c) => edits.deleteVariant(c, 'new-1')),
    },
    {
      name: 'copies a rule to an empty and a based variant',
      reducer: () =>
        run(
          withVariant('empty'),
          {
            type: 'addVariant',
            variant: { name: 'School transport', description: null },
            origin: 'based',
          },
          { type: 'askCopyRule', branchKey: BRANCH, ruleId: 'rule-1' },
          { type: 'copyRule', targets: ['new-1', 'new-2'] }
        ),
      edited: () =>
        replay(
          from(ITEMS),
          addVariant(' Ambulance ', 'empty', 'new-1', ' For ambulances '),
          addVariant('School transport', 'based', 'new-2'),
          (c) => edits.copyRule(c, BRANCH, 'rule-1', ['new-1', 'new-2'])
        ),
    },
    {
      name: 'copies a rule, then renames another',
      reducer: () =>
        run(
          withVariant('empty'),
          { type: 'askCopyRule', branchKey: BRANCH, ruleId: 'rule-1' },
          { type: 'copyRule', targets: ['new-1'] },
          ...renameIn(BRANCH, 'rule-2', 'Old enough')
        ),
      edited: () =>
        replay(
          from(ITEMS),
          addVariant(' Ambulance ', 'empty', 'new-1', ' For ambulances '),
          (c) => edits.copyRule(c, BRANCH, 'rule-1', ['new-1']),
          (c) => edits.changeRule(c, BRANCH, 'rule-2', { name: 'Old enough' })
        ),
    },
    {
      name: 'renames Standard’s rule in two based variants',
      reducer: () =>
        run(
          stateWith(ITEMS),
          {
            type: 'addVariant',
            variant: { name: 'Ambulance', description: null },
            origin: 'based',
          },
          {
            type: 'addVariant',
            variant: { name: 'School transport', description: null },
            origin: 'based',
          },
          ...renameIn('new-1', 'rule-1', 'Old enough'),
          ...renameIn('new-2', 'rule-1', 'Of age')
        ),
      edited: () =>
        replay(
          from(ITEMS),
          addVariant('Ambulance', 'based', 'new-1'),
          addVariant('School transport', 'based', 'new-2'),
          (c) => edits.changeRule(c, 'new-1', 'rule-1', { name: 'Old enough' }),
          (c) => edits.changeRule(c, 'new-2', 'rule-1', { name: 'Of age' })
        ),
    },
    {
      name: 'switches an inherited group in a based variant',
      reducer: () =>
        run(
          stateWith(ITEMS),
          {
            type: 'addVariant',
            variant: { name: 'Ambulance', description: null },
            origin: 'based',
          },
          { type: 'switchOperator', branchKey: 'new-1', parentId: 'group-1', operator: 'or' }
        ),
      edited: () =>
        replay(from(ITEMS), addVariant('Ambulance', 'based', 'new-1'), (c) =>
          edits.switchOperator(c, 'new-1', 'group-1', 'or')
        ),
    },
    {
      name: 'renames a rule of an inherited group in a based variant',
      reducer: () =>
        run(
          stateWith(ITEMS),
          {
            type: 'addVariant',
            variant: { name: 'Ambulance', description: null },
            origin: 'based',
          },
          ...renameIn('new-1', 'rule-3', 'Held B')
        ),
      edited: () =>
        replay(from(ITEMS), addVariant('Ambulance', 'based', 'new-1'), (c) =>
          edits.changeRule(c, 'new-1', 'rule-3', { name: 'Held B' })
        ),
    },
    {
      name: 'adds a based and an empty variant to a flat Standard',
      reducer: () =>
        run(
          stateWith(FLAT),
          {
            type: 'addVariant',
            variant: { name: 'Ambulance', description: null },
            origin: 'based',
          },
          { type: 'addVariant', variant: { name: 'Taxi', description: null }, origin: 'empty' }
        ),
      edited: () =>
        replay(
          from(FLAT),
          addVariant('Ambulance', 'based', 'new-1'),
          addVariant('Taxi', 'empty', 'new-2')
        ),
    },
  ];

  for (const { name, reducer, edited } of cases) {
    it(name, () => {
      const state = reducer();
      const content = edited();
      expect(editStateOf(state).branches).toEqual(content.branches);
      expect(state.counters).toEqual(content.counters);
    });
  }

  it('refuses what the reducer leaves as it was', () => {
    const one = run(stateWith(FLAT), { type: 'startSelect', branchKey: BRANCH, itemId: 'rule-1' });
    expect(run(one, { type: 'groupSelected' })).toBe(one);
    expect(edits.groupItems(from(FLAT), BRANCH, ['rule-1']).ok).toBe(false);
    const state = withVariant();
    const kept = run(
      state,
      { type: 'askDeleteVariant', branchKey: BRANCH },
      { type: 'confirmDelete' }
    );
    expect(kept.branches).toEqual(state.branches);
    expect(edits.deleteVariant(editStateOf(state), BRANCH).ok).toBe(false);
  });
});

describe('variants keyed by id (spec 007, research R10)', () => {
  // Real ids from here on
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  const ID = 'c8a2f1e0-1b2c-4d3e-8f40-5a6b7c8d9e0f';

  it('keys a new connection’s Standard by a new id, without an id loaded, and opens it', () => {
    const state = initialRulesState();
    const [main] = state.branches;
    expect(main).toMatchObject({ id: null, name: 'Standard', origin: 'main' });
    expect(main.key).toMatch(UUID);
    expect(state.openBranch).toBe(main.key);
    expect(initialRulesState().branches[0].key).not.toBe(main.key);
  });

  it('keys an added variant by the id the dialog made, or by a new one', () => {
    const added = rulesReducer(initialRulesState(), {
      type: 'addVariant',
      variant: { name: 'Ambulance', description: null },
      origin: 'based',
      id: ID,
    });
    expect(added.branches[1]).toMatchObject({ key: ID, id: null, name: 'Ambulance' });
    expect(added.openBranch).toBe(ID);
    const another = rulesReducer(added, {
      type: 'addVariant',
      variant: { name: 'Taxi', description: null },
      origin: 'empty',
    });
    expect(another.branches[2].key).toMatch(UUID);
    expect(editStateOf(another).branches.map((branch) => branch.id)).toEqual(
      another.branches.map((branch) => branch.key)
    );
  });

  it('works on ids as on any key: Standard’s change, a variant’s own, an undo', () => {
    const start = stateWith(FLAT);
    const main = start.branches[0].key;
    expect(main).toMatch(UUID);
    const steps: RulesAction[] = [
      {
        type: 'addVariant',
        variant: { name: 'Ambulance', description: null },
        origin: 'based',
        id: ID,
      },
      { type: 'addRule', branchKey: main, parentId: null },
      { type: 'saveRule' },
      { type: 'startRename', branchKey: ID, itemId: 'rule-1' },
      { type: 'rename', name: 'Old enough' },
      { type: 'askDelete', branchKey: main, ruleId: 'rule-2' },
      { type: 'confirmDelete' },
    ];
    const state = steps.reduce(rulesReducer, start);
    expect(ids(state)).toEqual(['rule-1', 'rule-3', 'rule-9']);
    expect(flattenItems(state.branches[1].items).map((entry) => [entry.id, entry.mark])).toEqual([
      ['rule-1', 'changed'],
      ['rule-3', null],
      ['rule-9', null],
    ]);
    const undone = rulesReducer(state, { type: 'undo' });
    expect(undone.openBranch).toBe(main);
    expect(ids(undone)).toEqual(['rule-1', 'rule-2', 'rule-3', 'rule-9']);
    expect(neighbourOf(undone, main, 'rule-2')).toBe('rule-3');
    expect(findingTargetIdsOf(ID, 'rule-1')).toEqual([
      `rule-${ID}-rule-1-header`,
      `rule-${ID}-rule-1`,
    ]);
  });
});
