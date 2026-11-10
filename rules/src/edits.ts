// The editor's actions on a connection's rules, one pure function each (spec 007, research R8;
// FR-014): the compositions of branches.ts and tree.ts that the rules step's reducer and the
// agents' tools share, so that both store the same content, marks and identifiers. Each takes the
// branches and the counters (`EditState`) and answers the new state with what changed, or a
// refusal with the editor's message and the variant and item it names. A change of the main
// branch reaches the branches based on it at once (`propagateToBranches`). Variants are named by
// id; a new variant's id is the caller's, so this module needs no source of randomness
import type {
  BranchInput,
  Combinator,
  GroupItem,
  RequestedDocument,
  RuleItem,
  RuleTarget,
  RuleTreeItem,
} from '@connection-portal/api-types/form-connections';

import {
  addRuleToBranch,
  changeItem,
  copyRule as copyRuleToBranches,
  deleteFromBranch,
  deletionEffects,
  duplicateInBranch,
  groupInBranch,
  isInherited,
  newBranch,
  propagateToBranches,
  removeItem,
  resetBranchOperator,
  resetItem as resetInBranch,
  restoreItem as restoreInBranch,
  setBranchOperator,
  ungroupInBranch,
} from './branches';
import {
  DESCRIPTION_MAX_LENGTH,
  EDIT_MESSAGES,
  MAX_BRANCHES,
  RULE_ID_PATTERN,
  RULES_MESSAGES,
} from './constants';
import { DEFAULT_LANGUAGE } from './language';
import { canGroup, defaultRuleName, findItem, flattenItems, newRule, numberOfId } from './tree';
import type {
  DataRemoval,
  EditEffect,
  EditRefusal,
  EditResult,
  EditState,
  GroupChanges,
  NewRule,
  RuleChanges,
  RuleInBranch,
  RuleProblemDetail,
  RulesProblemCode,
  VariantChanges,
} from './types';
import { nameProblemOf, rulesCheckingData, textLength, variantNameProblemOf } from './validation';

// The refusals are in English: they reach the agents only (spec 009, FR-017), as the rules step
// doesn't offer an action in a state that refuses it and checks a name before it renames
const editMessages = EDIT_MESSAGES[DEFAULT_LANGUAGE];
const rulesMessages = RULES_MESSAGES[DEFAULT_LANGUAGE];

type Refused = { ok: false; refusal: EditRefusal };

/** A branch the action names, with its place in tab order. */
interface BranchAt {
  branch: BranchInput;
  index: number;
}

/** An item the action names, with its branch. */
interface ItemAt<I extends RuleTreeItem = RuleTreeItem> extends BranchAt {
  item: I;
}

/** A refusal with its code, the key of its message (spec 009, R10). */
function refuse(
  code: RulesProblemCode,
  message: string,
  branchIndex: number | null = null,
  itemId: string | null = null
): Refused {
  return { ok: false, refusal: { code, message, branchIndex, itemId } };
}

/** The refusal of a problem of validation.ts. */
function refuseProblem(
  { code, message }: RuleProblemDetail,
  branchIndex: number | null = null,
  itemId: string | null = null
): Refused {
  return refuse(code, message, branchIndex, itemId);
}

/** A branch's id; every branch an action names has one (`EditState`). */
function idOf(branch: Pick<BranchInput, 'id'>): string {
  return branch.id ?? '';
}

/** The main branch's name, as the messages name it. */
function mainName(state: EditState): string {
  return state.branches[0].name.trim();
}

function branchAt(state: EditState, branchId: string): BranchAt | Refused {
  const index = state.branches.findIndex((branch) => branch.id === branchId);
  return index < 0
    ? refuse('unknownVariant', editMessages.unknownVariant)
    : { branch: state.branches[index], index };
}

function itemAt(state: EditState, branchId: string, itemId: string): ItemAt | Refused {
  const at = branchAt(state, branchId);
  if ('ok' in at) {
    return at;
  }
  const item = findItem(at.branch.items, itemId)?.item;
  return item
    ? { ...at, item }
    : refuse(
        'unknownItem',
        editMessages.unknownItem(itemId, at.branch.name.trim()),
        at.index,
        null
      );
}

function ruleAt(state: EditState, branchId: string, ruleId: string): ItemAt<RuleItem> | Refused {
  const at = itemAt(state, branchId, ruleId);
  if ('ok' in at || at.item.type === 'rule') {
    return at as ItemAt<RuleItem> | Refused;
  }
  return refuse(
    'notRule',
    editMessages.notRule(at.item.name.trim(), at.branch.name.trim()),
    at.index,
    ruleId
  );
}

function groupAt(state: EditState, branchId: string, groupId: string): ItemAt<GroupItem> | Refused {
  const at = itemAt(state, branchId, groupId);
  if ('ok' in at || at.item.type === 'group') {
    return at as ItemAt<GroupItem> | Refused;
  }
  return refuse(
    'notGroup',
    editMessages.notGroup(at.item.name.trim(), at.branch.name.trim()),
    at.index,
    groupId
  );
}

/** The refusal of a change to an item removed in its branch, which can only be restored. */
function refuseRemoved({ item, branch, index }: ItemAt): Refused {
  const message = editMessages.removed(item.name.trim(), branch.name.trim());
  return refuse('removed', message, index, item.id);
}

/**
 * The state with the branch at `index` replaced, and a change of the main branch passed on to the
 * branches based on it (FR-021, W4).
 */
function withBranch(
  state: EditState,
  index: number,
  branch: BranchInput,
  counters = state.counters
): EditState {
  const branches = state.branches.map((entry, position) => (position === index ? branch : entry));
  return { branches: propagateToBranches(state.branches[0], branches), counters };
}

/** An item of the branch at `index`, after an action that keeps it. */
function itemIn<I extends RuleTreeItem>(state: EditState, index: number, id: string): I {
  return findItem(state.branches[index].items, id)?.item as I;
}

/**
 * The branches a change of the main branch's item `id` reached: those based on it whose copy
 * follows it, unmarked, in tab order. None for a change in another branch.
 */
function followersOf(state: EditState, index: number, id: string): string[] {
  if (index !== 0) {
    return [];
  }
  return state.branches
    .slice(1)
    .filter((branch) => branch.origin === 'based' && findItem(branch.items, id)?.item.mark === null)
    .map(idOf);
}

/** What a deletion or an ungrouping in the main branch, to `newMainItems`, does elsewhere. */
function effectsOf(state: EditState, index: number, newMainItems: RuleTreeItem[]): EditEffect[] {
  if (index !== 0) {
    return [];
  }
  return deletionEffects(state.branches, newMainItems).map(({ branch, kept, dissolved }) => ({
    branchId: idOf(branch),
    kept,
    dissolved,
  }));
}

/** The keys of `changes` that hold a value: what an action sets. */
function definedOf<T extends object>(changes: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(changes).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

/**
 * The state with an item's content changed (`changeItem`): in a based branch an inherited item
 * becomes `changed`, or follows the main branch again once equal to it. A new name is checked as
 * inline renaming checks it (`nameProblem`), in a based branch too, and in the main branch also in
 * every branch based on it (propagation rule 7).
 */
function changeContent<I extends RuleTreeItem>(
  state: EditState,
  at: ItemAt<I>,
  changes: Partial<I>
): EditResult<{ item: I; propagatedTo: string[] }> {
  const { branch, index, item } = at;
  if (item.mark === 'removed') {
    return refuseRemoved(at);
  }
  const name: string | undefined = changes.name;
  if (name !== undefined && name.trim() !== item.name.trim()) {
    const problem = nameProblemOf(name, item, branch, state.branches);
    if (problem) {
      return refuseProblem(problem, index, item.id);
    }
  }
  const changed = changeItem(state.branches[0], branch, { ...item, ...definedOf(changes) });
  if (!changed) {
    return refuseRemoved(at);
  }
  const next = withBranch(state, index, changed);
  return {
    ok: true,
    state: next,
    item: itemIn<I>(next, index, item.id),
    propagatedTo: followersOf(next, index, item.id),
  };
}

/**
 * A new rule at the end of the top level (`parentId` null) or of a group or sub-group (FR-007):
 * numbered from the counters, or with the id the rule editor reserved, and its default name;
 * `added` in a based branch, also in an inherited group, and in the main branch passed on to the
 * branches based on it. A name other than the default one is then given as a rename, checked as
 * renaming checks it. Its target, condition and message may be incomplete (spec 005, FR-004).
 * Refused in a group removed in the branch, which can only be restored.
 */
export function addRule(
  state: EditState,
  branchId: string,
  parentId: string | null,
  rule: NewRule = {}
): EditResult<{ item: RuleItem; propagatedTo: string[] }> {
  const at = branchAt(state, branchId);
  if ('ok' in at) {
    return at;
  }
  const { branch, index } = at;
  const parent = parentId === null ? null : groupAt(state, branchId, parentId);
  if (parent && 'ok' in parent) {
    return parent;
  }
  const { id, name, ...content } = rule;
  if (id !== undefined && !RULE_ID_PATTERN.test(id)) {
    return refuse('invalidIdentifier', rulesMessages.invalidIdentifier, index, null);
  }
  const numbered =
    id === undefined
      ? newRule(state.counters)
      : {
          rule: { ...newRule(state.counters).rule, id, name: defaultRuleName(numberOfId(id) ?? 0) },
          counters: state.counters,
        };
  const created: RuleItem = { ...numbered.rule, ...definedOf(content) };
  const added = addRuleToBranch(branch, created, parentId);
  if (!added) {
    // Only a removed group refuses a new rule
    return parent ? refuseRemoved(parent) : refuse('unknownVariant', editMessages.unknownVariant);
  }
  const next = withBranch(state, index, added, numbered.counters);
  if (name !== undefined && name.trim() !== created.name.trim()) {
    // The editor's sequence: the rule with its default name, then renamed
    return changeRule(next, branchId, created.id, { name });
  }
  return {
    ok: true,
    state: next,
    item: itemIn<RuleItem>(next, index, created.id),
    propagatedTo: followersOf(next, index, created.id),
  };
}

/**
 * A rule's name, data, condition or message changed (FR-005, FR-022): through `changeItem()`, with
 * a new name checked as renaming checks it. Refused for a rule removed in the branch.
 */
export function changeRule(
  state: EditState,
  branchId: string,
  ruleId: string,
  changes: RuleChanges
): EditResult<{ item: RuleItem; propagatedTo: string[] }> {
  const at = ruleAt(state, branchId, ruleId);
  return 'ok' in at ? at : changeContent(state, at, changes);
}

/**
 * A group's or sub-group's name, AND/OR or own message changed (FR-004, FR-007, EC-15): through
 * `changeItem()`, with a new name checked as renaming checks it. Its members stay. Refused for a
 * group removed in the branch.
 */
export function changeGroup(
  state: EditState,
  branchId: string,
  groupId: string,
  changes: GroupChanges
): EditResult<{ item: GroupItem; propagatedTo: string[] }> {
  const at = groupAt(state, branchId, groupId);
  return 'ok' in at ? at : changeContent(state, at, changes);
}

/** A group's own message added (with ''), changed, or removed (with null) (FR-004; W6). */
export function setGroupMessage(
  state: EditState,
  branchId: string,
  groupId: string,
  message: string | null
): EditResult<{ item: GroupItem; propagatedTo: string[] }> {
  return changeGroup(state, branchId, groupId, { message });
}

/**
 * A copy of a rule at the end of its level (FR-010, FR-022): a new rule numbered from the
 * counters, with its default name, `added` in a based branch. Refused for a removed rule.
 */
export function duplicateRule(
  state: EditState,
  branchId: string,
  ruleId: string
): EditResult<{ item: RuleItem; propagatedTo: string[] }> {
  const at = ruleAt(state, branchId, ruleId);
  if ('ok' in at) {
    return at;
  }
  const duplicated = duplicateInBranch(at.branch, ruleId, state.counters);
  if (!duplicated) {
    return refuseRemoved(at);
  }
  const next = withBranch(state, at.index, duplicated.branch, duplicated.counters);
  return {
    ok: true,
    state: next,
    item: duplicated.rule,
    propagatedTo: followersOf(next, at.index, duplicated.rule.id),
  };
}

/**
 * A group ungrouped: its members take its place (FR-008). In a based branch only a group of its
 * own; one it inherits is ungrouped in the main branch, or removed. In the main branch, `effects`
 * says what the branches based on it keep (propagation rule 8).
 */
export function ungroup(
  state: EditState,
  branchId: string,
  groupId: string
): EditResult<{ item: GroupItem; effects: EditEffect[] }> {
  const at = groupAt(state, branchId, groupId);
  if ('ok' in at) {
    return at;
  }
  const { branch, index, item } = at;
  if (item.mark === 'removed') {
    return refuseRemoved(at);
  }
  const ungrouped = ungroupInBranch(branch, groupId);
  if (!ungrouped) {
    const message = editMessages.inheritedGroup(
      item.name.trim(),
      branch.name.trim(),
      mainName(state)
    );
    return refuse('inheritedGroup', message, index, groupId);
  }
  return {
    ok: true,
    state: withBranch(state, index, ungrouped),
    item,
    effects: effectsOf(state, index, ungrouped.items),
  };
}

/**
 * The editor's Delete, or "Remove from this variant", for a rule or group (FR-008, FR-023):
 * - in the main branch, a branch that started empty, or for a based branch's own item, the item
 *   goes, a group with its members (`deleteFromBranch`; `'deleted'`); in the main branch,
 *   `effects` says what the branches based on it keep (`deletionEffects`, F14);
 * - with `keepMembers`, a group is ungrouped instead (`ungroup`; `'ungrouped'`);
 * - an item a based branch inherits stays there, removed (`removeItem`; `'removed'`).
 *
 * `item` is the item as it was.
 */
export function deleteItem(
  state: EditState,
  branchId: string,
  itemId: string,
  { keepMembers = false }: { keepMembers?: boolean } = {}
): EditResult<{
  action: 'deleted' | 'ungrouped' | 'removed';
  item: RuleTreeItem;
  effects: EditEffect[];
}> {
  const at = itemAt(state, branchId, itemId);
  if ('ok' in at) {
    return at;
  }
  const { branch, index, item } = at;
  const main = state.branches[0];
  if (keepMembers && item.type === 'group') {
    const ungrouped = ungroup(state, branchId, itemId);
    return ungrouped.ok ? { ...ungrouped, action: 'ungrouped' } : ungrouped;
  }
  if (isInherited(branch, item)) {
    if (item.mark === 'removed') {
      const message = editMessages.alreadyRemoved(item.name.trim(), branch.name.trim());
      return refuse('alreadyRemoved', message, index, itemId);
    }
    const removed = removeItem(main, branch, itemId);
    if (!removed) {
      return refuse(
        'unknownItem',
        editMessages.unknownItem(itemId, mainName(state)),
        index,
        itemId
      );
    }
    return {
      ok: true,
      state: withBranch(state, index, removed),
      action: 'removed',
      item,
      effects: [],
    };
  }
  const deleted = deleteFromBranch(main, branch, itemId);
  if (!deleted) {
    const message = editMessages.unknownItem(itemId, branch.name.trim());
    return refuse('unknownItem', message, index, itemId);
  }
  return {
    ok: true,
    state: withBranch(state, index, deleted),
    action: 'deleted',
    item,
    effects: effectsOf(state, index, deleted.items),
  };
}

/** The refusal of "Reset to Standard" or "Restore" in a branch not based on the main branch. */
function refuseNotBased(state: EditState, { branch, index }: BranchAt): Refused {
  const message = editMessages.notBased(branch.name.trim(), mainName(state));
  return refuse('notBased', message, index, null);
}

/**
 * A removed item, or a group dissolved in the branch, following the main branch again, with the
 * members removed inside it (FR-024, "Restore"). Only in a based branch.
 */
export function restoreItem(
  state: EditState,
  branchId: string,
  itemId: string
): EditResult<{ item: RuleTreeItem }> {
  const at = itemAt(state, branchId, itemId);
  if ('ok' in at) {
    return at;
  }
  const { branch, index, item } = at;
  if (branch.origin !== 'based') {
    return refuseNotBased(state, at);
  }
  const restored = restoreInBranch(state.branches[0], branch, itemId);
  if (!restored) {
    const message = editMessages.notRemoved(item.name.trim(), branch.name.trim());
    return refuse('notRemoved', message, index, itemId);
  }
  const next = withBranch(state, index, restored);
  return { ok: true, state: next, item: itemIn(next, index, itemId) };
}

/**
 * A changed item following the main branch again, with its content (FR-024, "Reset to Standard").
 * Only in a based branch; a removed item is restored instead.
 */
export function resetItem(
  state: EditState,
  branchId: string,
  itemId: string
): EditResult<{ item: RuleTreeItem }> {
  const at = itemAt(state, branchId, itemId);
  if ('ok' in at) {
    return at;
  }
  const { branch, index, item } = at;
  if (branch.origin !== 'based') {
    return refuseNotBased(state, at);
  }
  if (item.mark === 'removed') {
    return refuseRemoved(at);
  }
  const reset = resetInBranch(state.branches[0], branch, itemId);
  if (!reset) {
    const message = editMessages.notChanged(item.name.trim(), branch.name.trim(), mainName(state));
    return refuse('notChanged', message, index, itemId);
  }
  const next = withBranch(state, index, reset);
  return { ok: true, state: next, item: itemIn(next, index, itemId) };
}

/**
 * Two or more rules of one level put into a new group, in the first one's place (FR-007, FR-008):
 * a group at the top level, a sub-group in a group, numbered from the group counter; `added` in a
 * based branch, where the rules keep following the main branch. A name, AND/OR or message is then
 * set as the group's menu sets it. Refused for removed rules, and for rules that can't form a
 * group (`canGroup`).
 */
export function groupItems(
  state: EditState,
  branchId: string,
  ids: string[],
  changes: GroupChanges = {}
): EditResult<{ item: GroupItem; propagatedTo: string[] }> {
  const at = branchAt(state, branchId);
  if ('ok' in at) {
    return at;
  }
  const { branch, index } = at;
  for (const id of ids) {
    const member = itemAt(state, branchId, id);
    if ('ok' in member) {
      return member;
    }
    if (member.item.mark === 'removed') {
      return refuseRemoved(member);
    }
  }
  const grouped = canGroup(branch.items, ids) ? groupInBranch(branch, ids, state.counters) : null;
  if (!grouped) {
    return refuse('cantGroup', editMessages.cantGroup(branch.name.trim()), index, ids[0] ?? null);
  }
  const next = withBranch(state, index, grouped.branch, grouped.counters);
  const groupId = grouped.group.id;
  if (Object.keys(definedOf(changes)).length > 0) {
    return changeGroup(next, branchId, groupId, changes);
  }
  return {
    ok: true,
    state: next,
    item: itemIn<GroupItem>(next, index, groupId),
    propagatedTo: followersOf(next, index, groupId),
  };
}

/**
 * The top level's AND/OR (`parentId` null), or a group's (FR-007). In a based branch, switching
 * the top level marks it (`operator_mark`) unless it makes it equal to the main branch's again;
 * switching the main branch's reaches the branches based on it that haven't switched theirs.
 */
export function switchOperator(
  state: EditState,
  branchId: string,
  parentId: string | null,
  operator: Combinator
): EditResult<{ item: GroupItem | null; propagatedTo: string[] }> {
  if (parentId !== null) {
    return changeGroup(state, branchId, parentId, { operator });
  }
  const at = branchAt(state, branchId);
  if ('ok' in at) {
    return at;
  }
  const next = withBranch(
    state,
    at.index,
    setBranchOperator(state.branches[0], at.branch, operator)
  );
  const propagatedTo =
    at.index === 0
      ? next.branches
          .slice(1)
          .filter((branch) => branch.origin === 'based' && branch.operator_mark === null)
          .map(idOf)
      : [];
  return { ok: true, state: next, item: null, propagatedTo };
}

/**
 * Copies of a rule at the end of other branches' top level (FR-022; `copyRule()`): each a new
 * rule with the next number and its default name, `added` in a based branch. A copy to the main
 * branch reaches the branches based on it (`propagatedTo`), which get no copy of their own.
 * Refused without another branch to copy to.
 */
export function copyRule(
  state: EditState,
  sourceBranchId: string,
  ruleId: string,
  targetBranchIds: string[]
): EditResult<{ copies: { branchId: string; item: RuleItem }[]; propagatedTo: string[] }> {
  const at = ruleAt(state, sourceBranchId, ruleId);
  if ('ok' in at) {
    return at;
  }
  const targets = targetBranchIds.map((id) =>
    state.branches.findIndex((branch) => branch.id === id)
  );
  if (targets.some((target) => target < 0)) {
    return refuse('unknownVariant', editMessages.unknownVariant);
  }
  const copied = copyRuleToBranches(state.branches, at.index, ruleId, targets, state.counters);
  if (!copied) {
    const message = editMessages.noCopyTarget(at.item.name.trim());
    return refuse('noCopyTarget', message, at.index, ruleId);
  }
  const next = { branches: copied.branches, counters: copied.counters };
  const toMain = copied.copies.find(({ branchIndex }) => branchIndex === 0);
  return {
    ok: true,
    state: next,
    copies: copied.copies.map(({ branchIndex, rule }) => ({
      branchId: idOf(copied.branches[branchIndex]),
      item: rule,
    })),
    propagatedTo: toMain ? followersOf(next, 0, toMain.rule.id) : [],
  };
}

/** Why a variant can't have this description: longer than 500 characters (FR-020), or null. */
function descriptionProblem(
  description: string | null,
  variantName: string
): RuleProblemDetail | null {
  return textLength(description?.trim() ?? '') > DESCRIPTION_MAX_LENGTH
    ? {
        code: 'descriptionTooLong',
        message: rulesMessages.descriptionTooLong(variantName.trim()),
      }
    : null;
}

/**
 * A new variant at the end of the tabs (FR-019, FR-020; `newBranch()`): based on the main branch,
 * with a copy of its rules that follows it, or empty. `id` is the caller's (`crypto.randomUUID()`
 * in the SPA and the MCP server), and the variant keeps it. Refused as the Add variant dialog
 * refuses it: a 21st variant, a missing, too long or used name, a description longer than 500
 * characters; and an id another variant has.
 */
export function addVariant(
  state: EditState,
  { name, description }: { name: string; description: string | null },
  origin: 'based' | 'empty',
  id: string
): EditResult<{ branch: BranchInput }> {
  if (state.branches.length >= MAX_BRANCHES) {
    return refuse('tooManyBranches', rulesMessages.tooManyBranches);
  }
  const problem =
    variantNameProblemOf(
      name,
      state.branches.map((branch) => branch.name)
    ) ?? descriptionProblem(description, name);
  if (problem) {
    return refuseProblem(problem);
  }
  if (state.branches.some((branch) => branch.id === id)) {
    return refuse('unknownVariant', editMessages.unknownVariant);
  }
  const branch = { ...newBranch(state.branches[0], origin, name, description), id };
  return {
    ok: true,
    state: { branches: [...state.branches, branch], counters: state.counters },
    branch,
  };
}

/**
 * A variant renamed or described anew, the main one too (W3): the name and description trimmed, a
 * blank description as none; what is left out stays. Refused as the Edit variant dialog refuses
 * it.
 */
export function editVariant(
  state: EditState,
  branchId: string,
  changes: VariantChanges
): EditResult<{ branch: BranchInput }> {
  const at = branchAt(state, branchId);
  if ('ok' in at) {
    return at;
  }
  const { branch, index } = at;
  const others = state.branches.filter((_, position) => position !== index);
  const problem =
    (changes.name === undefined
      ? null
      : variantNameProblemOf(
          changes.name,
          others.map((other) => other.name)
        )) ??
    (changes.description === undefined
      ? null
      : descriptionProblem(changes.description, changes.name ?? branch.name));
  if (problem) {
    return refuseProblem(problem, index, null);
  }
  const edited: BranchInput = {
    ...branch,
    name: changes.name === undefined ? branch.name : changes.name.trim(),
    description:
      changes.description === undefined ? branch.description : changes.description?.trim() || null,
  };
  return {
    ok: true,
    state: {
      branches: state.branches.map((entry, position) => (position === index ? edited : entry)),
      counters: state.counters,
    },
    branch: edited,
  };
}

/** A variant deleted with its rules (FR-020); never the main one. `branch` is the deleted one. */
export function deleteVariant(
  state: EditState,
  branchId: string
): EditResult<{ branch: BranchInput }> {
  const at = branchAt(state, branchId);
  if ('ok' in at) {
    return at;
  }
  if (at.index === 0) {
    return refuse('mainVariant', editMessages.mainVariant(mainName(state)), 0, null);
  }
  return {
    ok: true,
    state: {
      branches: state.branches.filter((_, index) => index !== at.index),
      counters: state.counters,
    },
    branch: at.branch,
  };
}

/** A based variant's top level following the main branch's AND/OR again (FR-024). */
export function resetOperator(
  state: EditState,
  branchId: string
): EditResult<{ branch: BranchInput }> {
  const at = branchAt(state, branchId);
  if ('ok' in at) {
    return at;
  }
  if (at.branch.origin !== 'based') {
    return refuseNotBased(state, at);
  }
  const branch = resetBranchOperator(state.branches[0], at.branch);
  return {
    ok: true,
    state: {
      branches: state.branches.map((entry, index) => (index === at.index ? branch : entry)),
      counters: state.counters,
    },
    branch,
  };
}

/** The fields a document requests, in its order. */
function fieldsOf(documents: RequestedDocument[], documentType: string): string[] {
  return documents.find((document) => document.document_type === documentType)?.fields ?? [];
}

/**
 * Whether a removal takes away the data a rule checks: a whole document's requested fields, or
 * one field; for "All data", those still selected. Data already not requested doesn't count.
 */
function removalTakes(
  removal: DataRemoval,
  target: RuleTarget,
  documents: RequestedDocument[]
): boolean {
  if (removal.type === 'dropped') {
    return removal.items.some((item) =>
      removalTakes(
        item.field === null
          ? { type: 'document', documentType: item.documentType }
          : { type: 'field', documentType: item.documentType, field: item.field },
        target,
        documents
      )
    );
  }
  if (target.document_type !== removal.documentType) {
    return false;
  }
  return removal.type === 'field'
    ? target.field === removal.field
    : fieldsOf(documents, removal.documentType).includes(target.field);
}

/**
 * The rules, in every branch, that check the data a removal takes away (FR-029; the documents
 * step's question, F18): a document's rules, a field's, or for "All data" those of the fields
 * still selected; for the data the catalog dropped (S8), those of every dropped document and
 * field, each rule once. In branch and tree order, removed rules and those a based branch inherits
 * included. Rules on data that `documents`, the requested ones, already don't request are flagged
 * by the rules step (F11) and not named again.
 */
export function rulesCheckingRemoval(
  branches: Pick<BranchInput, 'items'>[],
  removal: DataRemoval,
  documents: RequestedDocument[]
): { branchIndex: number; rule: RuleItem }[] {
  if (removal.type === 'dropped') {
    return branches.flatMap((branch, branchIndex) =>
      flattenItems(branch.items)
        .filter((item): item is RuleItem => item.type === 'rule')
        .filter(({ target }) => target !== null && removalTakes(removal, target, documents))
        .map((rule) => ({ branchIndex, rule }))
    );
  }
  return rulesCheckingData(
    branches,
    removal.documentType,
    removal.type === 'field' ? removal.field : undefined
  ).filter(({ rule }) => rule.target !== null && removalTakes(removal, rule.target, documents));
}

/**
 * The rules `rules` names taken out of their branches, as deleting each in the editor would, for
 * data that stops being requested (`rulesCheckingRemoval()`): the main branch's first, so that the
 * branches based on it follow; a branch's own rule deleted, one it inherits removed there (with
 * the main branch's content), one already gone with the main branch's skipped. A group left with
 * one member dissolves. Refused for an unknown variant or rule.
 */
export function removeRules(
  state: EditState,
  rules: RuleInBranch[]
): EditResult<{ removed: RuleInBranch[] }> {
  const located: (RuleInBranch & { index: number })[] = [];
  for (const entry of rules) {
    const at = ruleAt(state, entry.branchId, entry.ruleId);
    if ('ok' in at) {
      return at;
    }
    located.push({ ...entry, index: at.index });
  }
  let current = state;
  for (const { branchId, ruleId } of [...located].sort((a, b) => a.index - b.index)) {
    const branch = current.branches.find((entry) => entry.id === branchId);
    const rule = branch && findItem(branch.items, ruleId)?.item;
    if (!rule || rule.mark === 'removed') {
      continue;
    }
    const removed = deleteItem(current, branchId, ruleId);
    if (!removed.ok) {
      return removed;
    }
    current = removed.state;
  }
  return { ok: true, state: current, removed: rules };
}
