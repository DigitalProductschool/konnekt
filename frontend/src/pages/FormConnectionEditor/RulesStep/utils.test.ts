import type { GroupItem, Mark, RuleTreeItem } from '@connection-portal/api-types/form-connections';
import type { BannerLine, FindingsBanner } from '@connection-portal/rules/checks/types';
import * as edits from '@connection-portal/rules/edits';
import { MDL, PID, rule, target } from '@connection-portal/rules/testData';
import { findItem, flattenItems } from '@connection-portal/rules/tree';
import type { EditResult, EditState } from '@connection-portal/rules/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MENU_ENTRY_ORDER } from './constants';
import type {
  MenuContext,
  MenuItem,
  MenuRuleLevel,
  MenuTreeItemState,
  RulesAction,
  RulesBranch,
  RulesState,
} from './types';
import {
  bannerViewOf,
  copyTargetsOf,
  deleteDialogText,
  editorMessageHintOf,
  editStateOf,
  findingTargetIdsOf,
  initialRulesState,
  initialVariantForm,
  joinNames,
  linkNoticeOf,
  linkOf,
  linkStripSummaryOf,
  menuEntriesOf,
  menuItemOf,
  neighbourOf,
  rulesReducer,
  selectableIn,
  selectionText,
  switchNoteOf,
  unrequestedNoteOf,
  variantFormProblem,
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
    const grouped = run(selecting, { type: 'groupSelected', language: 'en' });
    expect(ids(grouped)).toEqual(['rule-1', 'group-3', 'rule-2', 'rule-3']);
    expect(grouped.selection).toBeNull();
    expect(grouped.counters).toEqual({ rule: 9, group: 4 });
    expect(grouped.toast).toMatchObject({
      message: 'Rule 02 and Rule 03 are now in Group 03.',
      actionLabel: 'Undo',
    });
  });

  it('undoes a grouping and gives its number back', () => {
    const grouped = run(
      stateWith(FLAT),
      { type: 'startSelect', branchKey: BRANCH, itemId: 'rule-3' },
      { type: 'toggleSelect', itemId: 'rule-1' },
      { type: 'groupSelected', language: 'en' }
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
      { type: 'groupSelected', language: 'en' }
    );
    expect(findItem(grouped.branches[0].items, 'group-3')).toMatchObject({
      parentId: 'group-1',
      item: { name: 'Sub-group 03' },
    });
  });

  it('groups nothing with fewer than two rules, and ends select mode on Cancel', () => {
    const one = run(stateWith(FLAT), { type: 'startSelect', branchKey: BRANCH, itemId: 'rule-1' });
    expect(run(one, { type: 'groupSelected', language: 'en' })).toBe(one);
    expect(run(one, { type: 'toggleSelect', itemId: 'rule-1' }).selection?.ids).toEqual([]);
    expect(run(one, { type: 'cancelSelect' }).selection).toBeNull();
  });

  it('says what is chosen and what grouping makes', () => {
    const state = stateWith([group(1, FLAT)]);
    const branch = state.branches[0];
    expect(selectionText({ branchKey: BRANCH, parentId: null, ids: [] }, branch, 'en')).toBe(
      'Choose two or more rules to group.'
    );
    expect(
      selectionText({ branchKey: BRANCH, parentId: 'group-1', ids: ['rule-2'] }, branch, 'en')
    ).toBe('Choose at least one more rule to group with Rule 02.');
    expect(
      selectionText(
        { branchKey: BRANCH, parentId: 'group-1', ids: ['rule-2', 'rule-1'] },
        branch,
        'en'
      )
    ).toBe('2 rules selected. They become a sub-group of Group 01.');
    expect(
      selectionText({ branchKey: BRANCH, parentId: null, ids: ['a', 'b', 'c'] }, branch, 'en')
    ).toBe('3 rules selected');
  });

  it('lists names as the toasts do', () => {
    expect(joinNames(['Rule 01'], 'en')).toBe('Rule 01');
    expect(joinNames(['Rule 01', 'Rule 02'], 'en')).toBe('Rule 01 and Rule 02');
    expect(joinNames(['Rule 01', 'Rule 02', 'Rule 03'], 'en')).toBe('Rule 01, Rule 02 and Rule 03');
  });
});

describe('ungrouping and deleting groups (FR-008; W8)', () => {
  const items = [rule(1, null, null), group(1, [rule(2, null, null), rule(3, null, null)])];

  it('ungroups with an Undo toast', () => {
    const ungrouped = run(stateWith(items), {
      type: 'ungroup',
      branchKey: BRANCH,
      groupId: 'group-1',
      language: 'en',
    });
    expect(ids(ungrouped)).toEqual(['rule-1', 'rule-2', 'rule-3']);
    expect(ungrouped.toast).toMatchObject({
      message: 'Group 01 in Standard ungrouped.',
      actionLabel: 'Undo',
    });
    expect(run(ungrouped, { type: 'undo' }).branches[0].items).toEqual(items);
  });

  it('says that the rules use their own messages again after ungrouping a group with one (F32)', () => {
    const withMessage = (number: number, members: RuleTreeItem[], message: string | null) => ({
      ...group(number, members, number === 1 ? 'Group 01' : 'Sub-group 02'),
      message,
    });
    const tree = (outer: string | null, inner: string | null) => [
      rule(1, null, null),
      withMessage(
        1,
        [rule(3, null, null), withMessage(2, [rule(4, null, null), rule(5, null, null)], inner)],
        outer
      ),
    ];
    const toastOf = (items: RuleTreeItem[], groupId: string) =>
      run(stateWith(items), { type: 'ungroup', branchKey: BRANCH, groupId, language: 'en' }).toast
        ?.message;
    expect(toastOf(tree('Group message.', null), 'group-1')).toBe(
      'Ungrouped. Rule 03, Rule 04 and Rule 05 use their own messages again.'
    );
    // A sub-group's own message still covers its rules
    expect(toastOf(tree('Group message.', 'Sub-group message.'), 'group-1')).toBe(
      'Ungrouped. Rule 03 uses its own message again.'
    );
    // Inside a group with a message, the sub-group's rules keep reading the group's
    expect(toastOf(tree('Group message.', 'Sub-group message.'), 'group-2')).toBe(
      'Sub-group 02 in Standard ungrouped.'
    );
    expect(toastOf(tree(null, 'Sub-group message.'), 'group-2')).toBe(
      'Ungrouped. Rule 04 and Rule 05 use their own messages again.'
    );
  });

  it('deletes a group with its members after the question, with an Undo toast', () => {
    const asked = run(stateWith(items), {
      type: 'askDeleteGroup',
      branchKey: BRANCH,
      groupId: 'group-1',
    });
    expect(asked.dialog).toEqual({ type: 'deleteGroup', branchKey: BRANCH, groupId: 'group-1' });
    const deleted = run(asked, { type: 'confirmDelete', language: 'en' });
    expect(ids(deleted)).toEqual(['rule-1']);
    expect(deleted.toast).toMatchObject({
      message: 'Group 01 deleted.',
      actionLabel: 'Undo',
    });
    expect(run(deleted, { type: 'undo' }).branches[0].items).toEqual(items);
  });

  it('dissolves a group when a member is deleted below two, and undoes it (US2-AS7)', () => {
    const deleted = run(
      stateWith(items),
      { type: 'askDelete', branchKey: BRANCH, ruleId: 'rule-2' },
      { type: 'confirmDelete', language: 'en' }
    );
    expect(ids(deleted)).toEqual(['rule-1', 'rule-3']);
    expect(deleted.toast?.message).toBe('Rule 02 deleted.');
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
      { type: 'confirmDelete', language: 'en' }
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
      { type: 'confirmDelete', language: 'en' }
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
      { type: 'confirmDelete', language: 'en' }
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
      { type: 'confirmDelete', language: 'en' },
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
    expect(switchNoteOf(switched, switched.branches[0], null, 'en')).toBe(
      'Standard now needs only one rule to be true.'
    );
    expect(switchNoteOf(switched, switched.branches[0], 'group-1', 'en')).toBeNull();
  });

  it('switches a group, and drops the note with the next change', () => {
    const switched = run(stateWith([group(1, FLAT)]), {
      type: 'switchOperator',
      branchKey: BRANCH,
      parentId: 'group-1',
      operator: 'or',
    });
    expect(findItem(switched.branches[0].items, 'group-1')?.item).toMatchObject({ operator: 'or' });
    expect(switchNoteOf(switched, switched.branches[0], 'group-1', 'en')).toBe(
      'Group 01 now needs only one rule to be true.'
    );
    const back = run(switched, {
      type: 'switchOperator',
      branchKey: BRANCH,
      parentId: 'group-1',
      operator: 'and',
    });
    expect(switchNoteOf(back, back.branches[0], 'group-1', 'en')).toBe(
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
    expect(
      findItem(run(adding, { type: 'saveRule', language: 'en' }).branches[0].items, 'rule-9')
    ).toMatchObject({
      parentId: 'group-1',
      index: 2,
    });
    const ungrouped = run(adding, {
      type: 'ungroup',
      branchKey: BRANCH,
      groupId: 'group-1',
      language: 'en',
    });
    expect(
      findItem(run(ungrouped, { type: 'saveRule', language: 'en' }).branches[0].items, 'rule-9')
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
      { type: 'saveRule', language: 'en' }
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
        { type: 'saveRule', language: 'en' }
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
      { type: 'saveRule', language: 'en' }
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
      { type: 'groupSelected', language: 'en' }
    );
    expect(item(grouped, 1, 'group-3')?.mark).toBe('added');
    expect(grouped.toast?.message).toBe('Grouped in Ambulance only. Standard stays the same.');
  });

  it('undoes a deletion in Standard in every variant', () => {
    const state = withVariant();
    const deleted = run(
      state,
      { type: 'askDelete', branchKey: BRANCH, ruleId: 'rule-1' },
      { type: 'confirmDelete', language: 'en' }
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
    const deleted = run(asked, { type: 'confirmDelete', language: 'en' });
    expect(deleted.branches.map((branch) => branch.key)).toEqual([BRANCH]);
    expect(deleted.openBranch).toBe(BRANCH);
    expect(
      run(
        state,
        { type: 'askDeleteVariant', branchKey: BRANCH },
        { type: 'confirmDelete', language: 'en' }
      ).branches
    ).toHaveLength(2);
  });

  it('FR-051 (33): a deleted variant opens the tab to its left, and Undo brings it back', () => {
    const state = run(withVariant(), {
      type: 'addVariant',
      variant: { name: 'School transport', description: null },
      origin: 'empty',
    });
    const school = state.branches[2].key;
    const deleted = run(
      state,
      { type: 'askDeleteVariant', branchKey: school },
      { type: 'confirmDelete', language: 'en' }
    );
    expect(deleted.branches.map((branch) => branch.name)).toEqual(['Standard', 'Ambulance']);
    expect(deleted.openBranch).toBe(variantKey(state));
    expect(deleted.toast).toMatchObject({
      message: 'School transport deleted.',
      actionLabel: 'Undo',
    });
    expect(deleted.toast?.kind).toBeUndefined();
    expect(deleted.undo).toMatchObject({ branchKey: school, itemId: '' });
    const undone = run(deleted, { type: 'undo' });
    expect(undone.branches).toEqual(state.branches);
    expect(undone.openBranch).toBe(school);
    expect(undone.toast).toBeNull();
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
      { type: 'copyRule', targets: ['new-1', 'new-2'], language: 'en' }
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
      { type: 'copyRule', targets: ['new-1'], language: 'en' }
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
      { type: 'copyRule', targets: ['new-1'], language: 'en' },
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
    deleteDialogText(state, { branchKey: BRANCH, itemId }, statement, 'en');

  it('keeps U14’s body without variants based on Standard, and in a variant', () => {
    expect(
      text(stateWith(items), 'rule-1', 'Personal ID · Date of birth (Age) is at least 21 years old')
    ).toBe(
      'Citizens will no longer be checked for “Personal ID · Date of birth (Age) is at least 21 years old”. You can undo this right after.'
    );
    expect(text(withVariants('empty'), 'rule-1')).toBe('You can undo this right after.');
    const state = withVariants('based');
    expect(deleteDialogText(state, { branchKey: 'new-1', itemId: 'group-1' }, null, 'en')).toBe(
      'Group 01 and the rules in it will be deleted. You can undo this right after.'
    );
  });

  it('gives a Standard rule U47’s drawn body, naming the variants that follow it (CLAR #56)', () => {
    const state = withVariants('based', 'based', 'empty');
    expect(text(state, 'rule-1')).toBe(
      'This deletes it from Standard and from the variants that follow it: Ambulance and School transport. If a variant changed this rule, it keeps its own version.'
    );
    const changed = run(
      withVariants('based'),
      { type: 'startRename', branchKey: 'new-1', itemId: 'rule-1' },
      { type: 'rename', name: 'Old enough' }
    );
    expect(text(changed, 'rule-1')).toBe(
      'This deletes it from Standard and from the variants that follow it: Ambulance. If a variant changed this rule, it keeps its own version.'
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
      'This deletes it from Standard and from the variants that follow it: Ambulance. If a variant changed this rule, it keeps its own version. Group 01 is left with one rule, so it’s ungrouped in Standard and its variants. Ambulance’s changes to Group 01 go with it.'
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

describe('the link strip’s removals (FR-051 (38); U47 6344:60085, 6344:60090, 6344:60095)', () => {
  const items = [rule(1, null, null), group(1, [rule(2, null, null), rule(3, null, null)])];
  // Built in each case: the variant's key comes from the mocked `crypto.randomUUID()`
  const based = () =>
    run(stateWith(items), {
      type: 'addVariant',
      variant: { name: 'Ambulance', description: null },
      origin: 'based',
    });
  function summary(...removed: string[]): string | null {
    const state = run(
      based(),
      ...removed.map((itemId): RulesAction => ({ type: 'removeItem', branchKey: 'new-1', itemId }))
    );
    return linkStripSummaryOf(state.branches[1], 'Standard', 'en');
  }

  it('says nothing while the variant removed nothing, nor while Standard has no rules (F37)', () => {
    expect(summary()).toBeNull();
    const empty = run(stateWith([]), {
      type: 'addVariant',
      variant: { name: 'Ambulance', description: null },
      origin: 'based',
    });
    expect(linkStripSummaryOf(empty.branches[1], 'Standard', 'en')).toBeNull();
  });

  it('counts the removed Standard rules, as U47 6.1 words it', () => {
    expect(summary('rule-1')).toBe('1 of 3 Standard rules is removed here.');
    expect(summary('rule-1', 'rule-3')).toBe('2 of 3 Standard rules are removed here.');
  });

  it('names removed groups while nothing else is removed, as U47 6.3 and 6.4 word it', () => {
    expect(summary('group-1')).toBe('Group 01 is removed here.');
    expect(summary('group-1', 'rule-1')).toBe('3 of 3 Standard rules are removed here.');
  });

  it('leaves out what the variant added, and counts a dissolved group’s remaining rule (F13)', () => {
    const added = run(based(), { type: 'duplicateRule', branchKey: 'new-1', ruleId: 'rule-1' });
    expect(linkStripSummaryOf(added.branches[1], 'Standard', 'en')).toBeNull();
    expect(summary('rule-2')).toBe('1 of 3 Standard rules is removed here.');
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
    text: 'No citizen can meet the rules of Standard.',
    appended: 'So no citizen can meet the rules of Standard.',
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
    const head = [...U01_LINE.parts, ' So no citizen can meet the rules of Standard.'];
    const u01 = banner({ lines: [U01_LINE], notice: NOTICE, head });
    for (const expanded of [false, true]) {
      expect(bannerViewOf(u01, expanded, 'en')).toEqual({
        state: 'single',
        summary: { key: 'summary', tone: 'warning', kindText: 'Conflicting:', parts: head },
        items: [],
      });
    }
  });

  it('shows the notice or FR-010’s sentence alone without a kind text (W12, W17)', () => {
    const alone = banner({ kind: 'info', incomplete: INCOMPLETE, head: [INCOMPLETE] });
    expect(bannerViewOf(alone, false, 'en')).toMatchObject({
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
    expect(bannerViewOf(two, false, 'en')).toEqual({
      state: 'collapsed',
      summary: { key: 'summary', tone: 'warning', kindText: null, parts: two.head },
      items: [],
    });
  });

  it('lists the lines, then the notice and FR-010’s sentence when expanded (U05)', () => {
    const view = bannerViewOf(two, true, 'en');
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
    expect(bannerViewOf(u04, false, 'en')).toEqual({
      state: 'single',
      summary: { key: 'summary', tone: 'info', kindText: 'Redundant:', parts: U04_LINE.parts },
      items: [],
    });
    const parts = ['Every citizen meets ', group1, ', so it doesn’t check anything.'];
    const u06 = banner({
      kind: 'info',
      lines: [{ kind: 'always_met', tone: 'info', parts }],
      head: parts,
    });
    expect(bannerViewOf(u06, false, 'en').summary).toMatchObject({
      kindText: 'Always met:',
      parts,
    });
  });

  it('lists a duplicate with its info icon in a warning banner (U05)', () => {
    const u05 = banner({
      lines: [U05_LINE, U04_LINE],
      counts: '2 rules can’t be met together · 1 duplicate rule',
      head: ['2 rules can’t be met together · 1 duplicate rule'],
    });
    expect(bannerViewOf(u05, true, 'en').items).toEqual([
      { key: 'line-0', tone: 'warning', kindText: 'Conflicting:', parts: U05_LINE.parts },
      { key: 'line-1', tone: 'info', kindText: 'Redundant:', parts: U04_LINE.parts },
    ]);
  });

  it('shows the notice that every citizen meets the rules alone, without a link (W8)', () => {
    const text = 'Every citizen meets the rules of Standard.';
    const w8 = banner({
      kind: 'info',
      notice: { tone: 'info', text, appended: text },
      head: [text],
    });
    expect(bannerViewOf(w8, false, 'en')).toEqual({
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

describe('linkOf (spec 007, S4; FR-028, FR-029)', () => {
  const ORIGIN = 'https://portal.example.org';
  const CONNECTION = '0b6f2c8e-6a3d-4e0e-9a4c-6f2d7c1e5b10';
  const VARIANT = '5d1f9a2b-3c4e-4f60-8a7b-9c0d1e2f3a4b';

  it("names a variant's connection and variant, at the rules step", () => {
    expect(linkOf(ORIGIN, CONNECTION, VARIANT)).toBe(
      `${ORIGIN}/form-connections/${CONNECTION}/edit?step=rules&variant=${VARIANT}`
    );
  });

  it('adds the item for a rule or a group', () => {
    expect(linkOf(ORIGIN, CONNECTION, VARIANT, 'rule-3')).toBe(
      `${ORIGIN}/form-connections/${CONNECTION}/edit?step=rules&variant=${VARIANT}&item=rule-3`
    );
    expect(linkOf(ORIGIN, CONNECTION, VARIANT, 'group-12')).toBe(
      `${ORIGIN}/form-connections/${CONNECTION}/edit?step=rules&variant=${VARIANT}&item=group-12`
    );
  });

  it('takes the origin it is given, such as a preview deployment’s', () => {
    expect(linkOf('http://localhost:5173', CONNECTION, VARIANT, 'rule-1')).toMatch(
      /^http:\/\/localhost:5173\/form-connections\//
    );
  });

  it('holds identifiers only, never names (FR-029)', () => {
    const state = stateWith([rule(1, null, null)]);
    const link = linkOf(ORIGIN, CONNECTION, state.branches[0].key, 'rule-1');
    // Standard and Rule 01 by name, in any encoding
    expect(decodeURIComponent(link.replace(/\+/g, ' '))).not.toMatch(/Standard|Rule 01/);
    expect([...new URL(link).searchParams.keys()]).toEqual(['step', 'variant', 'item']);
  });
});

describe('showToast (spec 007, S4)', () => {
  it('shows "Link copied." without an action, and keeps the Undo for Ctrl/Cmd+Z', () => {
    const deleted = run(
      stateWith(FLAT),
      { type: 'askDelete', branchKey: BRANCH, ruleId: 'rule-1' },
      { type: 'confirmDelete', language: 'en' }
    );
    const copied = run(deleted, { type: 'showToast', message: 'Link copied.' });
    expect(copied.toast).toEqual({ id: (deleted.toast?.id ?? 0) + 1, message: 'Link copied.' });
    expect(copied.undo).toEqual(deleted.undo);
    expect(copied.branches).toBe(deleted.branches);
  });

  it('drops a copy’s Show, which belongs to the toast it replaces', () => {
    const withVariant = run(stateWith(FLAT), {
      type: 'addVariant',
      variant: { name: 'Ambulance', description: null },
      origin: 'empty',
    });
    const shown = run(
      withVariant,
      { type: 'askCopyRule', branchKey: BRANCH, ruleId: 'rule-1' },
      { type: 'copyRule', targets: [withVariant.branches[1].key], language: 'en' }
    );
    expect(shown.showBranch).not.toBeNull();
    expect(run(shown, { type: 'showToast', message: 'Link copied.' }).showBranch).toBeNull();
  });
});

describe('linkNoticeOf (spec 007, S5; FR-031)', () => {
  let state: RulesState;
  beforeEach(() => {
    state = stateWith([rule(1, null, null), group(1, [rule(2, null, null)])]);
  });

  it('finds the variant and its rule or group, also in a group', () => {
    expect(linkNoticeOf(state, BRANCH, null)).toBeNull();
    expect(linkNoticeOf(state, BRANCH, 'rule-1')).toBeNull();
    expect(linkNoticeOf(state, BRANCH, 'group-1')).toBeNull();
    expect(linkNoticeOf(state, BRANCH, 'rule-2')).toBeNull();
  });

  it('names a variant that isn’t there', () => {
    expect(linkNoticeOf(state, 'gone', 'rule-1')).toBe('variant');
  });

  it('names an item that isn’t there in the variant', () => {
    expect(linkNoticeOf(state, BRANCH, 'rule-7')).toBe('item');
  });
});

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
          { type: 'groupSelected', language: 'en' }
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
          { type: 'groupSelected', language: 'en' }
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
          { type: 'groupSelected', language: 'en' }
        ),
      edited: () =>
        replay(from([group(1, FLAT)]), (c) => edits.groupItems(c, BRANCH, ['rule-1', 'rule-2'])),
    },
    {
      name: 'ungroups',
      reducer: () =>
        run(stateWith(ITEMS), {
          type: 'ungroup',
          branchKey: BRANCH,
          groupId: 'group-1',
          language: 'en',
        }),
      edited: () => replay(from(ITEMS), (c) => edits.ungroup(c, BRANCH, 'group-1')),
    },
    {
      name: 'deletes a group with its members',
      reducer: () =>
        run(
          stateWith(ITEMS),
          { type: 'askDeleteGroup', branchKey: BRANCH, groupId: 'group-1' },
          { type: 'confirmDelete', language: 'en' }
        ),
      edited: () => replay(from(ITEMS), (c) => edits.deleteItem(c, BRANCH, 'group-1')),
    },
    {
      name: 'dissolves a group when a member is deleted below two',
      reducer: () =>
        run(
          stateWith(ITEMS),
          { type: 'askDelete', branchKey: BRANCH, ruleId: 'rule-2' },
          { type: 'confirmDelete', language: 'en' }
        ),
      edited: () => replay(from(ITEMS), (c) => edits.deleteItem(c, BRANCH, 'rule-2')),
    },
    {
      name: 'deletes a rule, then renames another',
      reducer: () =>
        run(
          stateWith(FLAT),
          { type: 'askDelete', branchKey: BRANCH, ruleId: 'rule-1' },
          { type: 'confirmDelete', language: 'en' },
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
          { type: 'saveRule', language: 'en' }
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
          { type: 'ungroup', branchKey: BRANCH, groupId: 'group-1', language: 'en' },
          { type: 'saveRule', language: 'en' }
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
          { type: 'saveRule', language: 'en' },
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
          { type: 'saveRule', language: 'en' }
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
          { type: 'saveRule', language: 'en' }
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
          { type: 'groupSelected', language: 'en' }
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
          { type: 'confirmDelete', language: 'en' }
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
          { type: 'confirmDelete', language: 'en' }
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
          { type: 'copyRule', targets: ['new-1', 'new-2'], language: 'en' }
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
          { type: 'copyRule', targets: ['new-1'], language: 'en' },
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
    expect(run(one, { type: 'groupSelected', language: 'en' })).toBe(one);
    expect(edits.groupItems(from(FLAT), BRANCH, ['rule-1']).ok).toBe(false);
    const state = withVariant();
    const kept = run(
      state,
      { type: 'askDeleteVariant', branchKey: BRANCH },
      { type: 'confirmDelete', language: 'en' }
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
      { type: 'saveRule', language: 'en' },
      { type: 'startRename', branchKey: ID, itemId: 'rule-1' },
      { type: 'rename', name: 'Old enough' },
      { type: 'askDelete', branchKey: main, ruleId: 'rule-2' },
      { type: 'confirmDelete', language: 'en' },
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

describe('menuEntriesOf (FR-036; data-model "The rules step’s menus")', () => {
  const STANDARD: MenuContext = { branchKind: 'standard', linkable: true };
  const VARIANT: MenuContext = { branchKind: 'variant', linkable: true };
  const UNSAVED: MenuContext = { branchKind: 'standard', linkable: false };
  const PLAIN: MenuTreeItemState = {
    linked: false,
    changed: false,
    removed: false,
    neighbours: true,
  };
  const TOP: MenuRuleLevel = { level: 'top' };
  const IN_GROUP: MenuRuleLevel = { level: 'group', groupId: 'group-1' };
  const IN_SUB_GROUP: MenuRuleLevel = { level: 'sub-group' };

  function ruleItem(
    level: MenuRuleLevel,
    changes: Partial<MenuTreeItemState & { receivable: boolean }> = {}
  ): MenuItem {
    return { kind: 'rule', receivable: true, ...level, ...PLAIN, ...changes };
  }

  function groupItem(
    kind: 'group' | 'sub-group',
    changes: Partial<MenuTreeItemState & { hasMessage: boolean; holdsSubGroup: boolean }> = {}
  ): MenuItem {
    return { kind, hasMessage: false, holdsSubGroup: false, ...PLAIN, ...changes };
  }

  /** The entries' ids in order, "Group with other rules" with its scope */
  function show(item: MenuItem, context: MenuContext): string[] {
    return menuEntriesOf(item, context).map((entry) =>
      entry.id === 'group' ? `group:${entry.scope}` : entry.id
    );
  }

  it('FR-036, 007-S4.1 (#22, F29): a Standard rule’s menu ends with Copy link before Delete rule', () => {
    expect(show(ruleItem(TOP), STANDARD)).toEqual([
      'edit',
      'rename',
      'duplicate',
      'copyToVariant',
      'group:top',
      'copyLink',
      'delete',
    ]);
  });

  it('007-S4.6: a new, unsaved connection’s menus offer no Copy link', () => {
    expect(show(ruleItem(TOP), UNSAVED)).toEqual([
      'edit',
      'rename',
      'duplicate',
      'copyToVariant',
      'group:top',
      'delete',
    ]);
    expect(show(groupItem('group'), UNSAVED)).toEqual([
      'rename',
      'addMessage',
      'ungroup',
      'delete',
    ]);
    expect(show(ruleItem(TOP, { removed: true }), { ...VARIANT, linkable: false })).toEqual([
      'restore',
    ]);
    expect(show({ kind: 'variant' }, UNSAVED)).toEqual(['rename']);
    expect(show({ kind: 'variant' }, { ...VARIANT, linkable: false })).toEqual([
      'rename',
      'delete',
    ]);
  });

  it('FR-036, 007-S4.2 (#22, F29): a removed rule, group or sub-group offers Restore, then Copy link only', () => {
    const removed = { removed: true, linked: true, changed: true, neighbours: true };
    expect(show(ruleItem(TOP, removed), VARIANT)).toEqual(['restore', 'copyLink']);
    expect(show(ruleItem(IN_GROUP, removed), VARIANT)).toEqual(['restore', 'copyLink']);
    expect(show(groupItem('group', { ...removed, hasMessage: true }), VARIANT)).toEqual([
      'restore',
      'copyLink',
    ]);
    expect(show(groupItem('sub-group', removed), VARIANT)).toEqual(['restore', 'copyLink']);
  });

  it('FR-036 (#53, F68): in a variant, a rule linked to Standard has no Rename or Duplicate, and is removed from the variant', () => {
    expect(show(ruleItem(TOP, { linked: true }), VARIANT)).toEqual([
      'edit',
      'copyToVariant',
      'group:top',
      'copyLink',
      'remove',
    ]);
    // U56 10.5's linked rule, with nothing left to copy to: Edit rule, Group with other rules,
    // and F29's Copy link before "Remove from School transport"
    expect(show(ruleItem(TOP, { linked: true, receivable: false }), VARIANT)).toEqual([
      'edit',
      'group:top',
      'copyLink',
      'remove',
    ]);
  });

  it('FR-036 (#53; U57 #18): a rule changed in its variant offers Reset to Standard before Copy link', () => {
    expect(show(ruleItem(TOP, { linked: true, changed: true }), VARIANT)).toEqual([
      'edit',
      'copyToVariant',
      'group:top',
      'reset',
      'copyLink',
      'remove',
    ]);
  });

  it('FR-036 (#53; F68, U57 #19): a rule added in a variant keeps the whole menu with Rename and Delete rule', () => {
    expect(show(ruleItem(TOP), VARIANT)).toEqual([
      'edit',
      'rename',
      'duplicate',
      'copyToVariant',
      'group:top',
      'copyLink',
      'delete',
    ]);
  });

  it('FR-036 (#53): only a variant links items to Standard', () => {
    expect(show(ruleItem(TOP, { linked: true, changed: true }), STANDARD)).toEqual(
      show(ruleItem(TOP), STANDARD)
    );
    expect(show(groupItem('group', { linked: true, changed: true }), STANDARD)).toEqual(
      show(groupItem('group'), STANDARD)
    );
  });

  it('FR-036 (#53, F29): Copy to variant shows only while some variant could still receive the rule', () => {
    expect(show(ruleItem(TOP, { receivable: false }), STANDARD)).toEqual([
      'edit',
      'rename',
      'duplicate',
      'group:top',
      'copyLink',
      'delete',
    ]);
    expect(
      show(ruleItem(TOP, { linked: true, changed: true, receivable: false }), VARIANT)
    ).toEqual(['edit', 'group:top', 'reset', 'copyLink', 'remove']);
  });

  it('FR-036 (#48, F30): a top-level rule offers Group with other rules only with a neighbour on its level', () => {
    expect(show(ruleItem(TOP, { neighbours: false }), STANDARD)).toEqual([
      'edit',
      'rename',
      'duplicate',
      'copyToVariant',
      'copyLink',
      'delete',
    ]);
  });

  it('FR-036 (#60, F30): a rule directly in a top-level group groups within that group’s rules', () => {
    expect(show(ruleItem(IN_GROUP), STANDARD)).toEqual([
      'edit',
      'rename',
      'duplicate',
      'copyToVariant',
      'group:group-1',
      'copyLink',
      'delete',
    ]);
    expect(menuEntriesOf(ruleItem(IN_GROUP), STANDARD)).toContainEqual({
      id: 'group',
      scope: 'group-1',
    });
  });

  it('FR-036 (#61, F30): a rule in a top-level group without another rule directly in it offers no grouping', () => {
    expect(show(ruleItem(IN_GROUP, { neighbours: false }), STANDARD)).not.toContain(
      'group:group-1'
    );
    expect(show(ruleItem(IN_GROUP, { neighbours: false }), STANDARD)).toEqual([
      'edit',
      'rename',
      'duplicate',
      'copyToVariant',
      'copyLink',
      'delete',
    ]);
  });

  it('FR-036 (#22, #48, F30; 002-S2.10): a rule in a sub-group never offers grouping', () => {
    expect(show(ruleItem(IN_SUB_GROUP), STANDARD)).toEqual([
      'edit',
      'rename',
      'duplicate',
      'copyToVariant',
      'copyLink',
      'delete',
    ]);
  });

  it('FR-036 (#64, Implement Q2; U57 #22 a Figma error): a top-level group offers no grouping, with or without a neighbour', () => {
    expect(show(groupItem('group'), STANDARD)).toEqual([
      'rename',
      'addMessage',
      'ungroup',
      'copyLink',
      'delete',
    ]);
    expect(show(groupItem('group', { neighbours: false }), STANDARD)).toEqual([
      'rename',
      'addMessage',
      'ungroup',
      'copyLink',
      'delete',
    ]);
  });

  it('FR-036 (#48, #61, F30; U55 #30, U58 #20): a group holding a sub-group offers no grouping', () => {
    expect(show(groupItem('group', { holdsSubGroup: true }), STANDARD)).toEqual([
      'rename',
      'addMessage',
      'ungroup',
      'copyLink',
      'delete',
    ]);
  });

  it('FR-036 (#22, F30; U56 #25): a sub-group’s menu never offers grouping', () => {
    expect(show(groupItem('sub-group'), STANDARD)).toEqual([
      'rename',
      'addMessage',
      'ungroup',
      'copyLink',
      'delete',
    ]);
  });

  it('FR-036 (#54, W22): Remove message sits next to Add message while the group has one, Add message alone otherwise', () => {
    expect(show(groupItem('group', { hasMessage: true }), STANDARD)).toEqual([
      'rename',
      'addMessage',
      'removeMessage',
      'ungroup',
      'copyLink',
      'delete',
    ]);
    expect(show(groupItem('sub-group', { hasMessage: true }), STANDARD)).toEqual([
      'rename',
      'addMessage',
      'removeMessage',
      'ungroup',
      'copyLink',
      'delete',
    ]);
    expect(show(groupItem('group'), STANDARD)).not.toContain('removeMessage');
  });

  it('FR-036 (#53, #54, F69; U58 #19–#22): in a variant, a group linked to Standard has no Rename or Ungroup, and is removed from the variant', () => {
    // U58's changed Group 01, which holds Sub-group 01: Add message, Reset to Standard, F29's Copy
    // link, "Remove from Ambulance"
    expect(
      show(groupItem('group', { linked: true, changed: true, holdsSubGroup: true }), VARIANT)
    ).toEqual(['addMessage', 'reset', 'copyLink', 'remove']);
    expect(show(groupItem('sub-group', { linked: true, hasMessage: true }), VARIANT)).toEqual([
      'addMessage',
      'removeMessage',
      'copyLink',
      'remove',
    ]);
    // A group added in the variant isn't linked: the whole menu
    expect(show(groupItem('group'), VARIANT)).toEqual(show(groupItem('group'), STANDARD));
  });

  it('FR-036 (#48, #53, #64; U56 #38, U57 #18): rules linked to Standard keep Group with other rules, groups have none', () => {
    expect(show(groupItem('group', { linked: true }), VARIANT)).toEqual([
      'addMessage',
      'copyLink',
      'remove',
    ]);
    expect(show(ruleItem(IN_GROUP, { linked: true }), VARIANT)).toContain('group:group-1');
  });

  it('002-S4.4, 002-S4.5, 007-S4.1 (Q21, #22): every variant tab offers Rename and Copy link, and Delete variant except on Standard', () => {
    expect(show({ kind: 'variant' }, STANDARD)).toEqual(['rename', 'copyLink']);
    expect(show({ kind: 'variant' }, VARIANT)).toEqual(['rename', 'copyLink', 'delete']);
  });

  it('FR-036, 007-S4.1 (U54 #2): every menu keeps the order, Copy link last before its one destructive entry', () => {
    const flags = [false, true];
    const items: MenuItem[] = [{ kind: 'variant' }];
    for (const linked of flags) {
      for (const changed of flags) {
        for (const removed of flags) {
          for (const neighbours of flags) {
            const state = { linked, changed, removed, neighbours };
            for (const level of [TOP, IN_GROUP, IN_SUB_GROUP]) {
              for (const receivable of flags) {
                items.push({ kind: 'rule', receivable, ...level, ...state });
              }
            }
            for (const kind of ['group', 'sub-group'] as const) {
              for (const hasMessage of flags) {
                for (const holdsSubGroup of flags) {
                  items.push({ kind, hasMessage, holdsSubGroup, ...state });
                }
              }
            }
          }
        }
      }
    }
    for (const context of [STANDARD, VARIANT, UNSAVED, { ...VARIANT, linkable: false }]) {
      for (const item of items) {
        const shown = menuEntriesOf(item, context).map((entry) => entry.id);
        const positions = shown.map((id) => MENU_ENTRY_ORDER.indexOf(id));
        expect(positions).toEqual([...positions].sort((a, b) => a - b));
        expect(new Set(shown).size).toBe(shown.length);
        const destructive = shown.filter((id) => id === 'remove' || id === 'delete');
        expect(destructive.length).toBeLessThanOrEqual(1);
        if (destructive.length === 1) {
          expect(shown[shown.length - 1]).toBe(destructive[0]);
        }
        expect(shown.includes('copyLink')).toBe(context.linkable);
        if (context.linkable) {
          expect(shown[shown.length - 1 - destructive.length]).toBe('copyLink');
        }
        const removedItem = item.kind !== 'variant' && item.removed;
        expect(shown.includes('restore')).toBe(removedItem);
        if (removedItem) {
          expect(shown).toEqual(context.linkable ? ['restore', 'copyLink'] : ['restore']);
        }
      }
    }
  });
});

describe('menuItemOf (FR-036; CLAR #48, #53, #60, #61)', () => {
  const r = (number: number) => rule(number, null, null);
  const marked = <T extends RuleTreeItem>(item: T, mark: Mark): T => ({ ...item, mark });

  function menuBranch(
    key: string,
    origin: RulesBranch['origin'],
    items: RuleTreeItem[]
  ): RulesBranch {
    return {
      key,
      id: key,
      name: key,
      description: null,
      origin,
      operator: 'and',
      operator_mark: null,
      items,
    };
  }

  /** The item of Standard alone, with these items */
  function inStandard(items: RuleTreeItem[], itemId: string): MenuItem | null {
    return menuItemOf([menuBranch('main', 'main', items)], 'main', itemId);
  }

  function neighboursOf(items: RuleTreeItem[], itemId: string): boolean | undefined {
    const item = inStandard(items, itemId);
    return item && item.kind !== 'variant' ? item.neighbours : undefined;
  }

  const TREE = [r(1), group(1, [r(2), r(3), group(2, [r(4), r(5)], 'Sub-group 02')])];

  it('places a rule at the top level, directly in a group or in a sub-group, and tells groups from sub-groups', () => {
    expect(inStandard(TREE, 'rule-1')).toMatchObject({ kind: 'rule', level: 'top' });
    expect(inStandard(TREE, 'rule-2')).toMatchObject({
      kind: 'rule',
      level: 'group',
      groupId: 'group-1',
    });
    expect(inStandard(TREE, 'rule-4')).toMatchObject({ kind: 'rule', level: 'sub-group' });
    expect(inStandard(TREE, 'group-1')).toMatchObject({
      kind: 'group',
      holdsSubGroup: true,
      hasMessage: false,
    });
    expect(inStandard(TREE, 'group-2')).toMatchObject({ kind: 'sub-group', holdsSubGroup: false });
    expect(inStandard(TREE, 'rule-9')).toBeNull();
    expect(menuItemOf([menuBranch('main', 'main', TREE)], 'other', 'rule-1')).toBeNull();
  });

  it('FR-036 (#54, W22): tells a group with a message of its own, an empty one just added too', () => {
    const items = [group(1, [r(1), r(2)]), group(2, [r(3), r(4)])];
    items[0] = { ...(items[0] as GroupItem), message: 'You need both.' };
    items[1] = { ...(items[1] as GroupItem), message: '' };
    expect(inStandard(items, 'group-1')).toMatchObject({ hasMessage: true });
    expect(inStandard(items, 'group-2')).toMatchObject({ hasMessage: true });
    expect(inStandard(TREE, 'group-2')).toMatchObject({ hasMessage: false });
  });

  it('FR-036 (#48, #64): at the top level, another rule is a neighbour, a group is none (grouping a group is deferred)', () => {
    expect(neighboursOf([r(1)], 'rule-1')).toBe(false);
    expect(neighboursOf([r(1), r(2)], 'rule-1')).toBe(true);
    expect(neighboursOf([r(1), group(1, [r(2), r(3)])], 'rule-1')).toBe(false);
    expect(neighboursOf([r(1), r(2), group(1, [r(3), r(4)])], 'rule-1')).toBe(true);
    expect(neighboursOf([group(1, [r(1), r(2)]), group(2, [r(3), r(4)])], 'group-1')).toBe(false);
  });

  it('FR-036 (#48, #61; 002-S2.10): a group holding a sub-group is no neighbour at the top level, since it can’t become one', () => {
    expect(neighboursOf(TREE, 'rule-1')).toBe(false);
    expect(neighboursOf([...TREE, r(6)], 'rule-1')).toBe(true);
  });

  it('FR-036 (#60): a rule in a top-level group has another rule directly in it as neighbour, whether or not the group holds a sub-group', () => {
    expect(neighboursOf(TREE, 'rule-2')).toBe(true);
    expect(neighboursOf([group(1, [r(2), r(3)])], 'rule-2')).toBe(true);
    const item = inStandard(TREE, 'rule-2');
    expect(item && menuEntriesOf(item, { branchKind: 'standard', linkable: true })).toContainEqual({
      id: 'group',
      scope: 'group-1',
    });
  });

  it('FR-036 (#61, F30; U34 #26): a sub-group, or a rule outside the group, is no neighbour of a rule in a group', () => {
    // U34 frame 2.3: Rule 03 in Group 01 beside Sub-group 01 only, next to a top-level rule
    const items = [r(1), group(1, [r(3), group(2, [r(4), r(5)], 'Sub-group 01')])];
    expect(neighboursOf(items, 'rule-3')).toBe(false);
    const item = inStandard(items, 'rule-3');
    expect(
      item && menuEntriesOf(item, { branchKind: 'standard', linkable: true }).map(({ id }) => id)
    ).toEqual(['edit', 'rename', 'duplicate', 'copyLink', 'delete']);
  });

  it('FR-036 (#22, #48; 002-S2.10): a rule in a sub-group has no neighbour', () => {
    expect(neighboursOf(TREE, 'rule-4')).toBe(false);
  });

  it('FR-024, F13: removed items and groups dissolved in a based variant are no neighbours, and the dissolved group counts as removed', () => {
    const items = [r(1), r(2), group(1, [r(3), r(4)])];
    const variant = menuBranch('ambulance', 'based', [
      r(1),
      marked(r(2), 'removed'),
      group(1, [r(3), marked(r(4), 'removed')]),
    ]);
    const branches = [menuBranch('main', 'main', items), variant];
    expect(menuItemOf(branches, 'ambulance', 'rule-1')).toMatchObject({ neighbours: false });
    expect(menuItemOf(branches, 'main', 'rule-1')).toMatchObject({ neighbours: true });
    expect(menuItemOf(branches, 'ambulance', 'group-1')).toMatchObject({
      kind: 'group',
      removed: true,
    });
    expect(menuItemOf(branches, 'ambulance', 'rule-2')).toMatchObject({ removed: true });
    // Rule 03 stays alone in the dissolved group: nothing to group it with there
    expect(menuItemOf(branches, 'ambulance', 'rule-3')).toMatchObject({
      level: 'group',
      neighbours: false,
      removed: false,
    });
  });

  it('FR-036 (#53): in a based variant, inherited items are linked, changed ones changed, added ones not linked; elsewhere nothing is', () => {
    const items = [r(1), r(2), group(1, [r(3), r(4)])];
    const variant = menuBranch('ambulance', 'based', [
      r(1),
      marked(r(2), 'changed'),
      marked(group(1, [r(3), r(4)]), 'changed'),
      marked(r(9), 'added'),
    ]);
    const empty = menuBranch('taxi', 'empty', [r(10)]);
    const branches = [menuBranch('main', 'main', items), variant, empty];
    const state = (key: string, id: string) => {
      const item = menuItemOf(branches, key, id);
      return item && item.kind !== 'variant'
        ? { linked: item.linked, changed: item.changed, removed: item.removed }
        : null;
    };
    expect(state('ambulance', 'rule-1')).toEqual({ linked: true, changed: false, removed: false });
    expect(state('ambulance', 'rule-2')).toEqual({ linked: true, changed: true, removed: false });
    expect(state('ambulance', 'group-1')).toEqual({ linked: true, changed: true, removed: false });
    expect(state('ambulance', 'rule-3')).toEqual({ linked: true, changed: false, removed: false });
    expect(state('ambulance', 'rule-9')).toEqual({ linked: false, changed: false, removed: false });
    expect(state('main', 'rule-1')).toEqual({ linked: false, changed: false, removed: false });
    expect(state('taxi', 'rule-10')).toEqual({ linked: false, changed: false, removed: false });
  });

  describe('Copy to variant (FR-036; CLAR #53; build note U54 #4)', () => {
    const items = [r(1), group(1, [r(2), r(3)])];
    const main = menuBranch('main', 'main', items);
    const receivable = (branches: RulesBranch[], key: string, id: string) => {
      const item = menuItemOf(branches, key, id);
      return item?.kind === 'rule' ? item.receivable : undefined;
    };

    it('has nothing to copy to without a variant', () => {
      expect(receivable([main], 'main', 'rule-1')).toBe(false);
    });

    it('copies a Standard rule only while some variant isn’t linked to it or removed it', () => {
      const linked = menuBranch('ambulance', 'based', items);
      expect(receivable([main, linked], 'main', 'rule-1')).toBe(false);
      // A variant that changed it is still linked to it
      const changed = menuBranch('ambulance', 'based', [marked(r(1), 'changed'), items[1]]);
      expect(receivable([main, changed], 'main', 'rule-1')).toBe(false);
      const removed = menuBranch('ambulance', 'based', [marked(r(1), 'removed'), items[1]]);
      expect(receivable([main, removed], 'main', 'rule-1')).toBe(true);
      // Removed with its group
      const groupRemoved = menuBranch('ambulance', 'based', [r(1), marked(items[1], 'removed')]);
      expect(receivable([main, groupRemoved], 'main', 'rule-2')).toBe(true);
      expect(receivable([main, groupRemoved], 'main', 'rule-1')).toBe(false);
      // Removed inside its group, which that dissolves there; its other member stays
      const memberRemoved = menuBranch('ambulance', 'based', [
        r(1),
        group(1, [r(2), marked(r(3), 'removed')]),
      ]);
      expect(receivable([main, memberRemoved], 'main', 'rule-3')).toBe(true);
      expect(receivable([main, memberRemoved], 'main', 'rule-2')).toBe(false);
      // Held in a sub-group too
      const deep = [group(1, [r(2), group(2, [r(4), r(5)], 'Sub-group 02')])];
      expect(
        receivable(
          [menuBranch('main', 'main', deep), menuBranch('ambulance', 'based', deep)],
          'main',
          'rule-4'
        )
      ).toBe(false);
      const empty = menuBranch('taxi', 'empty', []);
      expect(receivable([main, linked, empty], 'main', 'rule-1')).toBe(true);
    });

    it('copies a variant’s rule that follows Standard only while another variant doesn’t hold it', () => {
      const ambulance = menuBranch('ambulance', 'based', items);
      expect(receivable([main, ambulance], 'ambulance', 'rule-1')).toBe(false);
      const school = menuBranch('school', 'based', items);
      expect(receivable([main, ambulance, school], 'ambulance', 'rule-1')).toBe(false);
      const schoolRemoved = menuBranch('school', 'based', [marked(r(1), 'removed'), items[1]]);
      expect(receivable([main, ambulance, schoolRemoved], 'ambulance', 'rule-1')).toBe(true);
      const empty = menuBranch('taxi', 'empty', []);
      expect(receivable([main, ambulance, empty], 'ambulance', 'rule-1')).toBe(true);
    });

    it('always copies a rule added or changed in its variant', () => {
      const ambulance = menuBranch('ambulance', 'based', [
        marked(r(1), 'changed'),
        items[1],
        marked(r(9), 'added'),
      ]);
      expect(receivable([main, ambulance], 'ambulance', 'rule-1')).toBe(true);
      expect(receivable([main, ambulance], 'ambulance', 'rule-9')).toBe(true);
      expect(receivable([main, ambulance], 'ambulance', 'rule-2')).toBe(false);
    });

    it('copies a rule of a variant that started empty: no other variant holds it', () => {
      const taxi = menuBranch('taxi', 'empty', [r(10)]);
      expect(receivable([main, taxi], 'taxi', 'rule-10')).toBe(true);
    });
  });
});

describe('selectableIn (FR-036, FR-038; CLAR #60, #61, #64)', () => {
  const r = (number: number) => rule(number, null, null);

  it('chooses rules, never a group or sub-group (#64: grouping a group is deferred)', () => {
    expect(selectableIn(r(1))).toBe(true);
    expect(selectableIn(group(1, [r(1), r(2)]))).toBe(false);
    expect(selectableIn(group(1, [r(1), group(2, [r(2), r(3)])]))).toBe(false);
  });

  it('chooses no removed rule', () => {
    expect(selectableIn({ ...r(1), mark: 'removed' })).toBe(false);
  });
});

describe('unrequestedNoteOf (U50 6197:10708, 7173:52351; FR-023)', () => {
  const onBirthdate = rule(2, target('pid', 'birthdate'), null);
  const pidWithout = { ...PID, fields: PID.fields.filter((field) => field.key !== 'birthdate') };

  it('names the field no longer requested', () => {
    expect(unrequestedNoteOf(onBirthdate, [pidWithout, MDL], [PID, MDL], 'en')).toBe(
      'Date of birth is no longer requested.'
    );
  });

  it('names the document while the whole document is no longer requested', () => {
    expect(unrequestedNoteOf(onBirthdate, [MDL], [PID, MDL], 'en')).toBe(
      'Personal ID is no longer requested.'
    );
  });

  it('gives null for a target the catalog doesn’t know', () => {
    expect(
      unrequestedNoteOf(rule(3, target('xyz', 'a'), null), [MDL], [PID, MDL], 'en')
    ).toBeNull();
    expect(unrequestedNoteOf(rule(4, null, null), [MDL], [PID, MDL], 'en')).toBeNull();
  });
});

describe('editorMessageHintOf (U35 6965:50822; F32)', () => {
  const member = rule(2, null, null);
  const inner: GroupItem = {
    type: 'group',
    id: 'group-2',
    name: 'Sub-group 02',
    mark: null,
    operator: 'and',
    message: null,
    items: [member, rule(3, null, null)],
  };
  const outer: GroupItem = {
    type: 'group',
    id: 'group-1',
    name: 'Group 01',
    mark: null,
    operator: 'or',
    message: 'You need a class C or D licence.',
    items: [rule(4, null, null), inner],
  };
  const first = rule(1, null, null);
  const items: RuleTreeItem[] = [first, outer];
  const editing = (original: typeof member | null, parentId: string | null) => ({
    branchKey: 'main',
    parentId,
    original,
    draft: member,
  });

  it('names the outermost group with a message around the rule', () => {
    expect(editorMessageHintOf(items, editing(member, null), 'en')).toBe(
      'Not shown while this rule is in Group 01. Citizens see the group message instead.'
    );
  });

  it('takes a new rule’s group', () => {
    expect(editorMessageHintOf(items, editing(null, 'group-2'), 'en')).toContain('Group 01');
  });

  it('gives null outside a group with a message', () => {
    expect(editorMessageHintOf(items, editing(first, null), 'en')).toBeNull();
    expect(editorMessageHintOf(items, editing(null, null), 'en')).toBeNull();
  });
});

describe('in German (spec 009, T037; glossary G§2, G§3)', () => {
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

  it('lists names with "und"', () => {
    expect(joinNames(['Rule 01', 'Rule 02', 'Rule 03'], 'de')).toBe('Rule 01, Rule 02 und Rule 03');
  });

  it('says what is chosen and what grouping makes', () => {
    const branch = stateWith([group(1, FLAT)]).branches[0];
    expect(selectionText({ branchKey: BRANCH, parentId: null, ids: [] }, branch, 'de')).toBe(
      'Wählen Sie zwei oder mehr Regeln zum Gruppieren.'
    );
    expect(
      selectionText({ branchKey: BRANCH, parentId: 'group-1', ids: ['rule-2'] }, branch, 'de')
    ).toBe('Wählen Sie mindestens eine weitere Regel, um sie mit Rule 02 zu gruppieren.');
    expect(
      selectionText(
        { branchKey: BRANCH, parentId: 'group-1', ids: ['rule-2', 'rule-1'] },
        branch,
        'de'
      )
    ).toBe('2 Regeln ausgewählt. Sie werden zu einer Untergruppe von Group 01.');
    expect(
      selectionText({ branchKey: BRANCH, parentId: null, ids: ['a', 'b', 'c'] }, branch, 'de')
    ).toBe('3 Regeln ausgewählt');
  });

  it('words the toasts in the language of the action, the stored names unchanged', () => {
    const grouped = run(
      stateWith(FLAT),
      { type: 'startSelect', branchKey: BRANCH, itemId: 'rule-2' },
      { type: 'toggleSelect', itemId: 'rule-3' },
      { type: 'groupSelected', language: 'de' }
    );
    expect(grouped.toast).toMatchObject({
      message: 'Rule 02 und Rule 03 sind jetzt in Group 03.',
      actionLabel: 'Rückgängig',
    });
    const ungrouped = run(stateWith(items), {
      type: 'ungroup',
      branchKey: BRANCH,
      groupId: 'group-1',
      language: 'de',
    });
    expect(ungrouped.toast?.message).toBe('Gruppierung von Group 01 in Standard aufgehoben.');
    const withMessage = stateWith([rule(1, null, null), { ...group(1, FLAT), message: 'Both.' }]);
    expect(
      run(withMessage, { type: 'ungroup', branchKey: BRANCH, groupId: 'group-1', language: 'de' })
        .toast?.message
    ).toBe(
      'Gruppierung aufgehoben. Rule 01, Rule 02 und Rule 03 verwenden wieder ihre eigenen Nachrichten.'
    );
    const deleted = run(
      stateWith(items),
      { type: 'askDelete', branchKey: BRANCH, ruleId: 'rule-1' },
      { type: 'confirmDelete', language: 'de' }
    );
    expect(deleted.toast).toMatchObject({
      message: 'Rule 01 gelöscht.',
      actionLabel: 'Rückgängig',
    });
    const saved = run(
      stateWith(items),
      { type: 'editRule', branchKey: BRANCH, ruleId: 'rule-1' },
      { type: 'saveRule', language: 'de' }
    );
    expect(saved.toast?.message).toBe('Rule 01 gespeichert.');
    const state = withVariants('based', 'based');
    const inVariant = run(
      state,
      { type: 'startSelect', branchKey: 'new-1', itemId: 'rule-2' },
      { type: 'toggleSelect', itemId: 'rule-3' },
      { type: 'groupSelected', language: 'de' }
    );
    expect(inVariant.toast?.message).toBe(
      'Nur in Ambulance gruppiert. Standard bleibt unverändert.'
    );
    const copied = run(
      withVariants('empty', 'empty'),
      { type: 'askCopyRule', branchKey: BRANCH, ruleId: 'rule-1' },
      { type: 'copyRule', targets: ['new-1', 'new-2'], language: 'de' }
    );
    expect(copied.toast).toMatchObject({
      message: 'Rule 01 in Ambulance und School transport kopiert.',
      actionLabel: 'Anzeigen',
    });
    const variantDeleted = run(
      state,
      { type: 'askDeleteVariant', branchKey: 'new-2' },
      { type: 'confirmDelete', language: 'de' }
    );
    expect(variantDeleted.toast?.message).toBe('School transport gelöscht.');
  });

  it('words the note after switching AND or OR', () => {
    const switched = run(stateWith(items), {
      type: 'switchOperator',
      branchKey: BRANCH,
      parentId: 'group-1',
      operator: 'or',
    });
    expect(switchNoteOf(switched, switched.branches[0], 'group-1', 'de')).toBe(
      'Für Group 01 muss jetzt nur noch eine Regel erfüllt sein.'
    );
    const back = run(switched, {
      type: 'switchOperator',
      branchKey: BRANCH,
      parentId: null,
      operator: 'or',
    });
    expect(switchNoteOf(back, back.branches[0], null, 'de')).toBe(
      'Für Standard muss jetzt nur noch eine Regel erfüllt sein.'
    );
  });

  it('words Standard’s delete confirmations', () => {
    const text = (state: RulesState, itemId: string, statement: string | null = null) =>
      deleteDialogText(state, { branchKey: BRANCH, itemId }, statement, 'de');
    expect(
      text(
        stateWith(items),
        'rule-1',
        'Personalausweis · Geburtsdatum (Alter) ist mindestens 21 Jahre alt'
      )
    ).toBe(
      'Bürgerinnen und Bürger werden nicht mehr auf „Personalausweis · Geburtsdatum (Alter) ist mindestens 21 Jahre alt“ geprüft. Sie können das direkt danach rückgängig machen.'
    );
    expect(text(stateWith(items), 'group-1')).toBe(
      'Group 01 und die Regeln darin werden gelöscht. Sie können das direkt danach rückgängig machen.'
    );
    const switched = run(withVariants('based', 'based', 'empty'), {
      type: 'switchOperator',
      branchKey: 'new-1',
      parentId: 'group-1',
      operator: 'or',
    });
    expect(text(switched, 'rule-2')).toBe(
      'Dadurch wird die Regel aus Standard und aus den Varianten gelöscht, die Standard folgen: Ambulance und School transport. Hat eine Variante diese Regel geändert, behält sie ihre eigene Version. Group 01 enthält nur noch eine Regel, daher wird die Gruppierung in Standard und den darauf basierenden Varianten aufgehoben. Die Änderungen von Ambulance an Group 01 entfallen damit.'
    );
    const changed = run(
      withVariants('based'),
      { type: 'startRename', branchKey: 'new-1', itemId: 'rule-3' },
      { type: 'rename', name: 'Held B' }
    );
    expect(text(changed, 'group-1')).toBe(
      'Diese Gruppe und die Regeln darin werden aus Standard und aus den Varianten entfernt, die Standard folgen. Ambulance hat Rule 03 geändert und behält ihre eigene Version. Sie können das direkt danach rückgängig machen.'
    );
  });

  it('words the link strip’s removals with explicit plural forms', () => {
    const removed = (...ids: string[]) =>
      linkStripSummaryOf(
        run(
          withVariants('based'),
          ...ids.map((itemId): RulesAction => ({ type: 'removeItem', branchKey: 'new-1', itemId }))
        ).branches[1],
        'Standard',
        'de'
      );
    expect(removed('rule-1')).toBe('1 von 3 Regeln aus Standard ist hier entfernt.');
    expect(removed('rule-1', 'rule-3')).toBe('2 von 3 Regeln aus Standard sind hier entfernt.');
    expect(removed('group-1')).toBe('Group 01 ist hier entfernt.');
  });

  it('words the notes on data no longer requested and on a group’s message', () => {
    const onBirthdate = rule(2, target('pid', 'birthdate'), null);
    expect(unrequestedNoteOf(onBirthdate, [MDL], [PID, MDL], 'de')).toBe(
      'Personal ID wird nicht mehr angefordert.'
    );
    const withMessage = [{ ...group(1, FLAT), message: 'Both.' }];
    expect(
      editorMessageHintOf(
        withMessage,
        { branchKey: BRANCH, parentId: null, original: FLAT[0], draft: FLAT[0] },
        'de'
      )
    ).toBe(
      'Wird nicht angezeigt, solange diese Regel in Group 01 ist. Bürgerinnen und Bürger sehen stattdessen die Nachricht der Gruppe.'
    );
  });

  it('refuses a variant name in the server’s German', () => {
    const state = withVariants('based');
    const form = (name: string) => ({ ...initialVariantForm(), name });
    expect(variantFormProblem(form(''), state, null, 'de')).toBe(
      'Geben Sie einen Namen für die Variante ein.'
    );
    expect(variantFormProblem(form('ambulance'), state, null, 'de')).toBe(
      'Es gibt bereits eine Variante namens „Ambulance“.'
    );
    expect(variantFormProblem(form('Taxi'), state, null, 'de')).toBeNull();
  });

  it('gives the kind text of a single line in German', () => {
    const line: BannerLine = {
      kind: 'redundant',
      tone: 'info',
      parts: [{ itemId: 'rule-1', name: 'Rule 01' }, ' ist gleich wie Rule 02.'],
    };
    const view = bannerViewOf(
      { kind: 'info', lines: [line], counts: '', notice: null, incomplete: null, head: line.parts },
      false,
      'de'
    );
    expect(view.summary.kindText).toBe('Redundant:');
    const conflict: BannerLine = { ...line, kind: 'conflicting', tone: 'warning' };
    expect(
      bannerViewOf(
        {
          kind: 'warning',
          lines: [conflict, line],
          counts: '',
          notice: null,
          incomplete: null,
          head: [],
        },
        true,
        'de'
      ).items.map((item) => item.kindText)
    ).toEqual(['Widersprüchlich:', 'Redundant:']);
  });
});
