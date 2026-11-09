// The goals of generation (specs/004-rule-test-personas, FR-011; research R6, R7 "Item targets";
// data-model.md, "Generation"): which branches no citizen can meet differently (the branch
// classes), which outcome vectors some citizen reaches today (the realizable vectors), what the
// three personas try to cover (the targets of goals 1 to 4), and how well a set of personas covers
// them (the score, compared goal by goal, never trading a goal for a later one).
//
// It asks spec 003's solver (`checks/solver.ts`), unchanged: one memo per run, with the variables
// of every branch merged, so that the questions of one run share their answers. Only 'sat' counts:
// 'unknown' (research 003-R7's text corner, or the deadline) never counts as realizable. Pure and
// deterministic given its inputs: no randomness, no side effects, no logging
import type { Combinator } from '@connection-portal/api-types/form-connections';

import { dayNumber } from '../checks/calendar';
import { isLiteral, negate } from '../checks/literals';
import { createSolverMemo, satisfiable, type SolverOptions } from '../checks/solver';
import type {
  CheckedBranch,
  CheckedItem,
  CheckOptions,
  DayRange,
  Formula,
  LiteralTest,
  Variable,
} from '../checks/types';
import { MAX_VECTORS } from './constants';
import type { BranchClass, OutcomeVector, Score, Target } from './types';

// Formulas

/** A level's formula: its items combined with its operator, as `levelFormula()` of findings.ts */
function levelFormula(operator: Combinator, formulas: Formula[]): Formula {
  return operator === 'and' ? { and: formulas } : { or: formulas };
}

/**
 * An item's formula: a rule's `CheckedRule.formula`, a group's items combined with its operator,
 * recursively
 */
export function itemFormulaOf(item: CheckedItem): Formula {
  return item.type === 'rule'
    ? item.formula
    : levelFormula(item.operator, item.items.map(itemFormulaOf));
}

/**
 * A branch's items as one formula (research R6): the top level combined with the branch's
 * operator, as `levelFormula()` does in `checks/findings.ts`. A branch without items is `true`
 */
export function branchFormulaOf(checked: CheckedBranch): Formula {
  return checked.items.length === 0
    ? true
    : levelFormula(checked.operator, checked.items.map(itemFormulaOf));
}

/**
 * A canonical serialisation of a formula: equal for formulas that differ only in the order of an
 * AND's or OR's children, in children kept twice, in an AND nested in an AND (an OR in an OR), in
 * `true` and `false` inside a level, in a level with one child, or in the order of an enum test's
 * values. Valid JSON. Formulas with the same key are met by the same citizens; the converse
 * needn't hold, which costs only targets that no citizen tells apart
 */
export function canonicalKeyOf(formula: Formula): string {
  const normal = normalOf(formula);
  return typeof normal === 'string' ? normal : levelKey(normal);
}

/** A level in normal form: its operator and its children's keys, sorted and without repeats */
interface NormalLevel {
  operator: Combinator;
  members: string[];
}

function normalOf(formula: Formula): NormalLevel | string {
  if (typeof formula === 'boolean') {
    return String(formula);
  }
  if (isLiteral(formula)) {
    return JSON.stringify([
      'literal',
      formula.variable,
      formula.negated,
      canonicalTest(formula.test),
    ]);
  }
  const operator: Combinator = 'and' in formula ? 'and' : 'or';
  const unit = String(operator === 'and');
  const absorbing = String(operator !== 'and');
  /** By key, each member in normal form, so that a level left with one member is that member */
  const members = new Map<string, NormalLevel | string>();
  for (const child of 'and' in formula ? formula.and : formula.or) {
    const normal = normalOf(child);
    if (typeof normal !== 'string') {
      if (normal.operator === operator) {
        normal.members.forEach((member) => members.set(member, member));
      } else {
        members.set(levelKey(normal), normal);
      }
    } else if (normal === absorbing) {
      return absorbing;
    } else if (normal !== unit) {
      members.set(normal, normal);
    }
  }
  if (members.size === 0) {
    return unit;
  }
  if (members.size === 1) {
    return [...members.values()][0];
  }
  return { operator, members: [...members.keys()].sort() };
}

function levelKey(level: NormalLevel): string {
  return `["${level.operator}",${level.members.join(',')}]`;
}

/** A literal's test as its kind, its operator, then its values; an enum's values sorted */
function canonicalTest(test: LiteralTest): unknown[] {
  switch (test.kind) {
    case 'number':
      return ['number', test.op, test.value];
    case 'text':
      return ['text', test.op, test.text, test.matchCase];
    case 'enum':
      return [
        'enum',
        test.op,
        [...test.values].sort((a, b) => {
          const left = JSON.stringify(a);
          const right = JSON.stringify(b);
          return left < right ? -1 : left > right ? 1 : 0;
        }),
      ];
    case 'date':
      return 'date' in test
        ? ['date', test.op, test.date]
        : ['date', test.op, test.count, test.unit];
  }
}

// Branch classes and variables

/**
 * The branch classes (research R6): branches with the same formula, by `canonicalKeyOf()`, form one
 * class, since no citizen can meet them differently. In tab order of each class's first branch,
 * and each class's branches in tab order. Its formula is its first branch's
 */
export function branchClassesOf(branches: readonly CheckedBranch[]): BranchClass[] {
  const classes: BranchClass[] = [];
  const byKey = new Map<string, BranchClass>();
  for (const branch of branches) {
    const formula = branchFormulaOf(branch);
    const key = canonicalKeyOf(formula);
    const known = byKey.get(key);
    if (known) {
      known.branchKeys.push(branch.branchKey);
    } else {
      const created: BranchClass = { key, formula, branchKeys: [branch.branchKey] };
      byKey.set(key, created);
      classes.push(created);
    }
  }
  return classes;
}

/**
 * Every branch's variables, merged by key (the first branch's definition of a key wins: every
 * branch reads the same catalog). One object per run: a solver memo serves only the variables it
 * was first asked with
 */
export function mergedVariablesOf(branches: readonly CheckedBranch[]): Record<string, Variable> {
  const merged: Record<string, Variable> = {};
  for (const branch of branches) {
    for (const [key, variable] of Object.entries(branch.variables)) {
      if (!(key in merged)) {
        merged[key] = variable;
      }
    }
  }
  return merged;
}

/** Today alone, as day numbers: the days the goals' questions ask about */
export function todayOnly(today: string): DayRange {
  const day = dayNumber(today);
  return { from: day, to: day };
}

/** Whether the run's deadline has passed */
function passed(options: CheckOptions): boolean {
  return options.now() >= options.deadline;
}

// Realizable vectors

/**
 * The most questions the vector search asks below prefixes the solver answered 'unknown', in all:
 * the whole search tree of three classes (2 + 4 + 8), so that the search stays exhaustive for
 * SC-002's rule sets of up to three branches. Below an 'unknown' prefix every question carries
 * the corner that made it 'unknown', and the solver can answer it only by trying every leaf: with
 * 20 branches that differ, such questions took 5 to 150 ms each, a thousand of them 17 s, and
 * none was 'sat'. This bound departs from research R6, which drops a prefix only on 'unsat'
 */
const MAX_QUESTIONS_BELOW_UNKNOWN = 14;

/**
 * The outcome vectors that some citizen reaches today (research R6): per class, in the order of
 * `classes`, meet (`true`) or fail (`false`), and `satisfiable()` answers 'sat' for the conjunction
 * of each class's formula or its negation. `classes` may carry substituted formulas (research R8);
 * only their formulas are read.
 *
 * A depth-first search, meet before fail, that adds B or `negate(B)` per class and drops a prefix
 * as soon as the solver answers 'unsat'. 'unknown' (the text corner, or the deadline) never counts
 * as realizable; a prefix answered 'unknown' is searched further only within
 * `MAX_QUESTIONS_BELOW_UNKNOWN` questions, counted across the search, and dropped beyond them.
 * `options` is the run's: its `variables` hold every variable of the formulas
 * (`mergedVariablesOf()`) and its `memo` is the run's one memo (`createSolverMemo()`).
 *
 * Exhaustive up to `MAX_VECTORS` realizable vectors, in the search's order. Once the search finds
 * one more, it stops, and each target of goals 1 to 3 that none of the vectors found covers is
 * asked directly (`B`, `¬B`, `B_a ∧ ¬B_b` and `¬B_a ∧ B_b`) and, when 'sat', completed into a
 * realizable vector class by class, meet before fail: so every target of goals 1 to 3 that the
 * solver can reach has a vector. Once the deadline passes, it returns the vectors found so far.
 * Without classes, the one empty vector
 */
export function realizableVectors(
  classes: readonly BranchClass[],
  today: string,
  options: SolverOptions
): OutcomeVector[] {
  const days = todayOnly(today);
  const formulas = classes.map((each) => each.formula);
  const negations = formulas.map(negate);
  const outcomeFormula = (index: number, meet: boolean): Formula =>
    meet ? formulas[index] : negations[index];
  const found: OutcomeVector[] = [];
  if (classes.length === 0) {
    return [[]];
  }
  const prefix: boolean[] = [];
  const conjuncts: Formula[] = [];
  /** True once the search has found more than MAX_VECTORS vectors */
  let overflow = false;
  /** Questions asked so far below a prefix answered 'unknown' */
  let belowUnknown = 0;
  const visit = (index: number, unknownAbove: boolean): boolean => {
    for (const meet of [true, false]) {
      if (passed(options)) {
        return false;
      }
      if (unknownAbove) {
        if (belowUnknown >= MAX_QUESTIONS_BELOW_UNKNOWN) {
          return true;
        }
        belowUnknown += 1;
      }
      prefix.push(meet);
      conjuncts.push(outcomeFormula(index, meet));
      const verdict = satisfiable({ and: [...conjuncts] }, days, options);
      let going = true;
      if (index === classes.length - 1) {
        if (verdict === 'sat') {
          found.push([...prefix]);
          if (found.length > MAX_VECTORS) {
            overflow = true;
            going = false;
          }
        }
      } else if (verdict === 'sat') {
        going = visit(index + 1, unknownAbove);
      } else if (verdict === 'unknown') {
        going = visit(index + 1, true);
      }
      prefix.pop();
      conjuncts.pop();
      if (!going) {
        return false;
      }
    }
    return true;
  };
  visit(0, false);
  if (!overflow) {
    return found;
  }
  return withVectorPerTarget(found, classes.length, outcomeFormula, days, options);
}

/** A partial outcome vector: class index and outcome */
type PartialVector = readonly (readonly [index: number, meet: boolean])[];

/**
 * `found`, plus for each target of goals 1 to 3 that none of the vectors covers a realizable
 * vector that covers it, when the solver finds one (`realizableVectors()`, beyond `MAX_VECTORS`)
 */
function withVectorPerTarget(
  found: OutcomeVector[],
  count: number,
  outcomeFormula: (index: number, meet: boolean) => Formula,
  days: DayRange,
  options: SolverOptions
): OutcomeVector[] {
  const vectors = [...found];
  const covered = (partial: PartialVector) =>
    vectors.some((vector) => partial.every(([index, meet]) => vector[index] === meet));
  const complete = (partial: PartialVector): OutcomeVector | null => {
    const fixed = new Map(partial);
    const conjuncts = partial.map(([index, meet]) => outcomeFormula(index, meet));
    if (passed(options) || satisfiable({ and: [...conjuncts] }, days, options) !== 'sat') {
      return null;
    }
    const vector: boolean[] = [];
    for (let index = 0; index < count; index += 1) {
      const given = fixed.get(index);
      if (given !== undefined) {
        vector.push(given);
        continue;
      }
      const chosen = [true, false].find((meet) => {
        if (passed(options)) {
          return false;
        }
        const tried = [...conjuncts, outcomeFormula(index, meet)];
        return satisfiable({ and: tried }, days, options) === 'sat';
      });
      if (chosen === undefined) {
        return null;
      }
      vector.push(chosen);
      conjuncts.push(outcomeFormula(index, chosen));
    }
    return vector;
  };
  const reach = (alternatives: PartialVector[]) => {
    if (alternatives.some(covered)) {
      return;
    }
    for (const partial of alternatives) {
      const vector = complete(partial);
      if (vector) {
        vectors.push(vector);
        return;
      }
    }
  };
  for (const meet of [true, false]) {
    for (let index = 0; index < count; index += 1) {
      reach([[[index, meet]]]);
    }
  }
  for (let a = 0; a < count; a += 1) {
    for (let b = a + 1; b < count; b += 1) {
      reach([
        [
          [a, true],
          [b, false],
        ],
        [
          [a, false],
          [b, true],
        ],
      ]);
    }
  }
  return vectors;
}

// Items

/** An item's formula that citizens can both meet and fail: a pair of goal-4 targets */
export interface ItemFormula {
  /** `canonicalKeyOf(formula)`: a rule several branches inherit is one item */
  key: string;
  formula: Formula;
}

/**
 * By item id (`rule-{n}`, `group-{n}`), the key of every item of a checked branch, recursively:
 * the key under which goal 4 counts the item's outcome (`PersonaOutcome.items`)
 */
export function itemKeysOf(checked: CheckedBranch): Record<string, string> {
  const keys: Record<string, string> = {};
  const walk = (items: readonly CheckedItem[]) => {
    for (const item of items) {
      keys[item.id] = canonicalKeyOf(itemFormulaOf(item));
      if (item.type === 'group') {
        walk(item.items);
      }
    }
  };
  walk(checked.items);
  return keys;
}

/**
 * The distinct formulas of the items that count in some branch (rules, groups and sub-groups, told
 * apart by `canonicalKeyOf()`), in tab order then display order, for which the solver answers
 * 'sat' today both for the formula and for its negation (research R7, "Item targets"). `options`
 * as for `realizableVectors()`. Once the deadline passes, the items not asked yet are left out
 */
export function itemFormulasOf(
  branches: readonly CheckedBranch[],
  today: string,
  options: SolverOptions
): ItemFormula[] {
  const days = todayOnly(today);
  const seen = new Set<string>();
  const items: ItemFormula[] = [];
  const walk = (level: readonly CheckedItem[]) => {
    for (const item of level) {
      const formula = itemFormulaOf(item);
      const key = canonicalKeyOf(formula);
      if (!seen.has(key)) {
        seen.add(key);
        if (
          !passed(options) &&
          satisfiable(formula, days, options) === 'sat' &&
          satisfiable(negate(formula), days, options) === 'sat'
        ) {
          items.push({ key, formula });
        }
      }
      if (item.type === 'group') {
        walk(item.items);
      }
    }
  };
  branches.forEach((branch) => walk(branch.items));
  return items;
}

// Targets

/**
 * What the three personas try to cover (FR-011), goal by goal, from the realizable vectors and the
 * item formulas:
 * 1. meet each class that some vector meets;
 * 2. fail each class that some vector fails;
 * 3. differ on each pair of classes (a < b) that some vector tells apart;
 * 4. meet and fail each item formula (`itemFormulasOf()`), meet before fail.
 */
export function targetsOf(
  classes: readonly BranchClass[],
  vectors: readonly OutcomeVector[],
  itemFormulas: readonly ItemFormula[]
): Target[] {
  const targets: Target[] = [];
  classes.forEach((_, classIndex) => {
    if (vectors.some((vector) => vector[classIndex])) {
      targets.push({ goal: 1, type: 'meet', classIndex });
    }
  });
  classes.forEach((_, classIndex) => {
    if (vectors.some((vector) => !vector[classIndex])) {
      targets.push({ goal: 2, type: 'fail', classIndex });
    }
  });
  for (let a = 0; a < classes.length; a += 1) {
    for (let b = a + 1; b < classes.length; b += 1) {
      if (vectors.some((vector) => vector[a] !== vector[b])) {
        targets.push({ goal: 3, type: 'differ', a, b });
      }
    }
  }
  for (const item of itemFormulas) {
    targets.push({ goal: 4, type: 'meet', item: item.key, formula: item.formula });
    targets.push({ goal: 4, type: 'fail', item: item.key, formula: negate(item.formula) });
  }
  return targets;
}

/** A target's identity, for sets of targets: `1:meet:0`, `3:differ:0:2`, `4:fail:<item key>` */
export function targetKeyOf(target: Target): string {
  switch (target.goal) {
    case 1:
    case 2:
      return `${target.goal}:${target.type}:${target.classIndex}`;
    case 3:
      return `3:differ:${target.a}:${target.b}`;
    case 4:
      return `4:${target.type}:${target.item}`;
  }
}

// The score

/** What one persona covers: its outcome vector and its outcomes for the items */
export interface PersonaOutcome {
  /** Per class, in the order of the classes: meet or fail */
  vector: OutcomeVector;
  /**
   * By item key (`ItemFormula.key`, `itemKeysOf()`): met (`true`) or failed (`false`). A missing
   * key covers neither of the item's targets: while planning, the item targets not assigned
   */
  items: Readonly<Record<string, boolean>>;
}

/** Whether one persona covers a target */
export function covers(target: Target, outcome: PersonaOutcome): boolean {
  switch (target.goal) {
    case 1:
      return outcome.vector[target.classIndex] === true;
    case 2:
      return outcome.vector[target.classIndex] === false;
    case 3:
      return outcome.vector[target.a] !== outcome.vector[target.b];
    case 4:
      return outcome.items[target.item] === (target.type === 'meet');
  }
}

/** Covered targets per goal: a target counts when some persona of `outcomes` covers it */
export function scoreOf(targets: readonly Target[], outcomes: readonly PersonaOutcome[]): Score {
  const score: [number, number, number, number] = [0, 0, 0, 0];
  for (const target of targets) {
    if (outcomes.some((outcome) => covers(target, outcome))) {
      score[target.goal - 1] += 1;
    }
  }
  return score;
}

/**
 * Compares two scores goal by goal, in the order of FR-011, never trading a goal for a later one:
 * positive when `a` is better, negative when `b` is, zero when they are equal. Sorting with
 * `(a, b) => compareScores(b, a)` puts the best first
 */
export function compareScores(a: Score, b: Score): number {
  for (let goal = 0; goal < a.length; goal += 1) {
    if (a[goal] !== b[goal]) {
      return a[goal] - b[goal];
    }
  }
  return 0;
}

/**
 * The outcome vector of a persona whose results are known (kept slots, and the evaluator's final
 * check): per class, whether it meets the class's first branch. `metByBranch` by branch key
 */
export function vectorOf(
  classes: readonly BranchClass[],
  metByBranch: Readonly<Record<string, boolean>>
): OutcomeVector {
  return classes.map((each) => metByBranch[each.branchKeys[0]] === true);
}

// One run

/** What one run of generation plans with (`goalsOf()`) */
export interface Goals {
  /** The branch classes, in tab order */
  classes: BranchClass[];
  /** The realizable vectors (`realizableVectors()`) */
  vectors: OutcomeVector[];
  /** The item formulas of goal 4 (`itemFormulasOf()`) */
  items: ItemFormula[];
  /** Goals 1 to 4's targets (`targetsOf()`) */
  targets: Target[];
  /** Today alone, for further questions such as `satisfiable(C_p ∧ t)` */
  days: DayRange;
  /**
   * The run's solver options: the deadline and clock given, every branch's variables merged and
   * the run's one memo. Further questions of the run pass them to `satisfiable()`
   */
  solver: SolverOptions;
}

/**
 * Everything a run plans with, computed once (research R6, R7): the classes, the realizable
 * vectors, the item formulas and the targets, all asked with one solver memo over every branch's
 * variables, for `today` (`YYYY-MM-DD`). Respects `options.deadline` as `realizableVectors()` and
 * `itemFormulasOf()` do
 */
export function goalsOf(
  branches: readonly CheckedBranch[],
  today: string,
  options: CheckOptions
): Goals {
  const solver: SolverOptions = {
    deadline: options.deadline,
    now: options.now,
    variables: mergedVariablesOf(branches),
    memo: createSolverMemo(),
  };
  const classes = branchClassesOf(branches);
  const vectors = realizableVectors(classes, today, solver);
  const items = itemFormulasOf(branches, today, solver);
  return {
    classes,
    vectors,
    items,
    targets: targetsOf(classes, vectors, items),
    days: todayOnly(today),
    solver,
  };
}
