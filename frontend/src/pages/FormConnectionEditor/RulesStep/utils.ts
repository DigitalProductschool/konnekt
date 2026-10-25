import type {
  FormConnection,
  GroupItem,
  RuleItem,
  RuleTreeItem,
} from '../../../types/form-connections';
import {
  addRule,
  deleteItem,
  duplicateRule,
  findItem,
  flattenItems,
  groupItems,
  newRule,
  numberOfId,
  replaceItem,
  setGroupMessage,
  setOperator,
  undoChange,
  ungroupItem,
} from '../../../utils/rules/tree';
import { MAIN_BRANCH_KEY, MAIN_BRANCH_NAME, RULES_COPY } from './constants';
import type {
  RenameAction,
  RenameField,
  RulesAction,
  RulesBranch,
  RulesSelection,
  RulesState,
  SwitchedLevel,
} from './types';

/**
 * The step's first state: the connection's branches and counters when editing; a main branch
 * "Standard" without rules, numbering from 1, when creating (FR-018).
 */
export function initialRulesState(formConnection?: FormConnection): RulesState {
  const branches: RulesBranch[] = formConnection
    ? formConnection.branches.map((branch) => ({
        key: branch.id,
        id: branch.id,
        name: branch.name,
        description: branch.description,
        origin: branch.origin,
        operator: branch.operator,
        operator_mark: branch.operator_mark,
        items: branch.items,
      }))
    : [
        {
          key: MAIN_BRANCH_KEY,
          id: null,
          name: MAIN_BRANCH_NAME,
          description: null,
          origin: 'main',
          operator: 'and',
          operator_mark: null,
          items: [],
        },
      ];
  const counters = formConnection
    ? { rule: formConnection.next_rule_number, group: formConnection.next_group_number }
    : { rule: 1, group: 1 };
  return {
    branches,
    openBranch: branches[0].key,
    counters,
    numberingBase: counters,
    ruleSetVersion: formConnection?.rule_set_version ?? null,
    editing: null,
    renaming: null,
    dialog: null,
    toast: null,
    undo: null,
    problem: null,
    selection: null,
    switched: null,
  };
}

/**
 * Moves the focus once the current render, and a dialog it closes, are done: a modal dialog
 * keeps the page inert until it closes, and then gives the focus back to what opened it.
 */
export function focusSoon(id: string, fallbackId?: string) {
  requestAnimationFrame(() => {
    const element =
      document.getElementById(id) ?? (fallbackId ? document.getElementById(fallbackId) : null);
    element?.focus();
  });
}

/** The items of a level of a branch: a group's members, or the top level for null. */
export function levelItems(items: RuleTreeItem[], parentId: string | null): RuleTreeItem[] {
  if (parentId === null) {
    return items;
  }
  const found = findItem(items, parentId);
  return found?.item.type === 'group' ? found.item.items : [];
}

/**
 * Where the focus goes when an item leaves the list: the next item of its level, or the one
 * before it. A group left with one member is dissolved, and that member takes its place.
 */
export function neighbourOf(state: RulesState, branchKey: string, itemId: string): string | null {
  const items = branchOf(state, branchKey)?.items ?? [];
  const found = findItem(items, itemId);
  if (!found) {
    return null;
  }
  const level = levelItems(items, found.parentId);
  return (level[found.index + 1] ?? level[found.index - 1])?.id ?? null;
}

/** The inline rename field: what is typed, and why it was refused. */
export function renameReducer(field: RenameField, action: RenameAction): RenameField {
  switch (action.type) {
    case 'reset':
      return { value: action.value, error: null };
    case 'change':
      return { value: action.value, error: null };
    case 'refuse':
      return { ...field, error: action.error };
  }
}

export function branchOf(state: RulesState, branchKey: string): RulesBranch | undefined {
  return state.branches.find((branch) => branch.key === branchKey);
}

/** A rule of a branch, or null. */
export function ruleOf(branch: RulesBranch | undefined, ruleId: string): RuleItem | null {
  const found = branch ? findItem(branch.items, ruleId) : null;
  return found?.item.type === 'rule' ? found.item : null;
}

/** A group or sub-group of a branch, or null. */
export function groupOf(branch: RulesBranch | undefined, groupId: string): GroupItem | null {
  const found = branch ? findItem(branch.items, groupId) : null;
  return found?.item.type === 'group' ? found.item : null;
}

/** Whether the open rule editor holds changes that "Save changes to Rule 01?" asks about. */
export function hasUnsavedChanges(state: RulesState): boolean {
  const { editing } = state;
  if (!editing) {
    return false;
  }
  const { draft, original } = editing;
  if (!original) {
    // A new rule: anything chosen or typed counts
    return draft.target !== null || draft.condition !== null || draft.message.trim() !== '';
  }
  return JSON.stringify(draft) !== JSON.stringify(original);
}

/** Names as the toasts list them: "Rule 02 and Rule 03", "Rule 02, Rule 03 and Rule 04". */
export function joinNames(names: string[]): string {
  if (names.length < 2) {
    return names.join('');
  }
  return `${names.slice(0, -1).join(', ')} ${RULES_COPY.and} ${names[names.length - 1]}`;
}

/** The selection bar's text (U16): what is chosen, and what grouping it makes. */
export function selectionText(selection: RulesSelection, branch: RulesBranch): string {
  const { ids, parentId } = selection;
  if (ids.length === 0) {
    return RULES_COPY.selectTwo;
  }
  if (ids.length === 1) {
    const rule = findItem(branch.items, ids[0])?.item;
    return RULES_COPY.selectOneMore(rule?.name ?? '');
  }
  const group = parentId === null ? null : findItem(branch.items, parentId)?.item;
  return group
    ? RULES_COPY.selectedSubGroup(ids.length, group.name)
    : RULES_COPY.selected(ids.length);
}

/** The note after switching a level's AND or OR, if this level was just switched. */
export function switchNoteOf(
  state: RulesState,
  branch: RulesBranch,
  parentId: string | null
): string | null {
  const { switched } = state;
  if (!switched || switched.branchKey !== branch.key || switched.parentId !== parentId) {
    return null;
  }
  const level =
    parentId === null ? branch.name.trim() : (findItem(branch.items, parentId)?.item.name ?? '');
  return switched.operator === 'or'
    ? RULES_COPY.switchedToOr(level)
    : RULES_COPY.switchedToAnd(level);
}

/** The refused Publish's problem, if it names this item of the branch (F11). */
export function problemFlagOf(
  state: RulesState,
  branch: RulesBranch,
  itemId: string
): string | null {
  const { problem } = state;
  if (!problem || problem.itemId !== itemId || problem.branchIndex === null) {
    return null;
  }
  return state.branches[problem.branchIndex]?.key === branch.key ? problem.message : null;
}

/** The sub-groups of a group, which "Delete Group 01?" names (design-notes §5). */
export function subGroupCount(group: GroupItem): number {
  return group.items.filter((member) => member.type === 'group').length;
}

function withItems(
  state: RulesState,
  branchKey: string,
  change: (items: RuleTreeItem[]) => RuleTreeItem[]
): RulesBranch[] {
  return state.branches.map((branch) =>
    branch.key === branchKey ? { ...branch, items: change(branch.items) } : branch
  );
}

function nextToastId(state: RulesState): number {
  return (state.toast?.id ?? 0) + 1;
}

/**
 * The state after a change of the rules. The change ends select mode and the note after
 * switching, and clears the refused Publish's problem. It also drops the last Undo, which puts
 * back the rules as they were before that change only: its toast stays, without its action.
 */
function changed(state: RulesState, branches: RulesBranch[]): RulesState {
  return {
    ...state,
    branches,
    problem: null,
    selection: null,
    switched: null,
    undo: null,
    toast: state.undo && state.toast ? { ...state.toast, actionLabel: undefined } : state.toast,
  };
}

/** A new rule that was never saved gives its number back, so the next one shows it again. */
function releaseNumber(state: RulesState): RulesState['counters'] {
  const { editing, counters } = state;
  if (editing && !editing.original && numberOfId(editing.draft.id) === counters.rule - 1) {
    return { ...counters, rule: counters.rule - 1 };
  }
  return counters;
}

/** Whether the open editor's rule, or its new rule's group, is in a deleted item. */
function editorIsIn(state: RulesState, deleted: RuleTreeItem): boolean {
  const { editing } = state;
  if (!editing) {
    return false;
  }
  const ids = new Set(flattenItems([deleted]).map((item) => item.id));
  return ids.has(editing.draft.id) || (editing.parentId !== null && ids.has(editing.parentId));
}

function deleteFromBranch(state: RulesState, branchKey: string, itemId: string): RulesState {
  const branch = branchOf(state, branchKey);
  const deleted = branch && deleteItem(branch.items, itemId);
  if (!deleted) {
    return { ...state, dialog: null };
  }
  const name = deleted.deleted.name;
  return {
    ...changed(
      state,
      withItems(state, branchKey, () => deleted.items)
    ),
    // A rule open in the editor goes with its deletion
    editing: editorIsIn(state, deleted.deleted) ? null : state.editing,
    dialog: null,
    undo: { branchKey, change: deleted.undo },
    toast: {
      id: nextToastId(state),
      message:
        deleted.deleted.type === 'rule'
          ? RULES_COPY.ruleDeleted(name, branch.name)
          : RULES_COPY.groupDeleted(name, branch.name),
      actionLabel: RULES_COPY.undo,
    },
  };
}

export function rulesReducer(state: RulesState, action: RulesAction): RulesState {
  switch (action.type) {
    case 'addRule': {
      const { rule, counters } = newRule(state.counters);
      return {
        ...state,
        openBranch: action.branchKey,
        counters,
        editing: {
          branchKey: action.branchKey,
          parentId: action.parentId,
          original: null,
          draft: rule,
        },
        renaming: null,
        dialog: null,
        selection: null,
      };
    }
    case 'editRule': {
      const branch = branchOf(state, action.branchKey);
      const rule = ruleOf(branch, action.ruleId);
      if (!branch || !rule) {
        return state;
      }
      return {
        ...state,
        counters: releaseNumber(state),
        editing: {
          branchKey: action.branchKey,
          parentId: findItem(branch.items, rule.id)?.parentId ?? null,
          original: rule,
          draft: rule,
        },
        renaming: null,
        dialog: null,
        selection: null,
      };
    }
    case 'changeDraft':
      return state.editing
        ? { ...state, editing: { ...state.editing, draft: action.draft }, problem: null }
        : state;
    case 'saveRule': {
      const { editing } = state;
      if (!editing) {
        return state;
      }
      const branch = branchOf(state, editing.branchKey);
      const { draft } = editing;
      return {
        ...changed(
          state,
          withItems(state, editing.branchKey, (items) => {
            if (editing.original) {
              return replaceItem(items, draft);
            }
            // A new rule's group may have gone meanwhile: the rule then ends the top level
            const parentId =
              editing.parentId !== null && findItem(items, editing.parentId)
                ? editing.parentId
                : null;
            return addRule(items, draft, parentId);
          })
        ),
        editing: null,
        dialog: null,
        toast: {
          id: nextToastId(state),
          message: RULES_COPY.ruleSaved(draft.name, branch?.name ?? ''),
        },
      };
    }
    case 'closeEditor':
      return { ...state, counters: releaseNumber(state), editing: null, dialog: null };
    case 'startRename':
      return { ...state, renaming: { branchKey: action.branchKey, itemId: action.itemId } };
    case 'rename': {
      const { renaming } = state;
      if (!renaming) {
        return state;
      }
      const found = findItem(branchOf(state, renaming.branchKey)?.items ?? [], renaming.itemId);
      if (!found) {
        return { ...state, renaming: null };
      }
      return {
        ...changed(
          state,
          withItems(state, renaming.branchKey, (items) =>
            replaceItem(items, { ...found.item, name: action.name.trim() })
          )
        ),
        renaming: null,
      };
    }
    case 'cancelRename':
      return { ...state, renaming: null };
    case 'duplicateRule': {
      const branch = branchOf(state, action.branchKey);
      const duplicated = branch && duplicateRule(branch.items, action.ruleId, state.counters);
      if (!duplicated) {
        return state;
      }
      return {
        ...changed(
          state,
          withItems(state, action.branchKey, () => duplicated.items)
        ),
        counters: duplicated.counters,
      };
    }
    case 'askDelete':
      return {
        ...state,
        dialog: { type: 'deleteRule', branchKey: action.branchKey, ruleId: action.ruleId },
      };
    case 'askDeleteGroup':
      return {
        ...state,
        dialog: { type: 'deleteGroup', branchKey: action.branchKey, groupId: action.groupId },
      };
    case 'confirmDelete': {
      const { dialog } = state;
      if (dialog?.type === 'deleteRule') {
        return deleteFromBranch(state, dialog.branchKey, dialog.ruleId);
      }
      if (dialog?.type === 'deleteGroup') {
        return deleteFromBranch(state, dialog.branchKey, dialog.groupId);
      }
      return state;
    }
    case 'askSaveChanges':
      return { ...state, dialog: { type: 'saveChanges', next: action.next } };
    case 'closeDialog':
      return { ...state, dialog: null };
    case 'undo': {
      const { undo, counters } = state;
      if (!undo) {
        return { ...state, toast: null };
      }
      return {
        ...state,
        branches: withItems(state, undo.branchKey, (items) => undoChange(items, undo.change)),
        // An undone grouping gives its number back, so the next group shows it again
        counters:
          undo.groupNumber === counters.group - 1
            ? { ...counters, group: counters.group - 1 }
            : counters,
        undo: null,
        toast: null,
        problem: null,
        selection: null,
        switched: null,
      };
    }
    case 'dismissToast':
      return { ...state, toast: null, undo: null };
    case 'clearProblem':
      return { ...state, problem: null };
    case 'showProblem':
      return { ...state, problem: action.problem };
    case 'selectBranch':
      return { ...state, openBranch: action.branchKey, selection: null, switched: null };
    case 'switchOperator': {
      const branch = branchOf(state, action.branchKey);
      const switched = branch && setOperator(branch, action.parentId, action.operator);
      if (!switched) {
        return state;
      }
      const level: SwitchedLevel = {
        branchKey: action.branchKey,
        parentId: action.parentId,
        operator: action.operator,
      };
      return {
        ...changed(
          state,
          state.branches.map((entry) => (entry.key === action.branchKey ? switched.branch : entry))
        ),
        switched: level,
      };
    }
    case 'startSelect': {
      const found = findItem(branchOf(state, action.branchKey)?.items ?? [], action.itemId);
      if (!found) {
        return state;
      }
      return {
        ...state,
        selection: { branchKey: action.branchKey, parentId: found.parentId, ids: [action.itemId] },
        renaming: null,
      };
    }
    case 'toggleSelect': {
      const { selection } = state;
      if (!selection) {
        return state;
      }
      const ids = selection.ids.includes(action.itemId)
        ? selection.ids.filter((id) => id !== action.itemId)
        : [...selection.ids, action.itemId];
      return { ...state, selection: { ...selection, ids } };
    }
    case 'cancelSelect':
      return { ...state, selection: null };
    case 'groupSelected': {
      const { selection } = state;
      const branch = selection && branchOf(state, selection.branchKey);
      const grouped = branch && groupItems(branch.items, selection.ids, state.counters);
      if (!selection || !branch || !grouped) {
        return state;
      }
      const names = grouped.group.items.map((member) => member.name);
      return {
        ...changed(
          state,
          withItems(state, selection.branchKey, () => grouped.items)
        ),
        counters: grouped.counters,
        undo: {
          branchKey: selection.branchKey,
          change: grouped.undo,
          groupNumber: state.counters.group,
        },
        toast: {
          id: nextToastId(state),
          message: RULES_COPY.grouped(joinNames(names), branch.name, grouped.group.name),
          actionLabel: RULES_COPY.undo,
        },
      };
    }
    case 'ungroup': {
      const branch = branchOf(state, action.branchKey);
      const ungrouped = branch && ungroupItem(branch.items, action.groupId);
      if (!ungrouped) {
        return state;
      }
      return {
        ...changed(
          state,
          withItems(state, action.branchKey, () => ungrouped.items)
        ),
        undo: { branchKey: action.branchKey, change: ungrouped.undo },
        toast: {
          id: nextToastId(state),
          message: RULES_COPY.ungrouped(ungrouped.group.name, branch.name),
          actionLabel: RULES_COPY.undo,
        },
      };
    }
    case 'setGroupMessage': {
      const branch = branchOf(state, action.branchKey);
      const set = branch && setGroupMessage(branch.items, action.groupId, action.message);
      if (!set) {
        return state;
      }
      return changed(
        state,
        withItems(state, action.branchKey, () => set.items)
      );
    }
  }
}
