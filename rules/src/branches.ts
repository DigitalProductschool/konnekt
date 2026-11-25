// Branches ("variants") and the marks of a branch based on the main branch (FR-019 to FR-024;
// research R4; data-model.md, "Marks in a based branch" and "Propagation from the main branch").
// Every function is pure. The main branch and branches that started empty carry no marks, so the
// functions that take a branch change those with tree.ts's operations as they are, and mark
// only in a based branch
import type {
  BranchInput,
  Combinator,
  GroupItem,
  Mark,
  NumberingBase,
  RuleItem,
  RuleTreeItem,
} from '@konnekt/api-types/form-connections';

import {
  addRule,
  deleteItem,
  duplicateRule,
  effectiveItems,
  findItem,
  flattenItems,
  foldName,
  groupItems,
  isDissolved,
  itemsWithNouns,
  levelOf,
  newRule,
  replaceItem,
  spliceLevel,
  ungroupItem,
} from './tree';
import type { DeletionEffect, RenameClash, RuleCopy, TakenName } from './types';

/** The main branch as the functions read it: its top-level AND/OR and its items. */
type MainBranch = Pick<BranchInput, 'operator' | 'items'>;

/** Whether two values are equal, keys without a value counting as null, as the server reads them. */
export function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (a === null || a === undefined || b === null || b === undefined) {
    return (a ?? null) === (b ?? null);
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((value, index) => sameValue(value, b[index]))
    );
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const left = a as Record<string, unknown>;
    const right = b as Record<string, unknown>;
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    return [...keys].every((key) => sameValue(left[key], right[key]));
  }
  return false;
}

/** A text as the server stores it: trimmed; a group's blank message counts as none. */
function stored(text: string | null): string | null {
  return text?.trim() || null;
}

/**
 * Whether two versions of an item are equal in what counts as a change (FR-022; data-model.md,
 * "Equal"): a rule's target, condition, message and name; a group's AND/OR, name and message.
 * Never a group's members or an item's place.
 */
export function sameContent(a: RuleTreeItem, b: RuleTreeItem): boolean {
  if (a.type !== b.type || stored(a.name) !== stored(b.name)) {
    return false;
  }
  if (a.type === 'rule' && b.type === 'rule') {
    return (
      sameValue(a.target, b.target) &&
      sameValue(a.condition, b.condition) &&
      stored(a.message) === stored(b.message)
    );
  }
  return (
    a.type === 'group' &&
    b.type === 'group' &&
    a.operator === b.operator &&
    stored(a.message) === stored(b.message)
  );
}

/** `item` with the content of `source`, what counts as a change; its mark and members stay. */
function withContent<T extends RuleTreeItem>(item: T, source: RuleTreeItem): T {
  if (item.type === 'rule' && source.type === 'rule') {
    const { name, target, condition, message } = source;
    return { ...item, name, target, condition, message };
  }
  if (item.type === 'group' && source.type === 'group') {
    const { name, operator, message } = source;
    return { ...item, name, operator, message };
  }
  return item;
}

/** The mark an item the branch adds gets: `added` in a based branch, none elsewhere. */
function ownMark(branch: Pick<BranchInput, 'origin'>): Mark | null {
  return branch.origin === 'based' ? 'added' : null;
}

/** Whether an item of a branch is the main branch's, which a based branch inherits. */
export function isInherited(branch: Pick<BranchInput, 'origin'>, item: RuleTreeItem): boolean {
  return branch.origin === 'based' && item.mark !== 'added';
}

/** The main branch's version of an inherited item, or null. */
function originalOf(main: MainBranch, id: string): RuleTreeItem | null {
  return findItem(main.items, id)?.item ?? null;
}

/** A tree's items without marks, as a new based branch copies them. */
function unmarked(items: RuleTreeItem[]): RuleTreeItem[] {
  return items.map((item) =>
    item.type === 'group'
      ? { ...item, mark: null, items: unmarked(item.items) }
      : { ...item, mark: null }
  );
}

/**
 * A new branch (FR-019): based on the main branch, it starts with a copy of the main branch's
 * items, unmarked, and follows its top-level AND/OR; empty, it starts with no rules and AND.
 * Its id is null until the connection is saved.
 */
export function newBranch(
  main: MainBranch,
  origin: 'based' | 'empty',
  name: string,
  description: string | null
): BranchInput {
  const based = origin === 'based';
  return {
    id: null,
    name: name.trim(),
    description: description?.trim() || null,
    origin,
    operator: based ? main.operator : 'and',
    operator_mark: null,
    items: based ? unmarked(main.items) : [],
  };
}

/**
 * The tree with every group of the branch's own (`added`) that has fewer than two members that
 * count dissolved: its members, removed ones included, take its place (data-model.md,
 * "Dissolution": a group of the branch's own dissolves at once, like a main-branch group).
 * Inner groups first, so a group whose sub-group dissolves counts that sub-group's members.
 */
function settleOwnGroups(items: RuleTreeItem[]): RuleTreeItem[] {
  return items.flatMap((item) => {
    if (item.type !== 'group') {
      return [item];
    }
    const members = settleOwnGroups(item.items);
    if (item.mark === 'added' && effectiveItems(members, true).length < 2) {
      return members;
    }
    const same =
      members.length === item.items.length &&
      members.every((member, index) => member === item.items[index]);
    return [same ? item : { ...item, items: members }];
  });
}

/** Whether `id` is in `item` or below it. */
function holds(item: RuleTreeItem, id: string): boolean {
  return item.id === id || (item.type === 'group' && findItem(item.items, id) !== null);
}

/**
 * The tree with `item` put into the level `parentId`, after the nearest of the main branch's
 * preceding siblings that the level holds, also inside a group of the branch's own, or first
 * if there is none (propagation rule 3, EC-14).
 */
function insertAfterSibling(
  items: RuleTreeItem[],
  parentId: string | null,
  preceding: RuleTreeItem[],
  item: RuleTreeItem
): RuleTreeItem[] {
  const level = levelOf(items, parentId);
  for (const sibling of [...preceding].reverse()) {
    const index = level.findIndex((entry) => holds(entry, sibling.id));
    if (index >= 0) {
      return spliceLevel(items, parentId, index + 1, 0, [item]);
    }
  }
  return spliceLevel(items, parentId, 0, 0, [item]);
}

/** The tree without an item, whose members, if any, take its place. */
function dropKeepingMembers(items: RuleTreeItem[], id: string): RuleTreeItem[] {
  const found = findItem(items, id);
  if (!found) {
    return items;
  }
  const members = found.item.type === 'group' ? found.item.items : [];
  return spliceLevel(items, found.parentId, found.index, 1, members);
}

/** The tree without an item and what it holds. */
function dropWhole(items: RuleTreeItem[], id: string): RuleTreeItem[] {
  const found = findItem(items, id);
  return found ? spliceLevel(items, found.parentId, found.index, 1, []) : items;
}

/** Whether the level `parentId` is a group of the branch's own. */
function isOwnGroup(items: RuleTreeItem[], parentId: string | null): boolean {
  return parentId !== null && findItem(items, parentId)?.item.mark === 'added';
}

/**
 * The tree with one of the main branch's items where the main branch has it, and with the main
 * branch's content where the branch follows it (propagation rules 1, 3 and 4). `preceding` are
 * its siblings before it in the main branch.
 */
function placeMainItem(
  items: RuleTreeItem[],
  mainItem: RuleTreeItem,
  parentId: string | null,
  preceding: RuleTreeItem[]
): RuleTreeItem[] {
  const found = findItem(items, mainItem.id);
  if (!found) {
    // Rule 3: an item the main branch added appears, following it. A group's members follow
    const fresh: RuleTreeItem =
      mainItem.type === 'group'
        ? { ...mainItem, mark: null, items: [] }
        : { ...mainItem, mark: null };
    return insertAfterSibling(items, parentId, preceding, fresh);
  }
  const { item } = found;
  let current = item;
  if (item.mark === null || item.mark === 'removed') {
    // Rule 1: unmarked and removed items mirror the main branch's
    current = withContent(item, mainItem);
  } else if (item.mark === 'added') {
    // The main branch has the item again, such as a copy of it: the branch keeps its version
    current = { ...item, mark: 'changed' };
  }
  let next = current === item ? items : replaceItem(items, current);
  // Rule 4: moves follow the main branch, except out of a group of the branch's own
  if (found.parentId !== parentId && !isOwnGroup(next, found.parentId)) {
    next = insertAfterSibling(dropWhole(next, item.id), parentId, preceding, current);
  }
  return next;
}

/**
 * A based branch updated to the main branch's change from `oldMain` to `newMain` (FR-021,
 * FR-022; data-model.md, "Propagation from the main branch"). Branches that started empty, and
 * the main branch itself, come back as they are.
 * 1. Unmarked and removed items take the main branch's new content.
 * 2. An item the main branch deleted disappears, unless the branch changed it: it then stays
 *    where it was, marked `added`, with its identifier (EC-12, EC-13).
 * 3. An item the main branch added appears unmarked, after the nearest preceding sibling that
 *    the branch has in the same level, or first there (EC-14); also in a group the branch
 *    removed or changed.
 * 4. Moves follow the main branch, except a rule in a group of the branch's own (FR-022).
 * 5. A group the main branch dissolved goes, and its members take its place, unless the branch
 *    changed it (rule 2). A group so kept, or any group of the branch's own, left with fewer
 *    than two members dissolves all the same (FR-022's one exception).
 * 6. The top-level AND/OR follows the main branch while `operator_mark` is null.
 * 8. An ungroup reaches the branch as the group's deletion plus moves, "Delete group" as
 *    deletions.
 * Rule 7, a rename that clashes in the branch, is refused before the change (`renameClash`).
 */
export function propagateMain<B extends BranchInput>(
  oldMain: MainBranch,
  newMain: MainBranch,
  branch: B
): B {
  if (branch.origin !== 'based') {
    return branch;
  }
  const kept = new Set(flattenItems(newMain.items).map((item) => item.id));
  let items = branch.items;
  // Rules 2, 5 and 8: what the main branch deleted
  for (const deleted of flattenItems(oldMain.items)) {
    const found = kept.has(deleted.id) ? null : findItem(items, deleted.id);
    if (found?.item.mark === 'changed') {
      items = replaceItem(items, { ...found.item, mark: 'added' });
    } else if (found && found.item.mark !== 'added') {
      items = dropKeepingMembers(items, deleted.id);
    }
  }
  // Rules 1, 3 and 4, level by level in display order, so that a level and the siblings before
  // an item are in place before it
  const place = (level: RuleTreeItem[], parentId: string | null) => {
    level.forEach((mainItem, index) => {
      items = placeMainItem(items, mainItem, parentId, level.slice(0, index));
      if (mainItem.type === 'group') {
        place(mainItem.items, mainItem.id);
      }
    });
  };
  place(newMain.items, null);
  return {
    ...branch,
    operator: branch.operator_mark === null ? newMain.operator : branch.operator,
    items: settleOwnGroups(items),
  };
}

/**
 * Every branch after a change of the main branch from `oldMain` to the first of `branches`:
 * the based branches follow it (`propagateMain`). Unchanged when the main branch is.
 */
export function propagateToBranches<B extends BranchInput>(
  oldMain: MainBranch,
  branches: B[]
): B[] {
  const [main, ...others] = branches;
  if (main.items === oldMain.items && main.operator === oldMain.operator) {
    return branches;
  }
  return [main, ...others.map((branch) => propagateMain(oldMain, main, branch))];
}

/**
 * The branch with an item's content replaced by `item`'s, what counts as a change: a rule's
 * target, condition, message and name; a group's AND/OR, name and message. A group's members
 * stay. In a based branch, an inherited item becomes `changed` (FR-022, EC-15), or follows the
 * main branch again when the edit leaves it equal to the main branch's (FR-024); an item of the
 * branch's own stays `added`. Null for a removed item, which can only be restored (FR-024), and
 * for an item the branch doesn't have.
 */
export function changeItem<B extends BranchInput>(
  main: MainBranch,
  branch: B,
  item: RuleTreeItem
): B | null {
  const found = findItem(branch.items, item.id);
  if (!found || found.item.mark === 'removed') {
    return null;
  }
  let next = withContent(found.item, item);
  if (isInherited(branch, found.item)) {
    const original = originalOf(main, item.id);
    next =
      original && sameContent(next, original)
        ? withContent({ ...next, mark: null }, original)
        : { ...next, mark: 'changed' };
  }
  return { ...branch, items: replaceItem(branch.items, next) };
}

/**
 * The branch with a changed item following the main branch again, with its content (FR-024,
 * "Reset to Standard"). A group's members keep their own marks. Null unless the item is
 * `changed`.
 */
export function resetItem<B extends BranchInput>(
  main: MainBranch,
  branch: B,
  id: string
): B | null {
  const found = findItem(branch.items, id);
  const original = originalOf(main, id);
  if (found?.item.mark !== 'changed' || !original) {
    return null;
  }
  return {
    ...branch,
    items: replaceItem(branch.items, withContent({ ...found.item, mark: null }, original)),
  };
}

/**
 * The based branch with an inherited item removed there (FR-023): it stays, marked `removed`,
 * with the main branch's content, so a changed item's change goes. A group's members keep their
 * own marks (F15). A group of the branch's own that the removal leaves with fewer than two
 * members that count dissolves. Null for an item that isn't inherited or is removed already.
 */
export function removeItem<B extends BranchInput>(
  main: MainBranch,
  branch: B,
  id: string
): B | null {
  const found = findItem(branch.items, id);
  const original = originalOf(main, id);
  if (!found || !original || !isInherited(branch, found.item) || found.item.mark === 'removed') {
    return null;
  }
  const removed = withContent({ ...found.item, mark: 'removed' as const }, original);
  return { ...branch, items: settleOwnGroups(replaceItem(branch.items, removed)) };
}

/** An item and what it holds, with every removal undone and the main branch's content. */
function restored(main: MainBranch, item: RuleTreeItem): RuleTreeItem {
  const original = item.mark === 'removed' ? originalOf(main, item.id) : null;
  const own = original ? withContent({ ...item, mark: null }, original) : item;
  return own.type === 'group'
    ? { ...own, items: own.items.map((member) => restored(main, member)) }
    : own;
}

/**
 * The based branch with a removed item following the main branch again (FR-024). Restoring a
 * group, also one dissolved in the branch, restores the members removed inside it. Null for an
 * item that is neither removed nor a dissolved group.
 */
export function restoreItem<B extends BranchInput>(
  main: MainBranch,
  branch: B,
  id: string
): B | null {
  const found = findItem(branch.items, id);
  if (
    !found ||
    (found.item.mark !== 'removed' && !isDissolved(found.item, branch.origin === 'based'))
  ) {
    return null;
  }
  return { ...branch, items: replaceItem(branch.items, restored(main, found.item)) };
}

/**
 * What a deleted item of the branch's own leaves in its place: nothing of its own, and the
 * inherited items it held, removed, since a based branch can only remove those (FR-024).
 */
function discard(main: MainBranch, item: RuleTreeItem): RuleTreeItem[] {
  if (item.mark === 'added') {
    return item.type === 'group' ? item.items.flatMap((member) => discard(main, member)) : [];
  }
  const original = originalOf(main, item.id);
  const removed = original ? withContent({ ...item, mark: 'removed' as const }, original) : item;
  return [
    removed.type === 'group'
      ? { ...removed, items: removed.items.flatMap((member) => discard(main, member)) }
      : removed,
  ];
}

/**
 * The branch without a rule or group (FR-008). In the main branch and in a branch that started
 * empty, a group goes with its members, and a group left with fewer than two members dissolves
 * at once (tree.ts `deleteItem`). In a based branch, only an item of the branch's own can be
 * deleted: the inherited rules it holds stay, removed, and a group of the branch's own left with
 * fewer than two members dissolves. Null for an inherited item of a based branch, which is
 * removed instead (`removeItem`), and for an item the branch doesn't have.
 */
export function deleteFromBranch<B extends BranchInput>(
  main: MainBranch,
  branch: B,
  id: string
): B | null {
  if (branch.origin !== 'based') {
    const deleted = deleteItem(branch.items, id);
    return deleted && { ...branch, items: deleted.items };
  }
  const found = findItem(branch.items, id);
  if (found?.item.mark !== 'added') {
    return null;
  }
  const items = spliceLevel(
    branch.items,
    found.parentId,
    found.index,
    1,
    discard(main, found.item)
  );
  return { ...branch, items: settleOwnGroups(items) };
}

/**
 * The branch with a group ungrouped: its members take its place (FR-008). In a based branch,
 * only a group of the branch's own; an inherited one can only be removed. Null otherwise.
 */
export function ungroupInBranch<B extends BranchInput>(branch: B, id: string): B | null {
  const found = findItem(branch.items, id);
  if (!found || isInherited(branch, found.item)) {
    return null;
  }
  const ungrouped = ungroupItem(branch.items, id);
  return ungrouped && { ...branch, items: settleOwnGroups(ungrouped.items) };
}

/**
 * The branch with rules put into a new group (tree.ts `groupItems`), and the group and the
 * counters after it. In a based branch the group is `added`, and inherited rules in it keep
 * their marks and keep following the main branch (FR-022). Removed rules can't be grouped.
 */
export function groupInBranch<B extends BranchInput>(
  branch: B,
  ids: string[],
  counters: NumberingBase
): { branch: B; group: GroupItem; counters: NumberingBase } | null {
  if (ids.some((id) => findItem(branch.items, id)?.item.mark === 'removed')) {
    return null;
  }
  const grouped = groupItems(branch.items, ids, counters);
  if (!grouped) {
    return null;
  }
  const group: GroupItem = { ...grouped.group, mark: ownMark(branch) };
  return {
    branch: { ...branch, items: replaceItem(grouped.items, group) },
    group,
    counters: grouped.counters,
  };
}

/**
 * The branch with a new rule at the end of a level (tree.ts `addRule`): `added` in a based
 * branch, also in an inherited group, which stays unchanged (FR-022). Null for a removed group,
 * which can only be restored.
 */
export function addRuleToBranch<B extends BranchInput>(
  branch: B,
  rule: RuleItem,
  parentId: string | null = null
): B | null {
  if (parentId !== null && findItem(branch.items, parentId)?.item.mark === 'removed') {
    return null;
  }
  return { ...branch, items: addRule(branch.items, { ...rule, mark: ownMark(branch) }, parentId) };
}

/**
 * The branch with a copy of a rule at the end of its level (tree.ts `duplicateRule`): a new
 * rule with a new identifier, `added` in a based branch (FR-022). Null for a removed rule.
 */
export function duplicateInBranch<B extends BranchInput>(
  branch: B,
  id: string,
  counters: NumberingBase
): { branch: B; rule: RuleItem; counters: NumberingBase } | null {
  if (findItem(branch.items, id)?.item.mark === 'removed') {
    return null;
  }
  const duplicated = duplicateRule(branch.items, id, counters);
  if (!duplicated) {
    return null;
  }
  const rule: RuleItem = { ...duplicated.rule, mark: ownMark(branch) };
  return {
    branch: { ...branch, items: replaceItem(duplicated.items, rule) },
    rule,
    counters: duplicated.counters,
  };
}

/**
 * The branch with its top level switched to AND or OR (FR-007). In a based branch the switch
 * marks the top level (`operator_mark`), unless it makes it equal to the main branch's again
 * (FR-021, FR-024).
 */
export function setBranchOperator<B extends BranchInput>(
  main: MainBranch,
  branch: B,
  operator: Combinator
): B {
  if (branch.origin !== 'based') {
    return { ...branch, operator };
  }
  return { ...branch, operator, operator_mark: operator === main.operator ? null : 'changed' };
}

/** The based branch's top level following the main branch's AND/OR again (FR-024). */
export function resetBranchOperator<B extends BranchInput>(main: MainBranch, branch: B): B {
  return { ...branch, operator: main.operator, operator_mark: null };
}

/**
 * The names an undo gives back in a based branch: the main branch's names of the items it
 * changed (FR-005, FR-024). None in other branches.
 */
export function namesGivenBackByUndo(main: MainBranch, branch: BranchInput): TakenName[] {
  if (branch.origin !== 'based') {
    return [];
  }
  const changed = new Set(
    flattenItems(branch.items)
      .filter((item) => item.mark === 'changed')
      .map((item) => item.id)
  );
  return itemsWithNouns(main.items)
    .filter(({ item }) => changed.has(item.id))
    .map(({ item, noun }) => ({ name: item.name.trim(), noun, ownerId: item.id }));
}

/**
 * The names taken in a branch, in display order (FR-005; data-model.md, "Identifiers and
 * names"): every item's name, removed items included, and in a based branch also the names an
 * undo gives back (`namesGivenBackByUndo`).
 */
export function takenNames(main: MainBranch, branch: BranchInput): TakenName[] {
  const own = itemsWithNouns(branch.items).map(({ item, noun }) => ({
    name: item.name.trim(),
    noun,
    ownerId: item.id,
  }));
  return [...own, ...namesGivenBackByUndo(main, branch)];
}

/**
 * The first based branch in which the main branch's item `itemId` can't take `name` (propagation
 * rule 7; FR-005, F12): where the branch follows the item or changed it, another item there holds
 * the name or gets it back with an undo. Null when every branch can take it.
 */
export function renameClash<B extends BranchInput>(
  branches: B[],
  itemId: string,
  name: string
): RenameClash<B> | null {
  const [main] = branches;
  const folded = foldName(name);
  for (const branch of branches.slice(1)) {
    if (branch.origin !== 'based' || !findItem(branch.items, itemId)) {
      continue;
    }
    const taken = takenNames(main, branch).find(
      (entry) => entry.ownerId !== itemId && foldName(entry.name) === folded
    );
    if (taken) {
      return { branch, taken };
    }
  }
  return null;
}

/**
 * What a deletion in the main branch, to `newMainItems`, does to the branches based on it, for
 * Standard's confirmation (F14; propagation rules 2 and 5): the items each branch changed and
 * keeps as its own, and the groups it changed that dissolve all the same. Only branches with
 * either, in tab order.
 */
export function deletionEffects<B extends BranchInput>(
  branches: B[],
  newMainItems: RuleTreeItem[]
): DeletionEffect<B>[] {
  const [main, ...others] = branches;
  const remaining = new Set(flattenItems(newMainItems).map((item) => item.id));
  const newMain = { ...main, items: newMainItems };
  return others.flatMap((branch) => {
    if (branch.origin !== 'based') {
      return [];
    }
    const after = new Set(
      flattenItems(propagateMain(main, newMain, branch).items).map((item) => item.id)
    );
    const gone = flattenItems(branch.items).filter(
      (item) => item.mark === 'changed' && !remaining.has(item.id)
    );
    const kept = gone.filter((item) => after.has(item.id));
    const dissolved = gone.filter(
      (item): item is GroupItem => item.type === 'group' && !after.has(item.id)
    );
    return kept.length > 0 || dissolved.length > 0 ? [{ branch, kept, dissolved }] : [];
  });
}

/**
 * Copies of a rule in other branches (FR-022): each a new rule, not linked, with a new
 * identifier and its default name, at the end of the target's top level, `added` in a based
 * branch. A copy to the main branch appears, linked and unmarked, in every branch based on it,
 * so choosing the main branch covers those, which get no copy of their own; from a based branch
 * it appears there beside the branch's original. `targets` are branch indexes, in tab order.
 * Null if the source has no such rule.
 */
export function copyRule<B extends BranchInput>(
  branches: B[],
  sourceIndex: number,
  ruleId: string,
  targets: number[],
  counters: NumberingBase
): { branches: B[]; counters: NumberingBase; copies: RuleCopy[] } | null {
  const found = findItem(branches[sourceIndex]?.items ?? [], ruleId);
  if (found?.item.type !== 'rule') {
    return null;
  }
  const { target, condition, message } = found.item;
  const toMain = targets.includes(0);
  let next = counters;
  const copies: RuleCopy[] = [];
  const copied = branches.map((branch, index) => {
    const covered = toMain && index > 0 && branch.origin === 'based';
    if (!targets.includes(index) || index === sourceIndex || covered) {
      return branch;
    }
    const created = newRule(next);
    next = created.counters;
    const rule: RuleItem = { ...created.rule, mark: ownMark(branch), target, condition, message };
    copies.push({ branchIndex: index, rule });
    return { ...branch, items: addRule(branch.items, rule) };
  });
  if (copies.length === 0) {
    return null;
  }
  return { branches: propagateToBranches(branches[0], copied), counters: next, copies };
}
