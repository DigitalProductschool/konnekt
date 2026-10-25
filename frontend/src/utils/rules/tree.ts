// Operations on one branch's tree of rules and groups (FR-005, FR-007, FR-008, FR-010; research
// R5). Every function is pure: it returns new arrays and items, and what an undo restores
import type {
  BranchInput,
  Combinator,
  GroupItem,
  NumberingBase,
  RuleItem,
  RuleTreeItem,
} from '../../types/form-connections';
import type { FoundItem, LevelChange } from './types';

/** A number with at least two digits: 7 → "07", 123 → "123". */
export function twoDigits(number: number | string): string {
  return String(number).padStart(2, '0');
}

export function ruleIdOf(number: number): string {
  return `rule-${number}`;
}

export function groupIdOf(number: number): string {
  return `group-${number}`;
}

/** The number of an identifier, `rule-7` → 7, or null if it has none. */
export function numberOfId(id: string): number | null {
  const match = /^(?:rule|group)-(\d+)$/.exec(id);
  return match ? Number(match[1]) : null;
}

/** A rule's default name: "Rule 07" (FR-005). */
export function defaultRuleName(number: number): string {
  return `Rule ${twoDigits(number)}`;
}

/** A group's default name, "Group 03", or a sub-group's, "Sub-group 04" (FR-005). */
export function defaultGroupName(number: number, subGroup = false): string {
  return `${subGroup ? 'Sub-group' : 'Group'} ${twoDigits(number)}`;
}

/**
 * A new, empty rule numbered from the counters, and the counters after it: `rule-7`, "Rule 07".
 * Its target, condition and message are still to be chosen.
 */
export function newRule(counters: NumberingBase): { rule: RuleItem; counters: NumberingBase } {
  const number = counters.rule;
  return {
    rule: {
      type: 'rule',
      id: ruleIdOf(number),
      name: defaultRuleName(number),
      mark: null,
      target: null,
      condition: null,
      message: '',
    },
    counters: { ...counters, rule: number + 1 },
  };
}

/** Every item of a tree in display order: an item, then its members. */
export function flattenItems(items: RuleTreeItem[]): RuleTreeItem[] {
  return items.flatMap((item) =>
    item.type === 'group' ? [item, ...flattenItems(item.items)] : [item]
  );
}

/** An item by its identifier, with its parent group, its index there and its depth. */
export function findItem(items: RuleTreeItem[], id: string): FoundItem | null {
  const search = (
    level: RuleTreeItem[],
    parentId: string | null,
    depth: number
  ): FoundItem | null => {
    for (const [index, item] of level.entries()) {
      if (item.id === id) {
        return { item, parentId, index, depth };
      }
      if (item.type === 'group') {
        const found = search(item.items, item.id, depth + 1);
        if (found) {
          return found;
        }
      }
    }
    return null;
  };
  return search(items, null, 0);
}

/** The tree with the level of `parentId` (the top level for null) changed by `change`. */
function changeLevel(
  items: RuleTreeItem[],
  parentId: string | null,
  change: (level: RuleTreeItem[]) => RuleTreeItem[]
): RuleTreeItem[] {
  if (parentId === null) {
    return change(items);
  }
  return items.map((item) =>
    item.type === 'group'
      ? {
          ...item,
          items:
            item.id === parentId ? change(item.items) : changeLevel(item.items, parentId, change),
        }
      : item
  );
}

/**
 * The tree with a rule added at the end of a level: the top level by default, or the group or
 * sub-group `parentId` (FR-007).
 */
export function addRule(
  items: RuleTreeItem[],
  rule: RuleItem,
  parentId: string | null = null
): RuleTreeItem[] {
  return changeLevel(items, parentId, (level) => [...level, rule]);
}

/** The tree with the item of the same identifier replaced by `item`, wherever it is. */
export function replaceItem(items: RuleTreeItem[], item: RuleTreeItem): RuleTreeItem[] {
  return items.map((entry) => {
    if (entry.id === item.id) {
      return item;
    }
    return entry.type === 'group' ? { ...entry, items: replaceItem(entry.items, item) } : entry;
  });
}

/**
 * The tree with a rule's name, target, condition or message changed, and the rule as it was,
 * which `replaceItem` puts back to undo the change. Null if there is no such rule.
 */
export function updateRule(
  items: RuleTreeItem[],
  id: string,
  changes: Partial<Pick<RuleItem, 'name' | 'target' | 'condition' | 'message'>>
): { items: RuleTreeItem[]; previous: RuleItem } | null {
  const found = findItem(items, id);
  if (!found || found.item.type !== 'rule') {
    return null;
  }
  return { items: replaceItem(items, { ...found.item, ...changes }), previous: found.item };
}

/**
 * The tree with a rule, group or sub-group renamed, and the item as it was, which
 * `replaceItem` puts back. Check the name with `nameProblem` (validation.ts) first.
 */
export function renameItem(
  items: RuleTreeItem[],
  id: string,
  name: string
): { items: RuleTreeItem[]; previous: RuleTreeItem } | null {
  const found = findItem(items, id);
  if (!found) {
    return null;
  }
  return { items: replaceItem(items, { ...found.item, name }), previous: found.item };
}

/** The items of a level: the top level for null, or a group's members. */
function levelOf(items: RuleTreeItem[], parentId: string | null): RuleTreeItem[] {
  if (parentId === null) {
    return items;
  }
  const found = findItem(items, parentId);
  return found?.item.type === 'group' ? found.item.items : [];
}

/** The tree with `count` items of a level, from `index` on, replaced by `replacement`. */
function spliceLevel(
  items: RuleTreeItem[],
  parentId: string | null,
  index: number,
  count: number,
  replacement: RuleTreeItem[]
): RuleTreeItem[] {
  return changeLevel(items, parentId, (level) => [
    ...level.slice(0, index),
    ...replacement,
    ...level.slice(index + count),
  ]);
}

/**
 * The tree without an item, and what `undoChange` needs to put it back. A group goes with its
 * members. A group or sub-group left with fewer than two members is dissolved at once: the
 * remaining member takes its place, and the group's AND/OR and message are dropped; a sub-group
 * that reaches the top level so becomes a group, with its identifier, name, AND/OR and message
 * (FR-008; data-model.md, "Dissolution", for the main branch and branches that started empty).
 */
export function deleteItem(
  items: RuleTreeItem[],
  id: string
): {
  items: RuleTreeItem[];
  deleted: RuleTreeItem;
  /** The group the deletion dissolved, as it was */
  dissolved: GroupItem | null;
  undo: LevelChange;
} | null {
  const found = findItem(items, id);
  if (!found) {
    return null;
  }
  const { item, parentId, index } = found;
  const parent = parentId === null ? null : findItem(items, parentId);
  if (parent?.item.type === 'group' && parent.item.items.length <= 2) {
    const group = parent.item;
    const remaining = group.items.filter((entry) => entry.id !== id);
    return {
      items: spliceLevel(items, parent.parentId, parent.index, 1, remaining),
      deleted: item,
      dissolved: group,
      undo: {
        parentId: parent.parentId,
        index: parent.index,
        before: [group],
        after: remaining.map((entry) => entry.id),
      },
    };
  }
  return {
    items: spliceLevel(items, parentId, index, 1, []),
    deleted: item,
    dissolved: null,
    undo: { parentId, index, before: [item], after: [] },
  };
}

/**
 * The tree with a change undone: the range of `change` back as it was. If its group is gone
 * meanwhile, the items go back at the end of the top level.
 */
export function undoChange(items: RuleTreeItem[], change: LevelChange): RuleTreeItem[] {
  const parentId =
    change.parentId !== null && findItem(items, change.parentId) ? change.parentId : null;
  if (parentId !== change.parentId) {
    return [...items, ...change.before];
  }
  const after = new Set(change.after);
  return changeLevel(items, parentId, (level) => {
    const kept = level.filter((entry) => !after.has(entry.id));
    const index = Math.min(change.index, kept.length);
    return [...kept.slice(0, index), ...change.before, ...kept.slice(index)];
  });
}

/**
 * The tree with two or more rules of one level put into a new group, which takes the place of
 * the first of them, and the counters after it (FR-007, FR-008). Rules of the top level form a
 * group, "Group 03"; rules of a group form a sub-group, "Sub-group 04"; both are numbered from
 * the group counter. The rules keep their order. Null if the rules can't be grouped: fewer than
 * two, not all rules, not all of one level, or the level of a sub-group.
 */
export function groupItems(
  items: RuleTreeItem[],
  ids: string[],
  counters: NumberingBase
): {
  items: RuleTreeItem[];
  group: GroupItem;
  counters: NumberingBase;
  undo: LevelChange;
} | null {
  if (!canGroup(items, ids)) {
    return null;
  }
  const members = ids
    .map((id) => findItem(items, id))
    .filter((found): found is FoundItem => found !== null)
    .sort((a, b) => a.index - b.index);
  const { parentId, depth } = members[0];
  const first = members[0].index;
  const last = members[members.length - 1].index;
  const number = counters.group;
  const group: GroupItem = {
    type: 'group',
    id: groupIdOf(number),
    name: defaultGroupName(number, depth > 0),
    mark: null,
    operator: 'and',
    message: null,
    items: members.map((found) => found.item),
  };
  const memberIds = new Set(ids);
  const range = levelOf(items, parentId).slice(first, last + 1);
  const between = range.filter((entry) => !memberIds.has(entry.id));
  return {
    items: spliceLevel(items, parentId, first, range.length, [group, ...between]),
    group,
    counters: { ...counters, group: number + 1 },
    undo: {
      parentId,
      index: first,
      before: range,
      after: [group.id, ...between.map((entry) => entry.id)],
    },
  };
}

/**
 * Whether these items can form a group: two or more rules of the top level, or of a group, but
 * not of a sub-group, which can't hold groups (FR-008, US2-AS6).
 */
export function canGroup(items: RuleTreeItem[], ids: string[]): boolean {
  if (ids.length < 2 || new Set(ids).size !== ids.length) {
    return false;
  }
  const found = ids.map((id) => findItem(items, id));
  const [first] = found;
  return (
    first !== null &&
    first.depth <= 1 &&
    found.every(
      (entry) => entry !== null && entry.item.type === 'rule' && entry.parentId === first.parentId
    )
  );
}

/**
 * The tree with a group or sub-group ungrouped: its members take its place, and its AND/OR and
 * message no longer apply. A sub-group among them that reaches the top level becomes a group,
 * with its identifier, name, AND/OR and message (FR-008). Null if there is no such group.
 */
export function ungroupItem(
  items: RuleTreeItem[],
  id: string
): { items: RuleTreeItem[]; group: GroupItem; undo: LevelChange } | null {
  const found = findItem(items, id);
  if (!found || found.item.type !== 'group') {
    return null;
  }
  const { item: group, parentId, index } = found;
  return {
    items: spliceLevel(items, parentId, index, 1, group.items),
    group,
    undo: { parentId, index, before: [group], after: group.items.map((entry) => entry.id) },
  };
}

/**
 * The branch with a level switched to AND or OR, and the operator it had: the top level for
 * null, whose operator is the branch's, or a group or sub-group (FR-007). Null if there is no
 * such group.
 */
export function setOperator<B extends Pick<BranchInput, 'operator' | 'items'>>(
  branch: B,
  parentId: string | null,
  operator: Combinator
): { branch: B; previous: Combinator } | null {
  if (parentId === null) {
    return { branch: { ...branch, operator }, previous: branch.operator };
  }
  const found = findItem(branch.items, parentId);
  if (found?.item.type !== 'group') {
    return null;
  }
  return {
    branch: { ...branch, items: replaceItem(branch.items, { ...found.item, operator }) },
    previous: found.item.operator,
  };
}

/** The operator of a level: the branch's for the top level (null), or the group's. */
export function operatorOf(
  branch: Pick<BranchInput, 'operator' | 'items'>,
  parentId: string | null
): Combinator {
  if (parentId === null) {
    return branch.operator;
  }
  const found = findItem(branch.items, parentId);
  return found?.item.type === 'group' ? found.item.operator : branch.operator;
}

/**
 * The tree with a group's or sub-group's own error message set, or removed with null (FR-004,
 * FR-011), and the group as it was, which `replaceItem` puts back. An empty message is kept
 * while it is being written; the server stores a blank one as none. Null if there is no such
 * group.
 */
export function setGroupMessage(
  items: RuleTreeItem[],
  id: string,
  message: string | null
): { items: RuleTreeItem[]; previous: GroupItem } | null {
  const found = findItem(items, id);
  if (!found || found.item.type !== 'group') {
    return null;
  }
  return { items: replaceItem(items, { ...found.item, message }), previous: found.item };
}

/**
 * The tree with a copy of a rule at the end of the original's level: a new rule with a new
 * identifier and its default name (FR-010, FR-022), and the counters after it. Null if there is
 * no such rule.
 */
export function duplicateRule(
  items: RuleTreeItem[],
  id: string,
  counters: NumberingBase
): { items: RuleTreeItem[]; rule: RuleItem; counters: NumberingBase } | null {
  const found = findItem(items, id);
  if (!found || found.item.type !== 'rule') {
    return null;
  }
  const { rule: fresh, counters: next } = newRule(counters);
  const { target, condition, message } = found.item;
  const rule: RuleItem = { ...fresh, target, condition, message };
  return { items: addRule(items, rule, found.parentId), rule, counters: next };
}

/** Whether a tree holds any rule, in groups too. */
export function treeHasRule(items: RuleTreeItem[]): boolean {
  return items.some((item) => item.type === 'rule' || treeHasRule(item.items));
}

/**
 * Whether any branch has any rule: while none has, the wizard offers publishing "without rules"
 * (FR-001).
 */
export function hasAnyRule(branches: Pick<BranchInput, 'items'>[]): boolean {
  return branches.some((branch) => treeHasRule(branch.items));
}

/**
 * The rules that apply in a branch, for the publish dialog's summary: removed rules and the
 * rules of removed groups don't count, groups aren't counted, the rules in them are.
 */
export function countRules(items: RuleTreeItem[]): number {
  return items.reduce((total, item) => {
    if (item.mark === 'removed') {
      return total;
    }
    return total + (item.type === 'rule' ? 1 : countRules(item.items));
  }, 0);
}
