import type { FormConnection, RuleItem, RuleTreeItem } from '../../../types/form-connections';
import {
  deleteItem,
  duplicateRule,
  findItem,
  newRule,
  numberOfId,
  replaceItem,
  restoreItem,
} from '../../../utils/rules/tree';
import { MAIN_BRANCH_KEY, MAIN_BRANCH_NAME, RULES_COPY } from './constants';
import type { RenameAction, RenameField, RulesAction, RulesBranch, RulesState } from './types';

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

/** Where the focus goes when a rule leaves the list: the next rule, or the one before it. */
export function neighbourOf(state: RulesState, branchKey: string, ruleId: string): string | null {
  const items = branchOf(state, branchKey)?.items ?? [];
  const index = items.findIndex((item) => item.id === ruleId);
  return (items[index + 1] ?? items[index - 1])?.id ?? null;
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

/** The menu item that an arrow key, Home or End moves the focus to. */
export function nextMenuIndex(key: string, current: number, count: number): number {
  switch (key) {
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    case 'ArrowUp':
      return current <= 0 ? count - 1 : current - 1;
    default:
      return current < 0 || current >= count - 1 ? 0 : current + 1;
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

/** A new rule that was never saved gives its number back, so the next one shows it again. */
function releaseNumber(state: RulesState): RulesState['counters'] {
  const { editing, counters } = state;
  if (editing && !editing.original && numberOfId(editing.draft.id) === counters.rule - 1) {
    return { ...counters, rule: counters.rule - 1 };
  }
  return counters;
}

export function rulesReducer(state: RulesState, action: RulesAction): RulesState {
  switch (action.type) {
    case 'addRule': {
      const { rule, counters } = newRule(state.counters);
      return {
        ...state,
        openBranch: action.branchKey,
        counters,
        editing: { branchKey: action.branchKey, original: null, draft: rule },
        renaming: null,
        dialog: null,
      };
    }
    case 'editRule': {
      const rule = ruleOf(branchOf(state, action.branchKey), action.ruleId);
      if (!rule) {
        return state;
      }
      return {
        ...state,
        counters: releaseNumber(state),
        editing: { branchKey: action.branchKey, original: rule, draft: rule },
        renaming: null,
        dialog: null,
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
        ...state,
        branches: withItems(state, editing.branchKey, (items) =>
          editing.original ? replaceItem(items, draft) : [...items, draft]
        ),
        editing: null,
        dialog: null,
        problem: null,
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
      return {
        ...state,
        branches: found
          ? withItems(state, renaming.branchKey, (items) =>
              replaceItem(items, { ...found.item, name: action.name.trim() })
            )
          : state.branches,
        renaming: null,
        problem: null,
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
        ...state,
        branches: withItems(state, action.branchKey, () => duplicated.items),
        counters: duplicated.counters,
        problem: null,
      };
    }
    case 'askDelete':
      return {
        ...state,
        dialog: { type: 'deleteRule', branchKey: action.branchKey, ruleId: action.ruleId },
      };
    case 'confirmDelete': {
      const { dialog } = state;
      if (dialog?.type !== 'deleteRule') {
        return state;
      }
      const branch = branchOf(state, dialog.branchKey);
      const deleted = branch && deleteItem(branch.items, dialog.ruleId);
      if (!deleted) {
        return { ...state, dialog: null };
      }
      return {
        ...state,
        branches: withItems(state, dialog.branchKey, () => deleted.items),
        // A rule open in the editor goes with its deletion
        editing: state.editing?.draft.id === dialog.ruleId ? null : state.editing,
        dialog: null,
        problem: null,
        undo: { branchKey: dialog.branchKey, deleted: deleted.deleted },
        toast: {
          id: nextToastId(state),
          message: RULES_COPY.ruleDeleted(deleted.deleted.item.name, branch.name),
          actionLabel: RULES_COPY.undo,
        },
      };
    }
    case 'askSaveChanges':
      return { ...state, dialog: { type: 'saveChanges', next: action.next } };
    case 'closeDialog':
      return { ...state, dialog: null };
    case 'undo': {
      const { undo } = state;
      if (!undo) {
        return { ...state, toast: null };
      }
      return {
        ...state,
        branches: withItems(state, undo.branchKey, (items) => restoreItem(items, undo.deleted)),
        undo: null,
        toast: null,
        problem: null,
      };
    }
    case 'dismissToast':
      return { ...state, toast: null, undo: null };
    case 'clearProblem':
      return { ...state, problem: null };
    case 'showProblem':
      return { ...state, problem: action.problem };
    case 'selectBranch':
      return { ...state, openBranch: action.branchKey };
  }
}
