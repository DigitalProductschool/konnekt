// Generation (specs/004-rule-test-personas, research R6–R8; contracts/personas.md
// "generatePersonas"; data-model.md "Generation"; FR-010 to FR-013): `generatePersonas()` gives the
// free slots of a run new values, so that the three personas together reach FR-011's goals as far
// as they can, compared goal by goal, and keeps the kept slots as they are.
//
// The steps:
// 1. Names for the slots without one, drawn before anything else (`drawNames()`), different from
//    each other and from the names the request carries.
// 2. The fallback set: plausible random values for every free slot, without planning
//    (`sampleValues()` with an empty model). It is what the run returns when the deadline passes
//    before anything better is found.
// 3. The goals (`goalsOf()`): the branch classes, the realizable vectors, the item formulas and the
//    targets, with one solver memo for the run.
// 4. The vectors: the planned slots' outcome vectors that maximise goals 1 to 3, given the outcomes
//    of the slots that stay (from the evaluator). Every combination when there are at most
//    `MAX_COMBINATIONS`, the ties drawn at random (which also shuffles the personas' order);
//    greedily otherwise, the slots in random order, ties at random.
// 5. A first plan from the vectors alone, then restarts that also assign goal 4's targets: the item
//    targets that no slot covers yet, in random order, each to the first slot, in random order,
//    whose constraint C_p it can join ('sat'), unless a part of some slot's C_p (its vector, or
//    one target assigned to it) already implies it. The parts' answers are kept for the run
//    (`assignTargets()`). Restarts go on until the best set reaches every target it can,
//    `MAX_RESTARTS_WITHOUT_GAIN` restarts in a row bring nothing, or the deadline passes.
// 6. Each plan's models (`modelOf()`, by random self-reduction, plausible first) and values
//    (`sampleValues()`), then the evaluator's verdict on the whole set (`applicantOf()`,
//    `evaluateBranch()`), so that the score counts exactly what the test step will show.
//
// Each planned slot plans on its own formulas (`SlotFormulas`): the classes' formulas and their
// negations, the items' formulas and the vectors it can reach. They are the same for every free
// slot. A filled slot plans on the formulas with its fixed values substituted (`filledFormulasOf()`,
// `substitute.ts`, research R8): its values for the fields it has, hidden ones included, are
// decided, so the formulas speak only of the absent fields, and its vectors and item targets are
// those it can still reach. Its new values cover only the absent fields. A filled slot with no
// absent field, like a kept one, stays as it is.
//
// Bounded (FR-013): every solver question gets the deadline and the clock, a restart doesn't start
// once the deadline has passed, and a plan whose questions the deadline cut is dropped, so the run
// returns no later than the deadline plus one solver step, with at least the fallback set. Pure:
// every random choice comes from the request's seed, and nothing is logged or kept. The module
// reaches `checks/text.ts`, so it runs in the worker only (tasks.md, "Bundle")
import type { GroupItem, RuleItem, RuleTreeItem } from '@konnekt/api-types/form-connections';

import { dayNumber } from '../checks/calendar';
import { allOf, negate, simplify } from '../checks/literals';
import { satisfiable } from '../checks/solver';
import type { CheckedBranch, CheckedItem, CheckOptions, Formula, Literal } from '../checks/types';
import { evaluateBranch, type EvaluatedBranch, type EvaluatedItem } from '../evaluation';
import { applicantOf } from './applicant';
import { MAX_COMBINATIONS, MAX_RESTARTS_WITHOUT_GAIN, PERSONA_IDS } from './constants';
import {
  compareScores,
  covers,
  type Goals,
  goalsOf,
  itemKeysOf,
  mergedVariablesOf,
  type PersonaOutcome,
  realizableVectors,
  scoreOf,
  vectorOf,
} from './goals';
import { modelOf, plausibilityLiteralsOf } from './models';
import { createRandom, type Random } from './random';
import { drawNames } from './samples';
import { sampleValues } from './sampling';
import {
  substituteBranches,
  substitutedClassFormulas,
  substitutedItemFormulas,
} from './substitute';
import type {
  GenerationRequest,
  GenerationResult,
  Model,
  OutcomeVector,
  PersonaValue,
  Score,
  SlotPlan,
  Target,
} from './types';

/** A target of goal 4: meet or fail an item */
type ItemTarget = Extract<Target, { goal: 4 }>;

/** A slot of the run: its plan, and whether its name was drawn by this run */
interface Slot {
  plan: SlotPlan;
  /** The request gave no name: the answer carries the one drawn (free slots) */
  drawn: boolean;
}

/** One persona's values for each slot, in persona order: fixed ones included */
type ValueSet = Record<string, PersonaValue>[];

/** A set of personas with its score, once evaluated */
interface Candidate {
  values: ValueSet;
  score: Score;
}

/** A goal-4 target's formula for one slot, and the formula of its opposite target */
interface ItemFormulas {
  meet: Formula;
  fail: Formula;
}

/**
 * What a planned slot plans on (research R8): the same for every free slot, and for a filled slot
 * the formulas with its fixed values substituted (T050)
 */
interface SlotFormulas {
  /** Per class, in the order of `Goals.classes`: the formula a persona meets to meet the class */
  meet: Formula[];
  /** Per class: the formula a persona meets to fail the class */
  fail: Formula[];
  /** By item key (`ItemFormula.key`): the formulas to meet and to fail the item */
  items: ReadonlyMap<string, ItemFormulas>;
  /** The outcome vectors the slot can reach today */
  vectors: readonly OutcomeVector[];
}

/** A slot that the run plans, with its place among the slots */
interface PlannedSlot {
  index: number;
  formulas: SlotFormulas;
}

/** Each planned slot's vector, in the order of the planned slots; `[]` asks for nothing */
type VectorChoice = OutcomeVector[];

/** How the run chooses the planned slots' vectors (research R6) */
interface VectorChooser {
  /** A choice for one plan: one of the best combinations, or a greedy one */
  next: () => VectorChoice;
  /**
   * The most that goals 1 to 3 can reach: the best combination's score when every combination was
   * tried, the number of targets otherwise
   */
  bound: readonly [number, number, number];
}

/** What every step of one run reads */
interface Run {
  request: GenerationRequest;
  options: CheckOptions;
  random: Random;
  slots: Slot[];
  /** The day of sharing, today, as a day number */
  sharedOn: number;
  /** Every branch as the evaluator reads it, with its key and its items' keys (`itemKeysOf()`) */
  branches: EvaluatedBranchOf[];
}

/** One branch of the request as the evaluator reads it */
interface EvaluatedBranchOf {
  branchKey: string;
  branch: EvaluatedBranch;
  /** By item id, the item's key for goal 4 */
  itemKeys: Record<string, string>;
}

/**
 * New values for the request's free slots (contracts/personas.md, "generatePersonas"), in persona
 * order: for a free slot a value for every field of `request.fields` and, when the request gives
 * it no name, the name drawn; for a filled slot the values of the fields it lacks; for a kept slot
 * `{ values: {}, name: null }`. The personas with the best score found by `options.deadline`,
 * compared goal by goal (FR-011), and at least the fallback set of plausible values (FR-013).
 *
 * Equal requests with equal seeds give equal results as long as the clock doesn't reach the
 * deadline. `options.now` is the clock of `options.deadline` (`performance.timeOrigin +
 * performance.now()` in the worker); the tests inject their own
 */
export function generatePersonas(
  request: GenerationRequest,
  options: CheckOptions
): GenerationResult {
  const random = createRandom(request.seed);
  const slots = slotsOf(request, random);
  const checked = request.branches.map((branch) => branch.checked);
  const variables = mergedVariablesOf(checked);
  const fallback: ValueSet = slots.map((slot) =>
    slot.plan.kind === 'kept'
      ? { ...slot.plan.values }
      : valuesOf(slot, {}, variables, request, random)
  );
  const run: Run = {
    request,
    options,
    random,
    slots,
    sharedOn: dayNumber(request.today),
    branches: request.branches.map(({ checked: tree, rules }) => ({
      branchKey: tree.branchKey,
      branch: evaluatedBranchOf(tree, rules),
      itemKeys: itemKeysOf(tree),
    })),
  };
  const values =
    slots.some((slot) => isPlanned(slot, request)) && !passed(options)
      ? planned(run, fallback)
      : fallback;
  return { slots: slots.map((slot, index) => answerOf(slot, values[index])) };
}

// Slots

/** The request's slots as the run plans them, with a name drawn for each slot without one */
function slotsOf(request: GenerationRequest, random: Random): Slot[] {
  const taken = request.slots.flatMap((slot) => (slot.name === null ? [] : [slot.name]));
  const nameless = request.slots.filter((slot) => slot.name === null).length;
  const names = drawNames(random, nameless, taken);
  return request.slots.map((slot) => {
    const drawn = slot.name === null;
    const name = slot.name ?? (names.shift() as string);
    // A free slot's old values are replaced, so none of them is fixed
    const values = slot.kind === 'free' ? {} : { ...slot.values };
    return { plan: { kind: slot.kind, values, name }, drawn };
  });
}

/**
 * Whether the run plans the slot: a free one, and a filled one that lacks a value for some field
 * of the request. A kept slot, and a filled one with nothing to fill, stay as they are
 */
function isPlanned(slot: Slot, request: GenerationRequest): boolean {
  switch (slot.plan.kind) {
    case 'free':
      return true;
    case 'filled': {
      const { values } = slot.plan;
      return request.fields.some((field) => !Object.hasOwn(values, field.key));
    }
    case 'kept':
      return false;
  }
}

/** A slot's part of the answer (contracts/personas.md, "Worker protocol") */
function answerOf(slot: Slot, values: Record<string, PersonaValue>): GenerationResult['slots'][0] {
  switch (slot.plan.kind) {
    case 'kept':
      return { values: {}, name: null };
    case 'filled': {
      const added: Record<string, PersonaValue> = {};
      for (const [key, value] of Object.entries(values)) {
        if (!Object.hasOwn(slot.plan.values, key)) {
          added[key] = value;
        }
      }
      return { values: added, name: null };
    }
    case 'free':
      return { values, name: slot.drawn ? slot.plan.name : null };
  }
}

/**
 * A slot's values from a model: every field of the request, the slot's fixed values unchanged
 * (`sampleValues()`), and its hidden fixed values kept beside them
 */
function valuesOf(
  slot: Slot,
  model: Model,
  variables: GoalsVariables,
  request: GenerationRequest,
  random: Random
): Record<string, PersonaValue> {
  const sampled = sampleValues({
    fields: request.fields,
    variables,
    optionSets: request.context.optionSets,
    model,
    name: slot.plan.name,
    today: request.today,
    random,
    fixed: slot.plan.values,
  });
  return { ...slot.plan.values, ...sampled };
}

/** The run's merged variables (`mergedVariablesOf()`) */
type GoalsVariables = Goals['solver']['variables'];

// Planning

/** Steps 3 to 6: the best set found by the deadline, the fallback set when nothing beats it */
function planned(run: Run, fallback: ValueSet): ValueSet {
  const { request, options, random, slots } = run;
  const goals = goalsOf(
    request.branches.map((branch) => branch.checked),
    request.today,
    options
  );
  if (passed(options)) {
    return fallback;
  }
  const free = freeFormulasOf(goals);
  const plannedSlots: PlannedSlot[] = slots.flatMap((slot, index) =>
    isPlanned(slot, request)
      ? [
          {
            index,
            formulas: slot.plan.kind === 'filled' ? filledFormulasOf(run, goals, slot, free) : free,
          },
        ]
      : []
  );
  if (passed(options)) {
    return fallback;
  }
  const staying = slots.flatMap((slot, index) =>
    isPlanned(slot, request) ? [] : [outcomeOf(fallback[index], run, goals)]
  );
  const vectorTargets = goals.targets.filter((target) => target.goal !== 4);
  const itemTargets = goals.targets.filter((target): target is ItemTarget => target.goal === 4);
  const chooser = vectorChooserOf(plannedSlots, staying, vectorTargets, random);
  const stays = (target: ItemTarget) => staying.some((outcome) => covers(target, outcome));
  // A planned slot whose fixed values decide an item (its substituted formula is a constant) covers
  // the item's target for sure when the constant is `true`, and can't when it is `false`
  const outcomeOfTarget = (formulas: SlotFormulas, target: ItemTarget): Formula | undefined =>
    formulas.items.get(target.item)?.[target.type === 'meet' ? 'meet' : 'fail'];
  const decided = (target: ItemTarget) =>
    plannedSlots.some(({ formulas }) => outcomeOfTarget(formulas, target) === true);
  const coverable = (target: ItemTarget) =>
    stays(target) ||
    plannedSlots.some(({ formulas }) => outcomeOfTarget(formulas, target) !== false);
  const bound: Score = [...chooser.bound, itemTargets.filter(coverable).length];
  const plausible = plausibilityLiteralsOf(request.fields, goals.solver.variables, request.today);
  const open = itemTargets.filter((target) => !stays(target) && !decided(target));

  const parts: PartAnswers = new Map();
  const scoreOfSet = (values: ValueSet): Score =>
    scoreOf(
      goals.targets,
      values.map((each) => outcomeOf(each, run, goals))
    );
  let best: Candidate = { values: fallback, score: scoreOfSet(fallback) };
  /** Keeps `values` when they score better than the best set so far, and says whether it did */
  const consider = (values: ValueSet): boolean => {
    const score = scoreOfSet(values);
    if (compareScores(score, best.score) <= 0) {
      return false;
    }
    best = { values, score };
    return true;
  };
  const plan = (withItems: boolean): ValueSet | null =>
    planOnce(run, goals, fallback, plannedSlots, chooser.next(), {
      open: withItems ? open : [],
      parts,
      plausible,
    });

  // The first plan: the vectors alone, so that goals 1 to 3 come early even when goal 4 is costly
  const first = plan(false);
  if (first === null) {
    return best.values;
  }
  consider(first);
  let withoutGain = 0;
  while (
    !reached(best.score, bound) &&
    withoutGain < MAX_RESTARTS_WITHOUT_GAIN &&
    !passed(options)
  ) {
    const values = plan(true);
    if (values === null) {
      break;
    }
    withoutGain = consider(values) ? 0 : withoutGain + 1;
  }
  return best.values;
}

/**
 * A free slot's formulas: the classes' formulas and their negations, the items' formulas and their
 * negations, and the realizable vectors (research R6, R7)
 */
function freeFormulasOf(goals: Goals): SlotFormulas {
  const meet = goals.classes.map((each) => each.formula);
  return {
    meet,
    fail: meet.map(negate),
    items: new Map(
      goals.items.map((item) => [item.key, { meet: item.formula, fail: negate(item.formula) }])
    ),
    vectors: goals.vectors,
  };
}

/**
 * A filled slot's formulas (research R8): the branches with the slot's fixed values substituted
 * (`substituteBranches()`), each class's formula and each item's, simplified so that what its fixed
 * values decide is a constant, and the vectors realizable over what is left. Negation comes after
 * substitution. A slot without fixed values plans on the `free` formulas. The solver reads the
 * original branches' variables (`goals.solver`): substitution only changes formulas
 */
function filledFormulasOf(run: Run, goals: Goals, slot: Slot, free: SlotFormulas): SlotFormulas {
  const { request, sharedOn } = run;
  if (Object.keys(slot.plan.values).length === 0) {
    return free;
  }
  const substituted = substituteBranches(request.branches, {
    fixed: slot.plan.values,
    fields: request.fields,
    context: request.context,
    sharedOn,
  });
  const meet = substitutedClassFormulas(goals.classes, substituted).map(simplify);
  const byKey = substitutedItemFormulas(
    request.branches.map((branch) => branch.checked),
    substituted
  );
  const items = new Map<string, ItemFormulas>(
    goals.items.map((item) => {
      const formula = simplify(byKey.get(item.key) ?? item.formula);
      return [item.key, { meet: formula, fail: negate(formula) }];
    })
  );
  const vectors = realizableVectors(
    goals.classes.map((each, index) => ({ ...each, formula: meet[index] })),
    request.today,
    goals.solver
  );
  return { meet, fail: meet.map(negate), items, vectors };
}

/** Whether a score reaches the bound on every goal: no restart can do better */
function reached(score: Score, bound: Score): boolean {
  return score.every((covered, goal) => covered >= bound[goal]);
}

/** What one plan reads besides its vectors */
interface PlanInput {
  /** The goal-4 targets to assign; none for a plan from the vectors alone */
  open: readonly ItemTarget[];
  /** The run's answers for the parts of the slots' constraints (`assignTargets()`) */
  parts: PartAnswers;
  plausible: readonly Literal[];
}

/**
 * One plan (steps 5 and 6): each planned slot's constraint C_p from its vector and, when `open`
 * isn't empty, the goal-4 targets assigned to it; then its model and its values. `null` when the
 * deadline cut the plan's questions, which makes their answers worthless
 */
function planOnce(
  run: Run,
  goals: Goals,
  fallback: ValueSet,
  plannedSlots: readonly PlannedSlot[],
  vectors: VectorChoice,
  { open, parts, plausible }: PlanInput
): ValueSet | null {
  const { options, random, request, slots } = run;
  const constraints = plannedSlots.map(({ formulas }, at) =>
    vectors[at].map((meet, classIndex) =>
      meet ? formulas.meet[classIndex] : formulas.fail[classIndex]
    )
  );
  const base = constraints.map((conjuncts) => [...conjuncts]);
  if (open.length > 0) {
    assignTargets(goals, plannedSlots, constraints, { open, vectors, parts, random });
  }
  const modelOptions = { ...goals.solver, today: request.today, random, plausible };
  const models = constraints.map(
    (conjuncts, at) =>
      modelOf(allOf(conjuncts), modelOptions) ??
      (conjuncts.length > base[at].length ? modelOf(allOf(base[at]), modelOptions) : null) ??
      {}
  );
  if (passed(options)) {
    return null;
  }
  const values = [...fallback];
  plannedSlots.forEach(({ index }, at) => {
    values[index] = valuesOf(slots[index], models[at], goals.solver.variables, request, random);
  });
  return values;
}

/**
 * The parts of the planned slots' constraints that the run has met (`assignTargets()`): a slot's
 * vector (its classes' conjuncts) or a goal-4 target's formula, with whether pairs of them are
 * 'unsat' together. Kept for the run, since its plans meet the same pairs again and again. By the
 * slot's formulas (the free slots share theirs)
 */
type PartAnswers = Map<SlotFormulas, SlotParts>;

/** The parts met for one slot's formulas */
interface SlotParts {
  /** By vector, `m` or `f` per class */
  vectors: Map<string, Part>;
  /** By item key (`ItemFormula.key`), then meet or fail */
  items: Map<string, Partial<Record<ItemTarget['type'], Part>>>;
  /** The parts made so far, which numbers the next one */
  count: number;
}

/** A part of a slot's constraint C_p */
interface Part {
  /** Its number among the parts of its slot's formulas */
  id: number;
  formula: Formula;
  /** The variables its literals name (`variablesOf()`) */
  variables: readonly string[];
  /** By the number of a part after it: whether the two are 'unsat' together */
  exclusive: Map<number, boolean>;
}

/** What goal 4's assignment reads besides the slots and their constraints */
interface AssignmentInput {
  open: readonly ItemTarget[];
  /** Each planned slot's vector, of which `constraints` holds the conjuncts */
  vectors: VectorChoice;
  parts: PartAnswers;
  random: Random;
}

/**
 * Goal 4's assignment (research R7): each open target, in random order, joins the constraint of the
 * first planned slot, in random order, with which it is 'sat' today (`constraints`, each slot's
 * C_p: its vector's conjuncts, then the targets assigned), unless some slot already implies it:
 * the slot's vector does (the opposite is 'unsat' with the vector's conjuncts), or one target
 * assigned to the slot does (the opposite is 'unsat' with it: a group and one of its members, say).
 * Stops at the deadline.
 *
 * The implication is checked on these parts of C_p, not on C_p itself, whose questions are new in
 * every plan: with three 50-item branches, those were 7 000 of a run's 12 000 questions, while
 * the parts' pairs are asked once per run (`PartAnswers`) and found about 95 % of what C_p
 * implied (the oracle catalogue's goal-4 coverage stayed at 98.3 %). A target that several
 * assigned targets imply only together joins a slot needlessly, which costs that slot some
 * freedom. Research R7 asks only for the first slot that the target can join; this check, and
 * its parts, are generation's own. The question that assigns a target is asked of C_p, unless
 * a part already makes it 'unsat': a conjunction with an 'unsat' part is 'unsat'
 */
function assignTargets(
  goals: Goals,
  plannedSlots: readonly PlannedSlot[],
  constraints: Formula[][],
  { open, vectors, parts, random }: AssignmentInput
): void {
  const ask = (conjuncts: readonly Formula[]) =>
    satisfiable({ and: [...conjuncts] }, goals.days, goals.solver);
  const slotPartsOf = (at: number): SlotParts => {
    const { formulas } = plannedSlots[at];
    let known = parts.get(formulas);
    if (known === undefined) {
      known = { vectors: new Map(), items: new Map(), count: 0 };
      parts.set(formulas, known);
    }
    return known;
  };
  const newPart = (known: SlotParts, formula: Formula): Part => {
    known.count += 1;
    return { id: known.count, formula, variables: variablesOf(formula), exclusive: new Map() };
  };
  /** Whether two parts are 'unsat' together, asked once per run */
  const exclusive = (one: Part, other: Part): boolean => {
    if (one.formula === false || other.formula === false) {
      // A constant `false` (an item the slot's fixed values decide) excludes everything
      return true;
    }
    const [first, second] = one.id < other.id ? [one, other] : [other, one];
    let known = first.exclusive.get(second.id);
    if (known === undefined) {
      // Parts on different variables are met independently, and each is 'sat'
      known =
        sharesVariable(first.variables, second.variables) &&
        ask([first.formula, second.formula]) === 'unsat';
      // An answer the deadline cut short is 'unknown': not kept, as the solver's memo does
      if (known || !passed(goals.solver)) {
        first.exclusive.set(second.id, known);
      }
    }
    return known;
  };
  /** Per planned slot: its vector, then the targets assigned to it */
  const slotParts = constraints.map((conjuncts, at) => {
    const known = slotPartsOf(at);
    const key = vectors[at].map((meet) => (meet ? 'm' : 'f')).join('');
    let part = known.vectors.get(key);
    if (part === undefined) {
      part = newPart(known, allOf(conjuncts));
      known.vectors.set(key, part);
    }
    return [part];
  });
  /** The target's part for the slot, met as `type` asks; `null` for an item the slot lacks */
  const partFor = (at: number, target: ItemTarget, type: ItemTarget['type']): Part | null => {
    const known = slotPartsOf(at);
    let byType = known.items.get(target.item);
    if (byType === undefined) {
      byType = {};
      known.items.set(target.item, byType);
    }
    let part = byType[type];
    if (part === undefined) {
      const item = plannedSlots[at].formulas.items.get(target.item);
      if (item === undefined) {
        return null;
      }
      part = newPart(known, type === 'meet' ? item.meet : item.fail);
      byType[type] = part;
    }
    return part;
  };
  const excluded = (at: number, part: Part): boolean =>
    slotParts[at].some((each) => exclusive(each, part));
  for (const target of random.shuffle(open)) {
    if (passed(goals.solver)) {
      return;
    }
    const order = random.shuffle(plannedSlots.map((_, at) => at));
    const opposite = target.type === 'meet' ? 'fail' : 'meet';
    const implied = order.some((at) => {
      const part = partFor(at, target, opposite);
      return part !== null && excluded(at, part);
    });
    if (implied) {
      continue;
    }
    for (const at of order) {
      const part = partFor(at, target, target.type);
      if (
        part !== null &&
        !excluded(at, part) &&
        ask([...constraints[at], part.formula]) === 'sat'
      ) {
        constraints[at].push(part.formula);
        slotParts[at].push(part);
        break;
      }
    }
  }
}

/** The variables a formula's literals name, sorted */
const variablesByFormula = new WeakMap<object, readonly string[]>();

function variablesOf(formula: Formula): readonly string[] {
  if (typeof formula === 'boolean') {
    return [];
  }
  const known = variablesByFormula.get(formula);
  if (known) {
    return known;
  }
  const found = new Set<string>();
  const walk = (each: Formula) => {
    if (typeof each === 'boolean') {
      return;
    }
    if ('variable' in each) {
      found.add(each.variable);
    } else {
      ('and' in each ? each.and : each.or).forEach(walk);
    }
  };
  walk(formula);
  const sorted = [...found].sort();
  variablesByFormula.set(formula, sorted);
  return sorted;
}

/** Whether two sorted lists of variables have one in common */
function sharesVariable(first: readonly string[], second: readonly string[]): boolean {
  let a = 0;
  let b = 0;
  while (a < first.length && b < second.length) {
    if (first[a] === second[b]) {
      return true;
    }
    if (first[a] < second[b]) {
      a += 1;
    } else {
      b += 1;
    }
  }
  return false;
}

// Vectors

/**
 * The chooser of the planned slots' vectors (research R6): when the combinations of the slots'
 * vectors number at most `MAX_COMBINATIONS`, every one is scored on goals 1 to 3 with the outcomes
 * of the slots that stay, and each plan draws one of the best at random. Otherwise each plan
 * chooses greedily, the slots in random order, each taking a vector that scores best with those
 * chosen before it, ties at random. A slot without vectors (the deadline cut the search, or the
 * text corner) asks for none: `[]`
 */
function vectorChooserOf(
  plannedSlots: readonly PlannedSlot[],
  staying: readonly PersonaOutcome[],
  targets: readonly Target[],
  random: Random
): VectorChooser {
  const options = plannedSlots.map(({ formulas }) =>
    formulas.vectors.length > 0 ? formulas.vectors : [[]]
  );
  const scoreWith = (chosen: readonly OutcomeVector[]): Score =>
    scoreOf(targets, [...staying, ...chosen.map((vector) => ({ vector, items: {} }))]);
  const combinations = options.reduce((count, vectors) => count * vectors.length, 1);
  if (combinations <= MAX_COMBINATIONS) {
    const best = bestOf(combinationsOf(options), scoreWith);
    const score = scoreWith(best[0]);
    return { next: () => random.pick(best), bound: [score[0], score[1], score[2]] };
  }
  const counts: [number, number, number] = [0, 0, 0];
  for (const target of targets) {
    if (target.goal !== 4) {
      counts[target.goal - 1] += 1;
    }
  }
  const greedy = (): VectorChoice => {
    const chosen: (OutcomeVector | undefined)[] = options.map(() => undefined);
    for (const at of random.shuffle(options.map((_, index) => index))) {
      const before = chosen.filter((vector): vector is OutcomeVector => vector !== undefined);
      chosen[at] = random.pick(bestOf(options[at], (vector) => scoreWith([...before, vector])));
    }
    return chosen as OutcomeVector[];
  };
  return { next: greedy, bound: counts };
}

/** Every combination of one vector per slot, in order */
function combinationsOf(options: readonly (readonly OutcomeVector[])[]): VectorChoice[] {
  return options.reduce<VectorChoice[]>(
    (combinations, vectors) =>
      combinations.flatMap((combination) => vectors.map((vector) => [...combination, vector])),
    [[]]
  );
}

/** The items with the best score, in their order; `items` isn't empty */
function bestOf<T>(items: readonly T[], scoreOfItem: (item: T) => Score): T[] {
  let best: T[] = [];
  let bestScore: Score | null = null;
  for (const item of items) {
    const score = scoreOfItem(item);
    const compared = bestScore === null ? 1 : compareScores(score, bestScore);
    if (compared > 0) {
      best = [item];
      bestScore = score;
    } else if (compared === 0) {
      best.push(item);
    }
  }
  return best;
}

// The evaluator's verdict

/**
 * What one persona with these values covers, as the evaluator decides it (research R7, "The final
 * check"; R8, kept slots): its vector by the classes' first branches, and each item's outcome by
 * its key, met or not (`not_checked` counts as not met, FR-014)
 */
function outcomeOf(values: Record<string, PersonaValue>, run: Run, goals: Goals): PersonaOutcome {
  const { request, sharedOn } = run;
  const applicant = applicantOf(
    { id: PERSONA_IDS[0], name: '', values, generated: values, status: 'ready' },
    request.fields
  );
  const met: Record<string, boolean> = {};
  const items: Record<string, boolean> = {};
  for (const { branchKey, branch, itemKeys } of run.branches) {
    const evaluation = evaluateBranch(branch, applicant, sharedOn, request.context);
    met[branchKey] = evaluation.met;
    collectItems(evaluation.items, itemKeys, items);
  }
  return { vector: vectorOf(goals.classes, met), items };
}

/** Each evaluated item's outcome by its key, recursively */
function collectItems(
  evaluated: readonly EvaluatedItem[],
  itemKeys: Readonly<Record<string, string>>,
  items: Record<string, boolean>
): void {
  for (const { item, outcome, members } of evaluated) {
    const key = itemKeys[item.id];
    if (key !== undefined) {
      items[key] = outcome === 'met';
    }
    collectItems(members, itemKeys, items);
  }
}

/**
 * A checked branch as the evaluator reads it: the items that count, already taken by
 * `buildCheckedBranch()` as `effective_items()` takes them, each rule as the request carries it and
 * each group with its checked members. Read as a based branch whose groups are its own, so that
 * nothing more is dissolved or left out and the rules' marks are allowed. Throws when the request
 * lacks a rule of the tree
 */
function evaluatedBranchOf(
  checked: CheckedBranch,
  rules: Readonly<Record<string, RuleItem>>
): EvaluatedBranch {
  return { origin: 'based', operator: checked.operator, items: treeOf(checked.items, rules) };
}

function treeOf(
  items: readonly CheckedItem[],
  rules: Readonly<Record<string, RuleItem>>
): RuleTreeItem[] {
  return items.map((item): RuleTreeItem => {
    if (item.type === 'rule') {
      if (!Object.hasOwn(rules, item.id)) {
        throw new Error(`The request lacks the rule ${item.id}`);
      }
      return rules[item.id];
    }
    const group: GroupItem = {
      type: 'group',
      id: item.id,
      name: '',
      mark: 'added',
      operator: item.operator,
      message: null,
      items: treeOf(item.items, rules),
    };
    return group;
  });
}

// The clock

/** Whether the run's deadline has passed */
function passed(options: CheckOptions): boolean {
  return options.now() >= options.deadline;
}
