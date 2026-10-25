// Operations on one branch's tree of rules (FR-005, FR-007, FR-010; research R5). Every function
// is pure: it returns new arrays and items, and what an undo restores
import type {
  BranchInput,
  NumberingBase,
  RuleItem,
  RuleTreeItem,
} from '../../types/form-connections';
import type { DeletedItem, FoundItem } from './types';

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

/**
 * The tree without an item, and the item with its place, which `restoreItem` puts back to undo
 * the deletion. A group goes with its members.
 */
export function deleteItem(
  items: RuleTreeItem[],
  id: string
): { items: RuleTreeItem[]; deleted: DeletedItem } | null {
  const found = findItem(items, id);
  if (!found) {
    return null;
  }
  const { item, parentId, index } = found;
  return {
    items: changeLevel(items, parentId, (level) => level.filter((entry) => entry.id !== id)),
    deleted: { item, parentId, index },
  };
}

/**
 * The tree with a deleted item back in its place. If its group is gone meanwhile, it goes back
 * at the end of the top level.
 */
export function restoreItem(items: RuleTreeItem[], deleted: DeletedItem): RuleTreeItem[] {
  const parentId =
    deleted.parentId !== null && findItem(items, deleted.parentId) ? deleted.parentId : null;
  return changeLevel(items, parentId, (level) => {
    const index =
      parentId === deleted.parentId ? Math.min(deleted.index, level.length) : level.length;
    return [...level.slice(0, index), deleted.item, ...level.slice(index)];
  });
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
