// Substitution (specs/004-rule-test-personas, research R8; data-model.md "Substitution"; FR-012,
// FR-014, FR-020): turns a branch's checked tree and a slot's fixed values into a formula over the
// slot's free variables, so that generation plans a slot on what its values can still change.
// A kept slot has every value fixed, and a filled slot every value but the absent ones.
//
// It works rule by rule and before any negation, through the evaluator (`ruleOutcome()`), so that a
// fixed value's outcome is exactly what the test step shows. "Not met" and "couldn't be checked"
// both count as not met (FR-014), so ¬X is true for a rule X on an empty value:
//
// - all of its values fixed: `true` if `ruleOutcome()` is 'met', `false` otherwise;
// - none fixed: its formula, unchanged;
// - class K's date, the classes fixed and the date free: `false` if the classes are empty or lack
//   K, the date's literal otherwise;
// - class K's date, the date fixed and the classes free: `false` if the date is empty, otherwise
//   `held(K)` when the outcome for the date is 'met' and `false` when it isn't.
//
// A value is fixed when its key is in the slot's values, whatever it is: an empty value is a value
// (the persona's document doesn't give it), and hidden values count (FR-020). A free variable is
// one whose key is absent.
//
// The result keeps the tree's shape and ids: only the rules' formulas change, so that the items of
// goal 4 keep their places. `variables`, `today` and `fingerprint` stay as they were, so keep
// sampling with the unsubstituted branches' variables. Worker-side code (it reaches the evaluator
// and `checks/`): the main bundle never imports it (tasks.md, "Bundle"). Pure, no logging
import type { RuleItem } from '@connection-portal/api-types/form-connections';

import { variableKey } from '../checks/literals';
import type { CheckedBranch, CheckedItem, Formula } from '../checks/types';
import { type Applicant, ruleOutcome } from '../evaluation';
import type { RuleContext } from '../types';
import { applicantOf } from './applicant';
import { branchFormulaOf, canonicalKeyOf, itemFormulaOf } from './goals';
import type { BranchClass, PersonaField, PersonaValue } from './types';
import { isEmptyValue } from './values';

/** The part of `driving_privileges` that lists the classes held */
const CLASSES_PART = 'classes';

/** What substitution reads besides the trees: a slot's fixed values and the world they live in */
export interface Substitution {
  /**
   * The slot's fixed values by field key: all of a kept slot's, the present ones of a filled slot's
   * (hidden ones too). `{}` for a free slot, whose formulas stay as they are
   */
  fixed: Readonly<Record<string, PersonaValue>>;
  /** The persona fields, for the evaluator's citizen (`applicantOf()`) */
  fields: readonly PersonaField[];
  /** The requested documents and the value sets, for the evaluator */
  context: RuleContext;
  /** The day of sharing, a day number */
  sharedOn: number;
}

/** A branch as the generation request carries it: its checked tree, and its rules by id */
export interface SubstitutedBranchInput {
  checked: CheckedBranch;
  rules: Readonly<Record<string, RuleItem>>;
}

/**
 * The branch's checked tree with every rule's formula substituted (`substituteRule()`): the same
 * items, ids and operators, so a group's formula is its members' substituted formulas combined as
 * before. Throws when `rules` lacks a rule
 * of the tree, as the generation does
 */
export function substituteBranch(
  { checked, rules }: SubstitutedBranchInput,
  substitution: Substitution
): CheckedBranch {
  const walk = (items: readonly CheckedItem[]): CheckedItem[] =>
    items.map((item): CheckedItem => {
      if (item.type === 'group') {
        return { ...item, items: walk(item.items) };
      }
      if (!Object.hasOwn(rules, item.id)) {
        throw new Error(`The request lacks the rule ${item.id}`);
      }
      return { ...item, formula: substituteRule(rules[item.id], item.formula, substitution) };
    });
  return { ...checked, items: walk(checked.items) };
}

/** Every branch substituted, in the order given */
export function substituteBranches(
  branches: readonly SubstitutedBranchInput[],
  substitution: Substitution
): CheckedBranch[] {
  return branches.map((branch) => substituteBranch(branch, substitution));
}

/**
 * One rule's formula over the free variables (the table above). `formula` is the rule's checked
 * formula: one literal, or `{ and: [held(K), c(date_K)] }` for a licence class K's date. The
 * formula isn't negated yet: negate the substituted one
 */
export function substituteRule(
  rule: RuleItem,
  formula: Formula,
  { fixed, fields, context, sharedOn }: Substitution
): Formula {
  const { target } = rule;
  if (target === null) {
    throw new Error('A checked rule has no target');
  }
  const isFixed = (key: string): boolean => Object.hasOwn(fixed, key);
  const applicantOfValues = (values: Record<string, PersonaValue>): Applicant =>
    applicantOf({ id: 'persona-1', name: '', values, generated: {}, status: 'ready' }, fields);
  const outcomeOf = (applicant: Applicant): boolean =>
    ruleOutcome(rule, applicant, sharedOn, context) === 'met';

  const dateKey = variableKey(target);
  if (target.licence_class === null) {
    return isFixed(dateKey) ? outcomeOf(applicantOfValues({ ...fixed })) : formula;
  }

  const classesTarget = { ...target, part: CLASSES_PART, licence_class: null };
  const classesKey = variableKey(classesTarget);
  const classesFixed = isFixed(classesKey);
  const dateFixed = isFixed(dateKey);
  if (classesFixed && dateFixed) {
    return outcomeOf(applicantOfValues({ ...fixed }));
  }
  if (!classesFixed && !dateFixed) {
    return formula;
  }
  const [held, date] = heldAndDateOf(formula);
  if (classesFixed) {
    // Whether the evaluator finds class K in the classes: the rule on "Licence classes includes
    // one of K", which is `held(K)`. An empty list is never met
    const heldRule: RuleItem = {
      ...rule,
      target: classesTarget,
      condition: { operator: 'includes_one_of', values: [target.licence_class] },
    };
    const holds = ruleOutcome(heldRule, applicantOfValues({ ...fixed }), sharedOn, context);
    return holds === 'met' ? date : false;
  }
  if (isEmptyValue(fixed[dateKey])) {
    return false;
  }
  // The date as the evaluator judges it once the class is held: the classes list is K alone
  const withClass = applicantOfValues({ ...fixed, [classesKey]: [target.licence_class] });
  return outcomeOf(withClass) ? held : false;
}

/** The two literals of a licence class's date formula `{ and: [held(K), c(date_K)] }` */
function heldAndDateOf(formula: Formula): [Formula, Formula] {
  if (typeof formula === 'boolean' || !('and' in formula) || formula.and.length !== 2) {
    throw new Error("A licence class's date formula is not held(K) and a condition");
  }
  return [formula.and[0], formula.and[1]];
}

/**
 * The classes' formulas over the free variables, in the order of `classes` (`branchClassesOf()` of
 * the unsubstituted branches): each class's first branch's substituted formula, taken from
 * `substituted`, which holds the same branches in the same order as the branches the classes came
 * from (`substituteBranches()`). Branches with the same formula before substitution have the same
 * one after it, so the first one stands for the class
 */
export function substitutedClassFormulas(
  classes: readonly BranchClass[],
  substituted: readonly CheckedBranch[]
): Formula[] {
  return classes.map((each) => {
    const branch = substituted.find((entry) => entry.branchKey === each.branchKeys[0]);
    if (branch === undefined) {
      throw new Error('A class names a branch that was not substituted');
    }
    return branchFormulaOf(branch);
  });
}

/**
 * The items' formulas over the free variables, by the key goal 4 counts the item under
 * (`ItemFormula.key`, `canonicalKeyOf()` of the unsubstituted item's formula): walks each
 * `original` branch with its `substituted` twin (same shape, `substituteBranches()`). Items with
 * one key have one substituted formula, whichever branch they come from, so the first stands for
 * them. Every item that counts is in it, also those that goal 4 doesn't target
 */
export function substitutedItemFormulas(
  original: readonly CheckedBranch[],
  substituted: readonly CheckedBranch[]
): Map<string, Formula> {
  const formulas = new Map<string, Formula>();
  const walk = (before: readonly CheckedItem[], after: readonly CheckedItem[]): void => {
    before.forEach((item, at) => {
      const twin = after[at];
      const key = canonicalKeyOf(itemFormulaOf(item));
      if (!formulas.has(key)) {
        formulas.set(key, itemFormulaOf(twin));
      }
      if (item.type === 'group' && twin.type === 'group') {
        walk(item.items, twin.items);
      }
    });
  };
  original.forEach((branch, at) => walk(branch.items, substituted[at].items));
  return formulas;
}
