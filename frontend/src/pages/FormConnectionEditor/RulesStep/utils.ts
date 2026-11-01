import { GROUP_HEADER_ID_SUFFIX } from '../../../components/GroupFrame/constants';
import type {
  FormConnection,
  GroupItem,
  RuleItem,
  RuleTreeItem,
} from '../../../types/form-connections';
import {
  addRuleToBranch,
  changeItem,
  copyRule,
  deleteFromBranch,
  deletionEffects,
  duplicateInBranch,
  groupInBranch,
  isInherited,
  newBranch,
  propagateToBranches,
  removeItem,
  resetBranchOperator,
  resetItem,
  restoreItem,
  setBranchOperator,
  ungroupInBranch,
} from '../../../utils/rules/branches';
import { kindTextOf } from '../../../utils/rules/checks/findingMessages';
import type { FindingsBanner } from '../../../utils/rules/checks/types';
import { MAX_BRANCHES, RULES_MESSAGES } from '../../../utils/rules/constants';
import { deleteItem, findItem, flattenItems, newRule, numberOfId } from '../../../utils/rules/tree';
import { variantNameProblem } from '../../../utils/rules/validation';
import { ELEMENT_IDS } from '../constants';
import { MAIN_BRANCH_KEY, MAIN_BRANCH_NAME, RULES_COPY } from './constants';
import type {
  BannerItem,
  BannerView,
  ItemStanding,
  RenameAction,
  RenameField,
  RulesAction,
  RulesBranch,
  RulesSelection,
  RulesState,
  RulesUndo,
  SwitchedLevel,
  VariantForm,
  VariantFormAction,
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
    showBranch: null,
    problem: null,
    selection: null,
    switched: null,
    expandedFindings: [],
  };
}

/**
 * Moves the focus once the current render, and a dialog it closes, are done: a modal dialog
 * keeps the page inert until it closes, and then gives the focus back to what opened it. With
 * `onlyIfLost`, only when nothing has the focus by then, so that it doesn't take it from where
 * something else has just put it.
 */
export function focusSoon(id: string, fallbackId?: string, onlyIfLost = false) {
  requestAnimationFrame(() => {
    if (onlyIfLost && document.activeElement && document.activeElement !== document.body) {
      return;
    }
    const element =
      document.getElementById(id) ?? (fallbackId ? document.getElementById(fallbackId) : null);
    element?.focus();
  });
}

/**
 * What the findings banner draws (S2; A1, W12, W17; design-notes.md §3.3), from `bannerOf()`:
 * *single* with fewer than two lines, its `head` with the banner's icon, and the line's hidden kind
 * text when there is a line; *collapsed* by default with two or more lines, its `head` (the counts
 * row with what follows it); *expanded*, the counts row, then one item per line with its icon and
 * hidden kind text, then the notice and FR-010's sentence without a link or kind text. No text is
 * built here.
 */
export function bannerViewOf(banner: FindingsBanner, expanded: boolean): BannerView {
  const { kind, lines, counts, notice, incomplete, head } = banner;
  if (lines.length < 2) {
    const kindText = lines.length === 1 ? kindTextOf(lines[0].kind) : null;
    return {
      state: 'single',
      summary: { key: 'summary', tone: kind, kindText, parts: head },
      items: [],
    };
  }
  if (!expanded) {
    return {
      state: 'collapsed',
      summary: { key: 'summary', tone: kind, kindText: null, parts: head },
      items: [],
    };
  }
  const items: BannerItem[] = [
    ...lines.map((line, index) => ({
      key: `line-${index}`,
      tone: line.tone,
      kindText: kindTextOf(line.kind),
      parts: line.parts,
    })),
    ...(notice ? [{ key: 'notice', tone: notice.tone, kindText: null, parts: [notice.text] }] : []),
    ...(incomplete
      ? [{ key: 'incomplete', tone: 'info' as const, kindText: null, parts: [incomplete] }]
      : []),
  ];
  return {
    state: 'expanded',
    summary: { key: 'summary', tone: kind, kindText: null, parts: [counts] },
    items,
  };
}

/**
 * Where a banner name's link moves the focus, in order of preference (S2; A1; W19; FR-013): a
 * group's header, which its note describes (contracts/ui-screens.md "Accessibility"), then the
 * rule's row, or the group's frame should the header be missing. Only a group's frame has a
 * header, so a rule's row is the first id that exists.
 */
export function findingTargetIdsOf(branchKey: string, itemId: string): string[] {
  const frameId = ELEMENT_IDS.rule(branchKey, itemId);
  return [`${frameId}${GROUP_HEADER_ID_SUFFIX}`, frameId];
}

/**
 * A banner name's link (S2; A1; W19; FR-013): moves the focus to its rule's row or its group's
 * header, which its note describes, and scrolls it into view, only as far as needed.
 */
export function goToItem(branchKey: string, itemId: string) {
  const element = findingTargetIdsOf(branchKey, itemId)
    .map((id) => document.getElementById(id))
    .find((found) => found !== null);
  if (!element) {
    return;
  }
  element.focus({ preventScroll: true });
  element.scrollIntoView({ block: 'nearest' });
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

/**
 * What an item is to its branch, which decides its menu (`ItemStanding`): the branch's own, an
 * inherited item of a based branch, or one removed there.
 */
export function standingOf(branch: RulesBranch, item: RuleTreeItem): ItemStanding {
  if (item.mark === 'removed') {
    return 'removed';
  }
  return isInherited(branch, item) ? 'inherited' : 'own';
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

/**
 * The body of "Delete Rule 03?" or "Delete Group 01?" (U14 6113:29056; F14, W8). In Standard,
 * while variants are based on it, it says what the deletion does to them instead (design-notes
 * §4 and §5): the variants that changed what is deleted keep their version, and a group the
 * deletion leaves with one member is ungrouped everywhere, also where a variant changed it
 * (FR-022's one exception). `statement` is the deleted rule's, if it reads.
 */
export function deleteDialogText(
  state: RulesState,
  dialog: { branchKey: string; itemId: string },
  statement: string | null
): string {
  const branch = branchOf(state, dialog.branchKey);
  const item = branch && findItem(branch.items, dialog.itemId);
  if (!branch || !item) {
    return '';
  }
  const { item: deleted, depth } = item;
  const based = state.branches.filter((entry) => entry.origin === 'based');
  if (branch.origin !== 'main' || based.length === 0) {
    return deleted.type === 'rule'
      ? RULES_COPY.deleteText(statement)
      : RULES_COPY.deleteGroupText(deleted.name, subGroupCount(deleted));
  }
  const main = branch.name.trim();
  const after = deleteItem(branch.items, deleted.id);
  const effects = deletionEffects(state.branches, after?.items ?? branch.items);
  const keptBy = (id: string) =>
    effects
      .filter((effect) => effect.kept.some((kept) => kept.id === id))
      .map((effect) => effect.branch.name.trim());
  const sentences: string[] = [];
  if (deleted.type === 'rule') {
    sentences.push(RULES_COPY.removedFromVariants(main));
    const variants = keptBy(deleted.id);
    if (variants.length > 0) {
      sentences.push(RULES_COPY.keptByVariants(joinNames(variants), variants.length));
    }
  } else {
    sentences.push(RULES_COPY.groupRemovedFromVariants(depth > 0 ? 'sub-group' : 'group', main));
    for (const entry of flattenItems([deleted])) {
      const variants = keptBy(entry.id);
      if (variants.length > 0) {
        sentences.push(
          RULES_COPY.itemKeptByVariants(joinNames(variants), variants.length, entry.name.trim())
        );
      }
    }
  }
  const dissolved = after?.dissolved;
  if (dissolved) {
    sentences.push(RULES_COPY.ungroupedEverywhere(dissolved.name.trim(), main));
    const lost = effects
      .filter((effect) => effect.dissolved.some((group) => group.id === dissolved.id))
      .map((effect) => effect.branch.name.trim());
    if (lost.length > 0) {
      const owners = joinNames(lost.map((variant) => RULES_COPY.possessive(variant)));
      sentences.push(RULES_COPY.changesGo(owners, dissolved.name.trim()));
    }
  }
  sentences.push(RULES_COPY.undoRightAfter);
  return sentences.join(' ');
}

/**
 * The variants a rule of `branchKey` can be copied to, in tab order (FR-022): every other one.
 * While Standard is `chosen`, the variants based on it are included; Standard's line carries the
 * hint that they are, when any of them is a target.
 */
export function copyTargetsOf(
  state: RulesState,
  branchKey: string,
  chosen: string[]
): { branch: RulesBranch; included: boolean; hint: boolean }[] {
  const [main] = state.branches;
  const targets = state.branches.filter((branch) => branch.key !== branchKey);
  const mainChosen = chosen.includes(main.key);
  const anyBased = targets.some((branch) => branch.origin === 'based');
  return targets.map((branch) => ({
    branch,
    included: mainChosen && branch.origin === 'based',
    hint: branch.key === main.key && anyBased,
  }));
}

/** The sub-groups of a group, which "Delete Group 01?" names (design-notes §5). */
export function subGroupCount(group: GroupItem): number {
  return group.items.filter((member) => member.type === 'group').length;
}

/**
 * The tab an arrow key, Home or End moves to from the tab `index` of `count`, the arrows wrapping
 * round (WAI-ARIA tabs); null for any other key.
 */
export function tabAfterKey(key: string, index: number, count: number): number | null {
  switch (key) {
    case 'ArrowRight':
      return (index + 1) % count;
    case 'ArrowLeft':
      return (index - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}

/** The Add variant dialog's empty fields, or Edit variant's with the branch's. */
export function initialVariantForm(branch?: RulesBranch): VariantForm {
  return {
    name: branch?.name ?? '',
    description: branch?.description ?? '',
    origin: 'based',
    error: null,
  };
}

/** The variant dialogs' fields: a change takes the refusal away. */
export function variantFormReducer(form: VariantForm, action: VariantFormAction): VariantForm {
  switch (action.type) {
    case 'reset':
      return action.form;
    case 'change':
      return { ...form, ...action.changes, error: null };
    case 'refuse':
      return { ...form, error: action.error };
  }
}

/**
 * Why the variant dialog can't add or rename the variant (W3): a missing or used name, or a
 * 21st variant. `ownKey` is the edited branch's, null when adding.
 */
export function variantFormProblem(
  form: VariantForm,
  state: RulesState,
  ownKey: string | null
): string | null {
  if (ownKey === null && state.branches.length >= MAX_BRANCHES) {
    return RULES_MESSAGES.tooManyBranches;
  }
  const others = state.branches.filter((branch) => branch.key !== ownKey);
  return variantNameProblem(
    form.name,
    others.map((branch) => branch.name)
  );
}

/**
 * The branches with one of them changed by `change`, which also gets the main branch, as it
 * was; null if there is no such branch or `change` refuses (T059's functions return null).
 */
function withBranch(
  state: RulesState,
  branchKey: string,
  change: (branch: RulesBranch, main: RulesBranch) => RulesBranch | null
): RulesBranch[] | null {
  const branch = branchOf(state, branchKey);
  const next = branch && change(branch, state.branches[0]);
  if (!next) {
    return null;
  }
  return state.branches.map((entry) => (entry.key === branchKey ? next : entry));
}

function nextToastId(state: RulesState): number {
  return (state.toast?.id ?? 0) + 1;
}

/**
 * The state after a change of the rules. A change of the main branch reaches every branch
 * based on it at once (FR-021, W4; `propagateToBranches`). The change ends select mode and the
 * note after switching, and clears the refused Publish's problem. It also drops the last Undo,
 * which puts back the rules as they were before that change only, and a copy's Show: the toast
 * stays, without its action, and goes after its time.
 */
function changed(state: RulesState, branches: RulesBranch[]): RulesState {
  return {
    ...state,
    branches: propagateToBranches(state.branches[0], branches),
    problem: null,
    selection: null,
    switched: null,
    undo: null,
    toast: state.toast?.actionLabel ? { ...state.toast, actionLabel: undefined } : state.toast,
  };
}

/** A change with an Undo toast: the toast's Undo puts every branch back as it was. */
function undoable(
  state: RulesState,
  branches: RulesBranch[],
  message: string,
  focus: Omit<RulesUndo, 'branches'>
): RulesState {
  return {
    ...changed(state, branches),
    undo: { branches: state.branches, ...focus },
    showBranch: null,
    toast: { id: nextToastId(state), message, actionLabel: RULES_COPY.undo },
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

function deleteFromState(state: RulesState, branchKey: string, itemId: string): RulesState {
  const branch = branchOf(state, branchKey);
  const deleted = branch && findItem(branch.items, itemId)?.item;
  const branches =
    deleted && withBranch(state, branchKey, (entry, main) => deleteFromBranch(main, entry, itemId));
  if (!branch || !deleted || !branches) {
    return { ...state, dialog: null };
  }
  const message =
    deleted.type === 'rule'
      ? RULES_COPY.ruleDeleted(deleted.name, branch.name)
      : RULES_COPY.groupDeleted(deleted.name, branch.name);
  return {
    ...undoable(state, branches, message, { branchKey, itemId }),
    // A rule open in the editor goes with its deletion
    editing: editorIsIn(state, deleted) ? null : state.editing,
    dialog: null,
  };
}

/** A key for a branch added in the step, which keeps it until the save gives it an id. */
export function newBranchKey(branches: RulesBranch[]): string {
  const taken = new Set(branches.map((branch) => branch.key));
  let number = branches.length;
  while (taken.has(`new-${number}`)) {
    number += 1;
  }
  return `new-${number}`;
}

/** Deletes a variant, which takes effect when the connection is saved (FR-020). */
function deleteVariant(state: RulesState, branchKey: string): RulesState {
  const index = state.branches.findIndex((branch) => branch.key === branchKey);
  if (index < 1) {
    return { ...state, dialog: null };
  }
  const editing = state.editing?.branchKey === branchKey ? null : state.editing;
  return {
    ...changed(
      state,
      state.branches.filter((branch) => branch.key !== branchKey)
    ),
    openBranch: state.openBranch === branchKey ? state.branches[0].key : state.openBranch,
    counters: editing === state.editing ? state.counters : releaseNumber(state),
    editing,
    renaming: state.renaming?.branchKey === branchKey ? null : state.renaming,
    showBranch: state.showBranch === branchKey ? null : state.showBranch,
    dialog: null,
  };
}

/** Copies the rule the dialog names to the branches `targets` (FR-022), with F29's toast. */
function copyFromDialog(state: RulesState, targets: string[]): RulesState {
  const { dialog } = state;
  if (dialog?.type !== 'copyRule') {
    return state;
  }
  const keys = state.branches.map((branch) => branch.key);
  const source = keys.indexOf(dialog.branchKey);
  const rule = ruleOf(state.branches[source], dialog.ruleId);
  const copied =
    rule &&
    copyRule(
      state.branches,
      source,
      dialog.ruleId,
      targets.map((key) => keys.indexOf(key)).filter((index) => index >= 0),
      state.counters
    );
  if (!rule || !copied) {
    return { ...state, dialog: null };
  }
  const names = copied.copies.map(({ branchIndex }) => state.branches[branchIndex].name.trim());
  return {
    ...changed(state, copied.branches),
    counters: copied.counters,
    dialog: null,
    showBranch: keys[copied.copies[0].branchIndex],
    toast: {
      id: nextToastId(state),
      message: RULES_COPY.copied(rule.name, joinNames(names)),
      actionLabel: RULES_COPY.show,
    },
  };
}

/** The state after a change that refuses nothing worth saying: unchanged if it refuses. */
function changedOr(state: RulesState, branches: RulesBranch[] | null): RulesState {
  return branches ? changed(state, branches) : state;
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
      if (!branch || !rule || rule.mark === 'removed') {
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
      const branches = withBranch(state, editing.branchKey, (entry, main) => {
        if (editing.original) {
          return changeItem(main, entry, draft);
        }
        // A new rule's group may have gone meanwhile: the rule then ends the top level
        const parentId =
          editing.parentId !== null && findItem(entry.items, editing.parentId)
            ? editing.parentId
            : null;
        return addRuleToBranch(entry, draft, parentId) ?? addRuleToBranch(entry, draft);
      });
      if (!branches) {
        return { ...state, counters: releaseNumber(state), editing: null, dialog: null };
      }
      return {
        ...changed(state, branches),
        editing: null,
        dialog: null,
        showBranch: null,
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
      const branches = withBranch(state, renaming.branchKey, (branch, main) => {
        const found = findItem(branch.items, renaming.itemId);
        return found && changeItem(main, branch, { ...found.item, name: action.name.trim() });
      });
      return { ...changedOr(state, branches), renaming: null };
    }
    case 'cancelRename':
      return { ...state, renaming: null };
    case 'duplicateRule': {
      let counters = state.counters;
      const branches = withBranch(state, action.branchKey, (branch) => {
        const duplicated = duplicateInBranch(branch, action.ruleId, state.counters);
        counters = duplicated?.counters ?? counters;
        return duplicated?.branch ?? null;
      });
      return branches ? { ...changed(state, branches), counters } : state;
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
      switch (dialog?.type) {
        case 'deleteRule':
          return deleteFromState(state, dialog.branchKey, dialog.ruleId);
        case 'deleteGroup':
          return deleteFromState(state, dialog.branchKey, dialog.groupId);
        case 'deleteVariant':
          return deleteVariant(state, dialog.branchKey);
        default:
          return state;
      }
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
        branches: undo.branches,
        openBranch: undo.branchKey,
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
    // The toast goes after its 6 seconds (B4); its Undo stands until the next change, for
    // Ctrl/Cmd+Z, while its Show goes with it
    case 'dismissToast':
      return { ...state, toast: null, showBranch: null };
    case 'clearProblem':
      return { ...state, problem: null };
    case 'showProblem':
      return { ...state, problem: action.problem };
    case 'selectBranch':
      return { ...state, openBranch: action.branchKey, selection: null, switched: null };
    case 'switchOperator': {
      const branches = withBranch(state, action.branchKey, (branch, main) => {
        if (action.parentId === null) {
          return setBranchOperator(main, branch, action.operator);
        }
        const group = groupOf(branch, action.parentId);
        return group && changeItem(main, branch, { ...group, operator: action.operator });
      });
      if (!branches) {
        return state;
      }
      const level: SwitchedLevel = {
        branchKey: action.branchKey,
        parentId: action.parentId,
        operator: action.operator,
      };
      return { ...changed(state, branches), switched: level };
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
    case 'toggleFindings': {
      const { expandedFindings } = state;
      return {
        ...state,
        expandedFindings: expandedFindings.includes(action.branchKey)
          ? expandedFindings.filter((key) => key !== action.branchKey)
          : [...expandedFindings, action.branchKey],
      };
    }
    case 'groupSelected': {
      const { selection } = state;
      const branch = selection && branchOf(state, selection.branchKey);
      const grouped = branch && groupInBranch(branch, selection.ids, state.counters);
      if (!selection || !branch || !grouped) {
        return state;
      }
      const names = joinNames(grouped.group.items.map((member) => member.name));
      const message =
        branch.origin === 'based'
          ? RULES_COPY.groupedInVariant(
              names,
              branch.name,
              grouped.group.name,
              state.branches[0].name
            )
          : RULES_COPY.grouped(names, branch.name, grouped.group.name);
      const branches = state.branches.map((entry) =>
        entry.key === branch.key ? grouped.branch : entry
      );
      return {
        ...undoable(state, branches, message, {
          branchKey: branch.key,
          itemId: grouped.group.items[0].id,
          groupNumber: state.counters.group,
        }),
        counters: grouped.counters,
      };
    }
    case 'ungroup': {
      const branch = branchOf(state, action.branchKey);
      const group = groupOf(branch, action.groupId);
      const branches = withBranch(state, action.branchKey, (entry) =>
        ungroupInBranch(entry, action.groupId)
      );
      if (!branch || !group || !branches) {
        return state;
      }
      return undoable(state, branches, RULES_COPY.ungrouped(group.name, branch.name), {
        branchKey: branch.key,
        itemId: group.id,
      });
    }
    case 'setGroupMessage': {
      const branches = withBranch(state, action.branchKey, (branch, main) => {
        const group = groupOf(branch, action.groupId);
        return group && changeItem(main, branch, { ...group, message: action.message });
      });
      return changedOr(state, branches);
    }
    case 'askAddVariant':
      return { ...state, dialog: { type: 'addVariant' }, renaming: null, selection: null };
    case 'addVariant': {
      const key = newBranchKey(state.branches);
      const { name, description } = action.variant;
      const branch = { ...newBranch(state.branches[0], action.origin, name, description), key };
      return {
        ...changed(state, [...state.branches, branch]),
        openBranch: key,
        dialog: null,
      };
    }
    case 'askEditVariant':
      return { ...state, dialog: { type: 'editVariant', branchKey: action.branchKey } };
    case 'editVariant': {
      const { name, description } = action.variant;
      const branches = withBranch(state, action.branchKey, (branch) => ({
        ...branch,
        name: name.trim(),
        description: description?.trim() || null,
      }));
      return { ...changedOr(state, branches), dialog: null };
    }
    case 'askDeleteVariant':
      return { ...state, dialog: { type: 'deleteVariant', branchKey: action.branchKey } };
    case 'removeItem':
      return changedOr(
        state,
        withBranch(state, action.branchKey, (branch, main) =>
          removeItem(main, branch, action.itemId)
        )
      );
    case 'restoreItem':
      return changedOr(
        state,
        withBranch(state, action.branchKey, (branch, main) =>
          restoreItem(main, branch, action.itemId)
        )
      );
    case 'resetItem':
      return changedOr(
        state,
        withBranch(state, action.branchKey, (branch, main) =>
          resetItem(main, branch, action.itemId)
        )
      );
    case 'resetOperator':
      return changedOr(
        state,
        withBranch(state, action.branchKey, (branch, main) => resetBranchOperator(main, branch))
      );
    case 'askCopyRule':
      return {
        ...state,
        dialog: { type: 'copyRule', branchKey: action.branchKey, ruleId: action.ruleId },
      };
    case 'copyRule':
      return copyFromDialog(state, action.targets);
  }
}
