// The checked tree (specs/003-rule-consistency-checks, FR-001, FR-002, FR-011; research R2;
// data-model.md, "Checked branch"; contracts/rule-checks.md): `buildCheckedBranch()` turns one
// branch of the rules step's state into what the solver and the findings read, on the main thread,
// after every change. It holds the items that count with each rule's formula (`ruleFormula()`),
// the rules left out, the variables the formulas use, today, and a fingerprint, which the hook
// compares with its cache to check only the branches whose result can differ (research R10).
//
// The result is plain data with no names or messages, so it can be posted to the worker, and a
// rename needs no new check: the notes take the current names when they are shown (FR-011)
import type {
  BranchInput,
  Combinator,
  GroupItem,
  RuleItem,
  RuleTreeItem,
} from '@connection-portal/api-types/form-connections';

import { isComplete, optionsOf, resolveTarget } from '../conditions';
import { effectiveItems } from '../tree';
import { checksUnrequestedData } from '../validation';
import { type LiteralContext, type RuleFormula, ruleFormula } from './literals';
import type {
  CheckedBranch,
  CheckedItem,
  CheckedRule,
  Formula,
  LiteralTest,
  Variable,
} from './types';

/**
 * A branch of the rules step's state with the step's key, as `buildCheckedBranch()` reads it:
 * `RulesBranch` is one, which utils/ doesn't import from pages/. Only the fields the checks read
 * are required, so a `BranchInput` with a `key` fits as well
 */
export interface KeyedBranch extends Pick<BranchInput, 'origin' | 'operator' | 'items'> {
  /** `RulesBranch.key`, stable while the branch has no id */
  key: string;
}

/** What the walk over a branch's items collects besides the checked items */
interface Collected {
  /** The ids of the rules left out, in display order */
  leftOut: string[];
  /** The variables of the checked rules, by key, in the order the formulas first use them */
  variables: Map<string, Variable>;
}

/**
 * A value of the fingerprint's canonical form: scalars, and arrays whose entries come in a fixed
 * order, so that `JSON.stringify()` writes it the same way whatever order an object's keys were
 * set in
 */
type Canonical = string | number | boolean | readonly Canonical[];

/**
 * One branch's checked tree (data-model.md, "Checked branch"), derived in this order:
 * 1. The items that count, `effectiveItems(items, origin === 'based')` (`tree.ts`), at every
 *    level, as the evaluator's `effective_items()` takes them: in a based branch, removed rules
 *    and groups are absent with everything in them, and an inherited group dissolved there is
 *    replaced by its remaining member, in its place (FR-001).
 * 2. Every rule without a target, with a target that isn't among the requested documents' fields
 *    (`checksUnrequestedData()`), with an incomplete condition (`isComplete()` with the field's
 *    value set), or without a formula (`ruleFormula()`: anything else the evaluator couldn't read
 *    or the save's checks would refuse) is left out, and its id goes to `leftOut` (FR-002, W11).
 *    A rule without an error message is kept: its message doesn't change who meets it.
 * 3. Bottom-up, a group with one item left becomes that item, in its place, and carries no finding
 *    of its own; a group with none is left out (research R2).
 * 4. A branch without items left has no checks and no findings (EC "A branch without rules",
 *    W13): its `items` are empty.
 *
 * `leftOut` holds only the rules that step 2 leaves out, in display order: a group left out
 * because none of its items is left adds the ids of its rules, which step 2 left out, but not its
 * own. Removed items, and the members of removed groups, aren't the team member's rules with a
 * problem: they are absent from the tree, and from `leftOut` too, as from the evaluation.
 *
 * `context` holds the requested documents, each with only its requested fields
 * (`requestedRuleDocuments()`), and the value sets as loaded. `today` is `YYYY-MM-DD`, the date in
 * Germany (`todayInGermany()`); it is kept as given.
 *
 * Never throws on a branch of the rules state, whatever its problems: incomplete or unreadable
 * conditions, unknown targets, empty groups, groups nested deeper than the editor allows. A rule's
 * condition is read by `ruleFormula()`, which never throws, and by `isComplete()` only once
 * `ruleFormula()` accepted it.
 *
 * Linear in the number of items: each rule is read once, in time bounded by the catalog and the
 * value sets. Each level's `effectiveItems()` also counts the members of the inherited groups
 * below it, and the rules state has three levels at most (the top level, groups, and sub-groups
 * that hold rules only), so no item is read more than three times. A tree nested deeper than the
 * editor allows takes the number of items times its depth
 */
export function buildCheckedBranch(
  branch: KeyedBranch,
  context: LiteralContext,
  today: string
): CheckedBranch {
  const collected: Collected = { leftOut: [], variables: new Map() };
  const items = checkedLevel(branch.items, branch.origin === 'based', context, collected);
  const { leftOut, variables } = collected;
  return {
    branchKey: branch.key,
    operator: branch.operator,
    items,
    leftOut,
    variables: Object.fromEntries(variables),
    today,
    fingerprint: fingerprintOf(branch.operator, items, leftOut, [...variables.values()], today),
  };
}

/** The checked items of one level, in display order: steps 1 to 3 for each item that counts */
function checkedLevel(
  level: RuleTreeItem[],
  based: boolean,
  context: LiteralContext,
  collected: Collected
): CheckedItem[] {
  const checked: CheckedItem[] = [];
  for (const item of effectiveItems(level, based)) {
    const entry =
      item.type === 'group'
        ? checkedGroup(item, based, context, collected)
        : checkedRule(item, context, collected);
    if (entry) {
      checked.push(entry);
    }
  }
  return checked;
}

/**
 * A group's checked form (step 3): itself with its checked items when two or more are left, the
 * one item left in its place, or null when none is
 */
function checkedGroup(
  group: GroupItem,
  based: boolean,
  context: LiteralContext,
  collected: Collected
): CheckedItem | null {
  const items = checkedLevel(group.items, based, context, collected);
  if (items.length < 2) {
    return items.length === 1 ? items[0] : null;
  }
  return { type: 'group', id: group.id, operator: group.operator, items };
}

/**
 * A rule's checked form with its formula, collecting its variables, or null with its id in
 * `leftOut` when step 2 leaves it out
 */
function checkedRule(
  rule: RuleItem,
  context: LiteralContext,
  collected: Collected
): CheckedRule | null {
  const read = checkedFormula(rule, context);
  if (!read) {
    collected.leftOut.push(rule.id);
    return null;
  }
  for (const variable of read.variables) {
    if (!collected.variables.has(variable.key)) {
      collected.variables.set(variable.key, variable);
    }
  }
  return { type: 'rule', id: rule.id, formula: read.formula };
}

/**
 * The rule's formula, or null when step 2 leaves the rule out. The conditions are alternatives, so
 * their order doesn't change which rules are left out; `ruleFormula()` comes before `isComplete()`
 * because it reads any condition without throwing, and accepts only the shapes that
 * `isComplete()` reads. `isComplete()` still refuses some conditions that have a formula, such as
 * an enum value that isn't in the value set, or one chosen twice, which the save refuses too
 */
function checkedFormula(rule: RuleItem, context: LiteralContext): RuleFormula | null {
  const { documents, optionSets } = context;
  if (!rule.target || checksUnrequestedData(rule, documents)) {
    return null;
  }
  const read = ruleFormula(rule, context);
  const resolved = read && resolveTarget(rule.target, documents);
  if (!read || !resolved) {
    return null;
  }
  const options = resolved.kind === 'enum' ? optionsOf(optionSets, resolved.optionSet) : null;
  return isComplete(rule.condition, resolved.kind, options) ? read : null;
}

/**
 * The fingerprint: a canonical serialisation of everything the checks read, which is the checked
 * branch but for `branchKey` (data-model.md): `JSON.stringify()` of
 * `[operator, items, leftOut, variables, today]`, where every object is written as an array of
 * its fields in a fixed order (`canonicalItem()`, `canonicalVariable()`), and the variables in the
 * order the formulas first use them, which follows from the items. Item ids are in it, since the
 * findings name items by them; names and messages aren't, since no finding depends on them. Two
 * branches with equal fingerprints get equal results. Linear in the size of the checked branch
 */
function fingerprintOf(
  operator: Combinator,
  items: readonly CheckedItem[],
  leftOut: readonly string[],
  variables: readonly Variable[],
  today: string
): string {
  const canonical: Canonical = [
    operator,
    items.map(canonicalItem),
    leftOut,
    variables.map(canonicalVariable),
    today,
  ];
  return JSON.stringify(canonical);
}

/** A checked item as `['rule', id, formula]` or `['group', id, operator, items]` */
function canonicalItem(item: CheckedItem): Canonical {
  return item.type === 'rule'
    ? ['rule', item.id, canonicalFormula(item.formula)]
    : ['group', item.id, item.operator, item.items.map(canonicalItem)];
}

/**
 * A formula as `true` or `false`, `['and', formulas]`, `['or', formulas]`, or
 * `['literal', variable, negated, test]`
 */
function canonicalFormula(formula: Formula): Canonical {
  if (typeof formula === 'boolean') {
    return formula;
  }
  if ('and' in formula) {
    return ['and', formula.and.map(canonicalFormula)];
  }
  if ('or' in formula) {
    return ['or', formula.or.map(canonicalFormula)];
  }
  return ['literal', formula.variable, formula.negated, canonicalTest(formula.test)];
}

/** A literal's test as its kind, its operator, then its values in the order of `types.ts` */
function canonicalTest(test: LiteralTest): Canonical {
  switch (test.kind) {
    case 'number':
      return ['number', test.op, test.value];
    case 'text':
      return ['text', test.op, test.text, test.matchCase];
    case 'enum':
      return ['enum', test.op, test.values];
    case 'date':
      return 'date' in test
        ? ['date', test.op, test.date]
        : ['date', test.op, test.count, test.unit];
  }
}

/** A variable as `[key, kind, multiple, values]` */
function canonicalVariable(variable: Variable): Canonical {
  return [variable.key, variable.kind, variable.multiple, variable.values];
}
