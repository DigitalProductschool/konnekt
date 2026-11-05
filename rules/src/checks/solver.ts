// The solver (specs/003-rule-consistency-checks, FR-003 to FR-010; research R4, R5, R8, R10):
// whether some applicant meets a formula on some day of sharing within a range of days, for the
// questions of research R4. `satisfiable()` answers 'sat', 'unsat' or 'unknown', and
// `feasibleDaysOf()` gives the days themselves.
//
// It is a tableau over the formula's tree (research R5):
// - The formula is first brought into a normal form and shared (`intern()`): AND inside AND and
//   OR inside OR are flattened, `true` and `false` are taken out, children are kept once each,
//   ordered by id, and an AND holding a literal and its complement is `false` (an OR, `true`).
//   Equal formulas get the same node, whatever objects they are built from. A question's own top
//   level isn't interned (`questionOf()`): its conjuncts' ids are its key, so the memo knows a
//   question asked again with fresh objects, or with its conjuncts in another order.
// - Independent parts: a conjunction is split into parts that share no variable, and each part is
//   solved on its own; over a range of days, every date variable with a condition counted from the
//   day of sharing (`isRelativeDateTest()`) shares that day, so those variables stay in one part.
//   The search splits again whenever the ORs still open fall apart into such parts.
// - Each part: its literals are chosen, per variable, and its ORs stay open. The search branches
//   over the children of one OR at a time, starting with the OR that has the fewest children left.
//   It drops a child that contradicts the chosen literals, skips an OR that a chosen literal
//   already satisfies, adds the literals under the chosen child (an AND), and backtracks on a
//   contradiction. An OR with one child left takes it without branching.
// - After each step, the variable whose literals changed is decided by its theory
//   (numberTheory.ts, enumTheory.ts, textTheory.ts, dateTheory.ts), and only that one: the others
//   keep their answers. Over a range of days, the date variables counted from the day of sharing
//   are decided with `feasibleDays()`, and the days on which every one of them can be met (the
//   intersection) must not be empty. A literal's complement among the chosen literals refutes it
//   without a theory call, each answer is kept for as long as the chosen literals stay, and the
//   memo keeps the text and date theories' answers for the whole run.
//
// The answers (research R5, FR-010):
// - 'sat': some applicant meets the formula on some day of the range. Number, enum and text
//   variables don't depend on the day, and the date variables decided over days found a day in
//   common, so a leaf of the search whose variables can all be met is a real applicant on a real
//   day.
// - 'unsat': every child of every OR the search branched over was refuted, by a theory's 'unsat'
//   or by days that don't intersect.
// - 'unknown': a theory couldn't decide (the text theory's corner, research R7) and nothing else
//   refuted that branch of the search, or the deadline passed. An OR is 'sat' as soon as one child
//   is, and 'unsat' only when every child is; an AND (and a set of independent parts) is 'unsat'
//   as soon as one part is, and 'sat' only when every part is. So 'unknown' never turns into
//   'sat' or 'unsat', and it doesn't spread past a branch or a part that decides the answer.
//
// The memo (`createSolverMemo()`), for one run of one checked branch: answers by formula and days,
// the independent parts of the questions by their conjuncts and, for a part with a condition
// counted from the day of sharing, the days, and the text and date theories' answers by their
// literals. The many overlapping questions of research R8's searches share most of their parts.
// An answer cut short by the deadline is never kept: the deadline unwinds the search before
// anything of the question is stored
import { decideDate, feasibleDays, isRelativeDateTest } from './dateTheory';
import { decideEnum } from './enumTheory';
import { decideNumber } from './numberTheory';
import { decideText } from './textTheory';
import type {
  CheckOptions,
  DateTest,
  DayRange,
  EnumTest,
  Formula,
  Literal,
  LiteralTest,
  NumberTest,
  TextTest,
  Variable,
  Verdict,
} from './types';

// The interface

/** What the solver reads besides the formula and the days */
export interface SolverOptions extends CheckOptions {
  /**
   * The variables the formula's literals name, by key: `CheckedBranch.variables`. A literal on a
   * variable that isn't among them, or of another kind, is a programming error, and throws
   */
  variables: Readonly<Record<string, Variable>>;
  /**
   * The run's memo, from `createSolverMemo()`: one per checked branch and today, so that the
   * questions of one `checkBranch()` share their answers. It serves the `variables` it is first
   * used with, and throws when given others. Without it, nothing is kept between questions
   */
  memo?: SolverMemo;
}

/** What a memo has counted, for tests and measurements */
export interface SolverStats {
  /** Questions asked: calls of `satisfiable()` and `feasibleDaysOf()` */
  questions: number;
  /** Questions answered from the memo */
  questionHits: number;
  /** Independent parts of the questions' conjunctions looked up */
  parts: number;
  /** Parts answered from the memo */
  partHits: number;
  /** Steps of the search: each time it looks at a part's open ORs */
  nodes: number;
  /** Theory calls made */
  decisions: number;
  /** Answers of the text and date theories taken from the memo instead */
  decisionHits: number;
}

/** A run's memo (`createSolverMemo()`). Opaque, but for its counts */
export interface SolverMemo {
  readonly stats: SolverStats;
}

/**
 * A new memo for one run: one checked branch, one today. It keeps every answer the deadline didn't
 * cut short, by formula and range of days, and the answers of the questions' independent parts.
 * It holds nothing but the questions' own data, so it is dropped with the run
 */
export function createSolverMemo(): SolverMemo {
  const stats: SolverStats = {
    questions: 0,
    questionHits: 0,
    parts: 0,
    partHits: 0,
    nodes: 0,
    decisions: 0,
    decisionHits: 0,
  };
  const memo: SolverMemo = { stats };
  MEMOS.set(memo, newMemoState(stats));
  return memo;
}

/**
 * Whether some applicant meets `formula` on some day of sharing of `days` (day numbers, both
 * included): 'sat', 'unsat', or 'unknown' when a theory can't decide or `options.deadline` passes
 * (research R5). For today alone, pass `{ from: today, to: today }`; "on every day from today
 * on" is the complement: `satisfiable(negate(formula), { from: today, to: LAST_DAY }, …)` is
 * 'unsat' exactly when every applicant meets `formula` on every day from today (research R4). An
 * empty range (`from` after `to`) has no day, so 'unsat'.
 *
 * With a memo, an answer kept from an earlier question is returned at once, even past the
 * deadline, since it is certain. Otherwise the clock is read before the search starts, before
 * each call of the text theory and of the date theory over days, and every few cheap steps
 * between (`CLOCK_STEPS`), so the answer comes no later than the deadline plus one theory step
 */
export function satisfiable(formula: Formula, days: DayRange, options: SolverOptions): Verdict {
  const state = memoStateOf(options);
  state.stats.questions += 1;
  if (days.from > days.to) {
    return 'unsat';
  }
  const question = questionOf(formula, state, options.variables);
  const key = `${question.key}@${days.from}-${days.to}`;
  const known = state.verdicts.get(key);
  if (known !== undefined) {
    state.stats.questionHits += 1;
    return known;
  }
  const run = runOf(state, options);
  try {
    const verdict = new Search(run, [days], days, question).solveRoot(question);
    state.verdicts.set(key, verdict);
    return verdict;
  } catch (error) {
    if (error instanceof DeadlinePassed) {
      return 'unknown';
    }
    throw error;
  }
}

/**
 * The days of `days` on which some applicant meets `formula`, as sorted, disjoint, non-adjacent
 * `DayRange`s, both ends included, as `feasibleDays()` and the oracle's `meetDays()` give them:
 * empty when there are none (`satisfiable()` would answer 'unsat'). 'unknown' when a theory
 * can't decide for days that no certain answer covers, or the deadline passes.
 *
 * The search finds a leaf that can be met, takes every day on which that leaf can be met, and
 * searches again on the days left, until none is left or no leaf can be met on them. So the
 * answer is exact: each day found has an applicant, and the days left have none. Without a date
 * condition counted from the day of sharing, the answer is every day of `days` or none. A memo
 * keeps it as `satisfiable()` keeps its answers, and also keeps the verdict for `days`
 */
export function feasibleDaysOf(
  formula: Formula,
  days: DayRange,
  options: SolverOptions
): DayRange[] | 'unknown' {
  const state = memoStateOf(options);
  state.stats.questions += 1;
  if (days.from > days.to) {
    return [];
  }
  const question = questionOf(formula, state, options.variables);
  const range = `${question.key}@${days.from}-${days.to}`;
  const known = state.feasible.get(range);
  if (known !== undefined) {
    state.stats.questionHits += 1;
    return known === 'unknown' ? known : copied(known);
  }
  const run = runOf(state, options);
  let found: Days = NO_DAYS;
  let left: Days = [days];
  try {
    while (left.length > 0) {
      const search = new Search(run, left, days, question);
      const verdict = search.solveRoot(question);
      if (verdict === 'unknown') {
        state.feasible.set(range, 'unknown');
        return 'unknown';
      }
      if (verdict === 'unsat') {
        break;
      }
      found = union(found, search.satDays);
      left = difference(left, search.satDays);
    }
  } catch (error) {
    if (error instanceof DeadlinePassed) {
      return 'unknown';
    }
    throw error;
  }
  state.feasible.set(range, found);
  state.verdicts.set(range, found.length > 0 ? 'sat' : 'unsat');
  return copied(found);
}

// Budgets

/**
 * The cheap steps (a search step, a number, enum or fixed-date decision) between two readings of
 * the clock. The text theory (up to about 5 ms) and the date theory over days (about 60 µs) count
 * as this many, so the clock is read before each of them
 */
const CLOCK_STEPS = 32;

// The formulas the search reads (`intern()`)

/** Days of sharing as day numbers: sorted, disjoint and non-adjacent ranges, both ends included */
type Days = readonly DayRange[];

/**
 * What a variable's chosen literals come to: their theory's verdict, which holds on every day, or
 * for a date variable decided over days, the days of the range on which they can be met
 */
type Answer = Verdict | Days;

/** `true` or `false`, which only a whole formula can be once it is interned */
interface ConstantNode<T extends 'true' | 'false'> {
  readonly type: T;
  readonly id: number;
  readonly vars: readonly number[];
  readonly relativeVars: readonly number[];
}

/** A literal, interned: equal literals are the same node */
interface LiteralNode {
  readonly type: 'literal';
  readonly id: number;
  readonly literal: Literal;
  /** The variable's index in the memo */
  readonly variable: number;
  /** The same literal with `negated` flipped; set as soon as both nodes exist */
  complement: LiteralNode | null;
  /** `[variable]` */
  readonly vars: readonly number[];
  /** `[variable]` when the test is counted from the day of sharing, else empty */
  readonly relativeVars: readonly number[];
}

/** An AND of at least two literals and ORs, ordered by id, each once */
interface AndNode {
  readonly type: 'and';
  readonly id: number;
  readonly children: readonly (LiteralNode | OrNode)[];
  /** The variables of its literals, ascending */
  readonly vars: readonly number[];
  /** The variables of its literals counted from the day of sharing, ascending */
  readonly relativeVars: readonly number[];
}

/** An OR of at least two literals and ANDs, ordered by id, each once */
interface OrNode {
  readonly type: 'or';
  readonly id: number;
  readonly children: readonly (LiteralNode | AndNode)[];
  readonly vars: readonly number[];
  readonly relativeVars: readonly number[];
}

type Node = ConstantNode<'true'> | ConstantNode<'false'> | LiteralNode | AndNode | OrNode;

/** A conjunct of a conjunction: what is left once ANDs are flattened */
type Conjunct = LiteralNode | OrNode;

/** A child of an OR */
type Alternative = LiteralNode | AndNode;

/**
 * A question's formula as the search reads it: the conjuncts of its top level, without a node of
 * its own, since most questions are new ANDs of formulas interned before
 */
interface Question {
  /** False for `false`, or a conjunct that is */
  readonly possible: boolean;
  /** Its conjuncts, ordered by id, each once; none for `true` */
  readonly conjuncts: readonly Conjunct[];
  /** Its conjuncts' ids, the memo's key */
  readonly key: string;
}

const TRUE: ConstantNode<'true'> = { type: 'true', id: 0, vars: [], relativeVars: [] };
const FALSE: ConstantNode<'false'> = { type: 'false', id: 1, vars: [], relativeVars: [] };

/** The first id of the nodes a memo interns */
const FIRST_ID = 2;

const NO_DAYS: Days = [];

/** An independent part's answer, and for one that can be met, the days on which it can */
interface PartAnswer {
  readonly verdict: Verdict;
  readonly days: Days;
}

/** What a memo keeps (`createSolverMemo()`) */
interface MemoState {
  readonly stats: SolverStats;
  /** The variables the memo serves, set by its first question */
  source: Readonly<Record<string, Variable>> | null;
  /** The variables of the interned literals, by index */
  readonly variables: Variable[];
  readonly variableIndex: Map<string, number>;
  /** The node of each formula object interned so far */
  readonly byFormula: WeakMap<object, Node>;
  /** The node of each literal's key, and of each AND's and OR's children */
  readonly byKey: Map<string, Node>;
  nextId: number;
  /** Answers by `<question key>@<from>-<to>` */
  readonly verdicts: Map<string, Verdict>;
  /** `feasibleDaysOf()`'s answers, by the same keys */
  readonly feasible: Map<string, Days | 'unknown'>;
  /** Independent parts by their conjuncts' ids, after their days when they depend on the day */
  readonly parts: Map<string, PartAnswer>;
  /**
   * The text and date theories' answers, by the literals' ids, then the day or the range of days
   * when they depend on it. The number and enum theories answer faster than the key is made
   */
  readonly decisions: Map<string, Answer>;
}

/** Each memo's state, out of reach of its holder */
const MEMOS = new WeakMap<SolverMemo, MemoState>();

function newMemoState(stats: SolverStats): MemoState {
  return {
    stats,
    source: null,
    variables: [],
    variableIndex: new Map(),
    byFormula: new WeakMap(),
    byKey: new Map(),
    nextId: FIRST_ID,
    verdicts: new Map(),
    feasible: new Map(),
    parts: new Map(),
    decisions: new Map(),
  };
}

/** The memo's state for these options, or a fresh one without a memo */
function memoStateOf(options: SolverOptions): MemoState {
  const { memo, variables } = options;
  if (memo === undefined) {
    const state = newMemoState(createSolverMemo().stats);
    state.source = variables;
    return state;
  }
  const state = MEMOS.get(memo);
  if (state === undefined) {
    throw new Error('The solver reads only memos from createSolverMemo()');
  }
  if (state.source === null) {
    state.source = variables;
  } else if (state.source !== variables) {
    throw new Error("A solver memo serves the variables of one checked branch, and these aren't");
  }
  return state;
}

/**
 * The question of `formula`: its top level's conjuncts, as `andNode()` would flatten, order and
 * keep them, but without interning the top level's ANDs themselves. Equal questions get equal
 * keys. Linear in the number of conjuncts, and in the size of the parts not interned yet
 */
function questionOf(
  formula: Formula,
  state: MemoState,
  variables: Readonly<Record<string, Variable>>
): Question {
  const collected: Conjunct[] = [];
  if (!collectConjuncts(formula, state, variables, collected)) {
    return { possible: false, conjuncts: [], key: 'false' };
  }
  collected.sort((a, b) => a.id - b.id);
  const conjuncts: Conjunct[] = [];
  let key = '';
  for (const conjunct of collected) {
    if (conjuncts.length === 0 || conjuncts[conjuncts.length - 1] !== conjunct) {
      key += conjuncts.length === 0 ? `${conjunct.id}` : `,${conjunct.id}`;
      conjuncts.push(conjunct);
    }
  }
  return { possible: true, conjuncts, key };
}

/**
 * Adds the conjuncts of `formula` to `conjuncts`: an AND's members, flattened, and any other
 * formula interned. False when one of them is `false`
 */
function collectConjuncts(
  formula: Formula,
  state: MemoState,
  variables: Readonly<Record<string, Variable>>,
  conjuncts: Conjunct[]
): boolean {
  if (typeof formula === 'boolean') {
    return formula;
  }
  const known = state.byFormula.get(formula);
  if (known === undefined && 'and' in formula) {
    return formula.and.every((member) => collectConjuncts(member, state, variables, conjuncts));
  }
  const node = known ?? intern(formula, state, variables);
  switch (node.type) {
    case 'true':
      return true;
    case 'false':
      return false;
    case 'and':
      conjuncts.push(...node.children);
      return true;
    default:
      conjuncts.push(node);
      return true;
  }
}

/**
 * The node of `formula` (see the module's comment): from the memo when the same object, or an
 * equal formula, was interned before. Linear in the size of the parts not interned yet
 */
function intern(
  formula: Formula,
  state: MemoState,
  variables: Readonly<Record<string, Variable>>
): Node {
  if (typeof formula === 'boolean') {
    return formula ? TRUE : FALSE;
  }
  const known = state.byFormula.get(formula);
  if (known !== undefined) {
    return known;
  }
  let node: Node;
  if ('and' in formula) {
    node = andNode(
      formula.and.map((member) => intern(member, state, variables)),
      state
    );
  } else if ('or' in formula) {
    node = orNode(
      formula.or.map((member) => intern(member, state, variables)),
      state
    );
  } else {
    node = literalNode(formula, state, variables);
  }
  state.byFormula.set(formula, node);
  return node;
}

/** The AND of interned members: flattened, without `true`, each child once, ordered by id */
function andNode(members: readonly Node[], state: MemoState): Node {
  const children = new Map<number, Conjunct>();
  for (const member of members) {
    switch (member.type) {
      case 'false':
        return FALSE;
      case 'true':
        break;
      case 'and':
        member.children.forEach((child) => children.set(child.id, child));
        break;
      default:
        children.set(member.id, member);
    }
  }
  for (const child of children.values()) {
    if (child.type === 'literal' && child.complement && children.has(child.complement.id)) {
      return FALSE;
    }
  }
  const sorted = [...children.values()].sort((a, b) => a.id - b.id);
  if (sorted.length < 2) {
    return sorted.length === 0 ? TRUE : sorted[0];
  }
  const key = `&${sorted.map((child) => child.id).join(',')}`;
  const known = state.byKey.get(key);
  if (known !== undefined) {
    return known;
  }
  const node: AndNode = {
    type: 'and',
    id: state.nextId,
    children: sorted,
    vars: mergedVars(sorted.map((child) => child.vars)),
    relativeVars: mergedVars(sorted.map((child) => child.relativeVars)),
  };
  state.nextId += 1;
  state.byKey.set(key, node);
  return node;
}

/** The OR of interned members: flattened, without `false`, each child once, ordered by id */
function orNode(members: readonly Node[], state: MemoState): Node {
  const children = new Map<number, Alternative>();
  for (const member of members) {
    switch (member.type) {
      case 'true':
        return TRUE;
      case 'false':
        break;
      case 'or':
        member.children.forEach((child) => children.set(child.id, child));
        break;
      default:
        children.set(member.id, member);
    }
  }
  for (const child of children.values()) {
    if (child.type === 'literal' && child.complement && children.has(child.complement.id)) {
      return TRUE;
    }
  }
  const sorted = [...children.values()].sort((a, b) => a.id - b.id);
  if (sorted.length < 2) {
    return sorted.length === 0 ? FALSE : sorted[0];
  }
  const key = `|${sorted.map((child) => child.id).join(',')}`;
  const known = state.byKey.get(key);
  if (known !== undefined) {
    return known;
  }
  const node: OrNode = {
    type: 'or',
    id: state.nextId,
    children: sorted,
    vars: mergedVars(sorted.map((child) => child.vars)),
    relativeVars: mergedVars(sorted.map((child) => child.relativeVars)),
  };
  state.nextId += 1;
  state.byKey.set(key, node);
  return node;
}

/** The literal's node, interned with its complement's, so that each knows the other */
function literalNode(
  literal: Literal,
  state: MemoState,
  variables: Readonly<Record<string, Variable>>
): LiteralNode {
  const key = literalKey(literal);
  const known = state.byKey.get(key);
  if (known !== undefined && known.type === 'literal') {
    return known;
  }
  const variable = variableIndexOf(literal, state, variables);
  const node = newLiteralNode(literal, variable, state);
  const complement = newLiteralNode({ ...literal, negated: !literal.negated }, variable, state);
  node.complement = complement;
  complement.complement = node;
  state.byKey.set(key, node);
  state.byKey.set(literalKey(complement.literal), complement);
  return node;
}

function newLiteralNode(literal: Literal, variable: number, state: MemoState): LiteralNode {
  const relative = literal.test.kind === 'date' && isRelativeDateTest(literal.test);
  const node: LiteralNode = {
    type: 'literal',
    id: state.nextId,
    literal,
    variable,
    complement: null,
    vars: [variable],
    relativeVars: relative ? [variable] : [],
  };
  state.nextId += 1;
  return node;
}

/**
 * The index of the literal's variable in the memo. Throws for a variable that `variables` doesn't
 * have, or whose kind isn't the literal's
 */
function variableIndexOf(
  literal: Literal,
  state: MemoState,
  variables: Readonly<Record<string, Variable>>
): number {
  let index = state.variableIndex.get(literal.variable);
  if (index === undefined) {
    const variable: Variable | undefined = Object.hasOwn(variables, literal.variable)
      ? variables[literal.variable]
      : undefined;
    if (variable === undefined) {
      throw new Error(`The solver has no variable ${literal.variable}`);
    }
    index = state.variables.length;
    state.variables.push(variable);
    state.variableIndex.set(literal.variable, index);
  }
  if (state.variables[index].kind !== literal.test.kind) {
    throw new Error(`A ${literal.test.kind} test on the ${state.variables[index].kind} variable`);
  }
  return index;
}

/**
 * A literal's key: its variable and test, as checkedTree.ts' fingerprint writes them, then "!"
 * when it is negated. Equal keys are equal literals
 */
function literalKey(literal: Literal): string {
  const { test } = literal;
  let fields: unknown[];
  switch (test.kind) {
    case 'number':
      fields = [test.op, test.value];
      break;
    case 'text':
      fields = [test.op, test.text, test.matchCase];
      break;
    case 'enum':
      fields = [test.op, test.values];
      break;
    case 'date':
      fields = 'date' in test ? [test.op, test.date] : [test.op, test.count, test.unit];
      break;
  }
  return JSON.stringify([literal.variable, test.kind, ...fields]) + (literal.negated ? '!' : '');
}

/** The union of sorted lists of variable indices, ascending */
function mergedVars(lists: readonly (readonly number[])[]): number[] {
  const all = new Set<number>();
  for (const list of lists) {
    for (const variable of list) {
      all.add(variable);
    }
  }
  return [...all].sort((a, b) => a - b);
}

// The search

/** Thrown through the search when the deadline passes; the question answers 'unknown' */
class DeadlinePassed extends Error {
  constructor() {
    super('The deadline passed');
  }
}

/** One question's clock and memo */
interface Run {
  readonly state: MemoState;
  readonly now: () => number;
  readonly deadline: number;
  /** Cheap steps left before the clock is read again */
  untilClock: number;
}

function runOf(state: MemoState, options: CheckOptions): Run {
  // 0: the clock is read at the first step
  return { state, now: options.now, deadline: options.deadline, untilClock: 0 };
}

/** One variable's chosen literals, with what they come to, as stacks that the search undoes */
interface VariableFrames {
  readonly chosen: LiteralNode[];
  /** The answer of `chosen`'s first i + 1 literals at i */
  readonly answers: Answer[];
  /**
   * At i, the answers of `chosen`'s first i literals with one more literal, by that literal,
   * kept while those i literals stay chosen
   */
  readonly probes: Map<LiteralNode, Answer>[];
}

/** Conjuncts that share no variable with the others, nor the day of sharing over a range */
interface Part<N extends Conjunct> {
  readonly nodes: N[];
  /** Their variables, each once */
  readonly vars: readonly number[];
  /** Whether a literal is counted from the day of sharing, so that the part depends on the day */
  readonly dated: boolean;
}

/** An undo entry for `days`, besides the variables' indices */
const DAYS_ENTRY = -1;

/**
 * The search for one question on a set of days of sharing (see the module's comment). It is
 * created for each search and holds the chosen literals per variable, the days left, and an undo
 * trail. `satDays` holds the days of the last leaf found that can be met
 */
class Search {
  /** The days left: within the question's, on which every variable decided over days can be met */
  days: Days;
  /** After a 'sat': every day on which the leaf found can be met. Within `days` */
  satDays: Days = NO_DAYS;
  private readonly run: Run;
  /** The question's range: what the date theory decides over */
  private readonly hull: DayRange;
  /** By variable: whether it is decided over days, with `feasibleDays()` */
  private readonly overDays: boolean[];
  private readonly frames: (VariableFrames | undefined)[] = [];
  /** What to undo: a variable's index for its last chosen literal, or `DAYS_ENTRY` */
  private readonly trail: number[] = [];
  private readonly savedDays: Days[] = [];

  constructor(run: Run, days: Days, hull: DayRange, question: Question) {
    this.run = run;
    this.days = days;
    this.hull = hull;
    this.overDays = new Array<boolean>(run.state.variables.length).fill(false);
    if (hull.from < hull.to) {
      for (const conjunct of question.conjuncts) {
        conjunct.relativeVars.forEach((variable) => (this.overDays[variable] = true));
      }
    }
  }

  /** The question's answer: its independent parts, each from the memo or searched */
  solveRoot(question: Question): Verdict {
    if (!question.possible) {
      return 'unsat';
    }
    let verdict: Verdict = 'sat';
    let days = this.days;
    for (const part of this.partsOf(question.conjuncts)) {
      const answer = this.solvePart(part);
      if (answer.verdict === 'unsat') {
        return 'unsat';
      }
      if (answer.verdict === 'unknown') {
        verdict = 'unknown';
      } else if (part.dated) {
        days = answer.days;
      }
    }
    if (verdict === 'sat') {
      this.satDays = days;
    }
    return verdict;
  }

  /** A part of the question's conjunction, from the memo, or searched and kept */
  private solvePart(part: Part<Conjunct>): PartAnswer {
    const { state } = this.run;
    state.stats.parts += 1;
    const ids = part.nodes.map((node) => node.id).join(',');
    const key = part.dated ? `${daysKey(this.days)}|${ids}` : ids;
    const known = state.parts.get(key);
    if (known !== undefined) {
      state.stats.partHits += 1;
      return known;
    }
    const mark = this.trail.length;
    const ors: OrNode[] = [];
    let verdict: Verdict = 'unsat';
    if (this.chooseAll(part.nodes, ors)) {
      verdict = this.solve(ors, part.vars);
    }
    const answer: PartAnswer = { verdict, days: verdict === 'sat' ? this.satDays : NO_DAYS };
    this.undo(mark);
    state.parts.set(key, answer);
    return answer;
  }

  /**
   * Whether the chosen literals and the open ORs `ors` can be met, for a part whose variables are
   * `vars`. The ORs that a chosen literal satisfies are skipped; the one with the fewest children
   * left is branched over, after the ORs left are split into independent parts
   */
  private solve(ors: readonly OrNode[], vars: readonly number[]): Verdict {
    this.tick(1);
    this.run.state.stats.nodes += 1;
    const open: OrNode[] = [];
    let best: OrNode | null = null;
    let bestChildren: Alternative[] = [];
    for (let index = 0; index < ors.length; index += 1) {
      const or = ors[index];
      if (this.satisfied(or)) {
        continue;
      }
      const children = or.children.filter((child) => !this.refuted(child));
      if (children.length === 0) {
        return 'unsat';
      }
      if (children.length === 1) {
        return this.branch(children, open.concat(ors.slice(index + 1)), vars);
      }
      open.push(or);
      if (best === null || children.length < bestChildren.length) {
        best = or;
        bestChildren = children;
      }
    }
    if (best === null) {
      return this.leaf(vars);
    }
    if (open.length > 1) {
      const parts = this.partsOf(open);
      if (parts.length > 1) {
        return this.solveParts(parts, vars);
      }
    }
    const chosen = best;
    return this.branch(
      bestChildren,
      open.filter((or) => or !== chosen),
      vars
    );
  }

  /**
   * Independent parts of the open ORs, each searched on its own: 'unsat' when one is, 'sat' when
   * every one is and every variable of `vars` that no part holds can be met
   */
  private solveParts(parts: Part<OrNode>[], vars: readonly number[]): Verdict {
    const held = new Set<number>();
    parts.forEach((part) => part.vars.forEach((variable) => held.add(variable)));
    let verdict: Verdict = 'sat';
    if (vars.some((variable) => !held.has(variable) && this.isUnknown(variable))) {
      verdict = 'unknown';
    }
    let days = this.days;
    for (const part of parts) {
      const answer = this.solve(part.nodes, part.vars);
      if (answer === 'unsat') {
        return 'unsat';
      }
      if (answer === 'unknown') {
        verdict = 'unknown';
      } else if (part.dated) {
        days = this.satDays;
      }
    }
    if (verdict === 'sat') {
      this.satDays = days;
    }
    return verdict;
  }

  /** Tries each child of an OR in turn, with the ORs `rest` still open */
  private branch(
    children: readonly Alternative[],
    rest: readonly OrNode[],
    vars: readonly number[]
  ): Verdict {
    let verdict: Verdict = 'unsat';
    for (const child of children) {
      const mark = this.trail.length;
      const added: OrNode[] = [];
      if (this.choose(child, added)) {
        const answer = this.solve(added.length === 0 ? rest : rest.concat(added), vars);
        if (answer === 'sat') {
          this.undo(mark);
          return 'sat';
        }
        if (answer === 'unknown') {
          verdict = 'unknown';
        }
      }
      this.undo(mark);
    }
    return verdict;
  }

  /** No OR left open: 'sat', with the days left, unless a variable of `vars` is 'unknown' */
  private leaf(vars: readonly number[]): Verdict {
    if (vars.some((variable) => this.isUnknown(variable))) {
      return 'unknown';
    }
    this.satDays = this.days;
    return 'sat';
  }

  /** Chooses the literals of `nodes` and adds their ORs to `ors`; false on a contradiction */
  private chooseAll(nodes: readonly Conjunct[], ors: OrNode[]): boolean {
    for (const node of nodes) {
      if (node.type === 'or') {
        ors.push(node);
      } else if (!this.chooseLiteral(node)) {
        return false;
      }
    }
    return true;
  }

  /** Chooses an OR's child: a literal, or an AND's literals and ORs. False on a contradiction */
  private choose(node: Alternative, ors: OrNode[]): boolean {
    return node.type === 'literal' ? this.chooseLiteral(node) : this.chooseAll(node.children, ors);
  }

  /**
   * Adds the literal to its variable's chosen literals, decides them again (from the probe kept
   * for it, if any), and narrows the days for a variable decided over days. False when the
   * literals or the days are refuted; the literal stays on the trail to be undone
   */
  private chooseLiteral(node: LiteralNode): boolean {
    const frames = this.framesOf(node.variable);
    if (frames.chosen.includes(node)) {
      return true;
    }
    const answer = this.probe(node);
    frames.chosen.push(node);
    frames.answers.push(answer);
    frames.probes.push(new Map());
    this.trail.push(node.variable);
    if (typeof answer === 'string') {
      return answer !== 'unsat';
    }
    this.savedDays.push(this.days);
    this.trail.push(DAYS_ENTRY);
    this.days = intersection(this.days, answer);
    return this.days.length > 0;
  }

  /** Undoes the trail down to `mark` */
  private undo(mark: number): void {
    while (this.trail.length > mark) {
      const entry = this.trail[this.trail.length - 1];
      this.trail.length -= 1;
      if (entry === DAYS_ENTRY) {
        this.days = this.savedDays[this.savedDays.length - 1];
        this.savedDays.length -= 1;
      } else {
        const frames = this.framesOf(entry);
        frames.chosen.pop();
        frames.answers.pop();
        frames.probes.pop();
      }
    }
  }

  /** Whether the chosen literals satisfy the node: a literal among them, or through AND and OR */
  private satisfied(node: Alternative | OrNode): boolean {
    switch (node.type) {
      case 'literal':
        return this.framesOf(node.variable).chosen.includes(node);
      case 'and':
        return node.children.every((child) => this.satisfied(child));
      case 'or':
        return node.children.some((child) => this.satisfied(child));
    }
  }

  /**
   * Whether the chosen literals refute the node: a literal its theory refutes with them, or whose
   * days miss the days left; an AND with such a child; an OR with only such children. An
   * 'unknown' doesn't refute
   */
  private refuted(node: Alternative | OrNode): boolean {
    switch (node.type) {
      case 'literal': {
        const answer = this.probe(node);
        return typeof answer === 'string' ? answer === 'unsat' : !overlaps(answer, this.days);
      }
      case 'and':
        return node.children.some((child) => this.refuted(child));
      case 'or':
        return node.children.every((child) => this.refuted(child));
    }
  }

  /**
   * The answer of the literal's variable with the literal added to its chosen literals: theirs
   * when it is among them, a contradiction when its complement is, else its theory's, kept for
   * as long as the chosen literals stay
   */
  private probe(node: LiteralNode): Answer {
    const frames = this.framesOf(node.variable);
    const { chosen } = frames;
    if (chosen.includes(node)) {
      return frames.answers[frames.answers.length - 1];
    }
    const probes = frames.probes[frames.probes.length - 1];
    let answer = probes.get(node);
    if (answer === undefined) {
      if (node.complement !== null && chosen.includes(node.complement)) {
        answer = this.overDays[node.variable] ? NO_DAYS : 'unsat';
      } else {
        answer = this.decide(node.variable, [...chosen, node]);
      }
      probes.set(node, answer);
    }
    return answer;
  }

  /** The theory's answer for one variable's literals */
  private decide(index: number, nodes: readonly LiteralNode[]): Answer {
    const variable = this.run.state.variables[index];
    const { hull } = this;
    switch (variable.kind) {
      case 'number':
        this.tick(1);
        this.run.state.stats.decisions += 1;
        return decideNumber(literalsOf(nodes, isNumberLiteral)).verdict;
      case 'enum':
        this.tick(1);
        this.run.state.stats.decisions += 1;
        return decideEnum(literalsOf(nodes, isEnumLiteral), variable).verdict;
      case 'text':
        return this.decideOnce(
          nodes,
          '',
          CLOCK_STEPS,
          () => decideText(literalsOf(nodes, isTextLiteral)).verdict
        );
      case 'date': {
        const literals = literalsOf(nodes, isDateLiteral);
        if (this.overDays[index]) {
          return this.decideOnce(nodes, `${hull.from}-${hull.to}`, CLOCK_STEPS, () =>
            feasibleDays(literals, hull)
          );
        }
        // Without a test counted from the day of sharing in the question, or on one day: the
        // question's first day stands for its every day
        const relative = nodes.some((node) => node.relativeVars.length > 0);
        return this.decideOnce(
          nodes,
          relative ? `${hull.from}` : '',
          1,
          () => decideDate(literals, variable, hull.from).verdict
        );
      }
    }
  }

  /**
   * A theory's answer for the literals `nodes` on `days` (a key; empty when the answer holds on
   * every day): from the memo, or decided, counting `cost` steps, and kept
   */
  private decideOnce(
    nodes: readonly LiteralNode[],
    days: string,
    cost: number,
    decision: () => Answer
  ): Answer {
    const { stats, decisions } = this.run.state;
    const key = `${nodes
      .map((node) => node.id)
      .sort((a, b) => a - b)
      .join(',')}@${days}`;
    const known = decisions.get(key);
    if (known !== undefined) {
      stats.decisionHits += 1;
      this.tick(1);
      return known;
    }
    this.tick(cost);
    stats.decisions += 1;
    const answer = decision();
    decisions.set(key, answer);
    return answer;
  }

  /** Whether the variable's chosen literals came back 'unknown' */
  private isUnknown(variable: number): boolean {
    const { answers } = this.framesOf(variable);
    return answers.length > 0 && answers[answers.length - 1] === 'unknown';
  }

  /** The variable's frames, made on first use */
  private framesOf(variable: number): VariableFrames {
    let frames = this.frames[variable];
    if (frames === undefined) {
      frames = { chosen: [], answers: [], probes: [new Map()] };
      this.frames[variable] = frames;
    }
    return frames;
  }

  /**
   * The conjuncts grouped into parts that share no variable, smallest first, each in the
   * conjuncts' order. Over a range of days, the variables decided over days share the day of
   * sharing, so they fall into one part
   */
  private partsOf<N extends Conjunct>(nodes: readonly N[]): Part<N>[] {
    if (nodes.length === 1) {
      const [node] = nodes;
      return [{ nodes: [node], vars: node.vars, dated: node.relativeVars.length > 0 }];
    }
    const { overDays } = this;
    const day = overDays.length;
    // Union-find over the variables, with the day of sharing as one more
    const parent = new Int32Array(day + 1);
    for (let index = 0; index <= day; index += 1) {
      parent[index] = index;
    }
    for (const node of nodes) {
      const first = rootOf(parent, overDays[node.vars[0]] ? day : node.vars[0]);
      for (const variable of node.vars) {
        const other = rootOf(parent, overDays[variable] ? day : variable);
        if (other !== first) {
          parent[other] = first;
        }
      }
    }
    const partOfRoot = new Int32Array(day + 1).fill(-1);
    const seen = new Uint8Array(day);
    const parts: { nodes: N[]; vars: number[]; dated: boolean }[] = [];
    for (const node of nodes) {
      const root = rootOf(parent, overDays[node.vars[0]] ? day : node.vars[0]);
      let index = partOfRoot[root];
      if (index < 0) {
        index = parts.length;
        partOfRoot[root] = index;
        parts.push({ nodes: [], vars: [], dated: false });
      }
      const part = parts[index];
      part.nodes.push(node);
      for (const variable of node.vars) {
        if (seen[variable] === 0) {
          seen[variable] = 1;
          part.vars.push(variable);
        }
      }
      part.dated ||= node.relativeVars.length > 0;
    }
    return parts.length > 1 ? parts.sort((a, b) => a.nodes.length - b.nodes.length) : parts;
  }

  /** Counts `cost` steps, and reads the clock every `CLOCK_STEPS` of them */
  private tick(cost: number): void {
    const { run } = this;
    run.untilClock -= cost;
    if (run.untilClock <= 0) {
      run.untilClock = CLOCK_STEPS;
      if (run.now() >= run.deadline) {
        throw new DeadlinePassed();
      }
    }
  }
}

/** The root of `variable` in a union-find forest, halving the path to it */
function rootOf(parent: Int32Array, variable: number): number {
  let root = variable;
  while (parent[root] !== root) {
    parent[root] = parent[parent[root]];
    root = parent[root];
  }
  return root;
}

// The theories' literals, by kind: `variableIndexOf()` made sure each matches its variable

function isNumberLiteral(literal: Literal): literal is Literal<NumberTest> {
  return literal.test.kind === 'number';
}

function isEnumLiteral(literal: Literal): literal is Literal<EnumTest> {
  return literal.test.kind === 'enum';
}

function isTextLiteral(literal: Literal): literal is Literal<TextTest> {
  return literal.test.kind === 'text';
}

function isDateLiteral(literal: Literal): literal is Literal<DateTest> {
  return literal.test.kind === 'date';
}

/** The nodes' literals of one kind */
function literalsOf<T extends LiteralTest>(
  nodes: readonly LiteralNode[],
  isOfKind: (literal: Literal) => literal is Literal<T>
): Literal<T>[] {
  const literals: Literal<T>[] = [];
  for (const node of nodes) {
    if (isOfKind(node.literal)) {
      literals.push(node.literal);
    }
  }
  return literals;
}

// Sets of days

/** The days in both */
function intersection(first: Days, second: Days): Days {
  const result: DayRange[] = [];
  let i = 0;
  let j = 0;
  while (i < first.length && j < second.length) {
    const from = Math.max(first[i].from, second[j].from);
    const to = Math.min(first[i].to, second[j].to);
    if (from <= to) {
      result.push({ from, to });
    }
    if (first[i].to < second[j].to) {
      i += 1;
    } else {
      j += 1;
    }
  }
  return result;
}

/** Whether the two have a day in common */
function overlaps(first: Days, second: Days): boolean {
  let i = 0;
  let j = 0;
  while (i < first.length && j < second.length) {
    if (Math.max(first[i].from, second[j].from) <= Math.min(first[i].to, second[j].to)) {
      return true;
    }
    if (first[i].to < second[j].to) {
      i += 1;
    } else {
      j += 1;
    }
  }
  return false;
}

/** The days in either, with adjacent ranges joined */
function union(first: Days, second: Days): Days {
  const sorted = [...first, ...second].sort((a, b) => a.from - b.from);
  const result: DayRange[] = [];
  for (const range of sorted) {
    const last = result[result.length - 1];
    if (last !== undefined && range.from <= last.to + 1) {
      result[result.length - 1] = { from: last.from, to: Math.max(last.to, range.to) };
    } else {
      result.push({ from: range.from, to: range.to });
    }
  }
  return result;
}

/** The days of `first` that aren't in `second` */
function difference(first: Days, second: Days): Days {
  const result: DayRange[] = [];
  let j = 0;
  for (const range of first) {
    let from = range.from;
    while (j < second.length && second[j].to < from) {
      j += 1;
    }
    let k = j;
    while (k < second.length && second[k].from <= range.to) {
      if (second[k].from > from) {
        result.push({ from, to: second[k].from - 1 });
      }
      from = Math.max(from, second[k].to + 1);
      k += 1;
    }
    if (from <= range.to) {
      result.push({ from, to: range.to });
    }
  }
  return result;
}

/** A set of days in new objects, which the caller may change without changing the memo */
function copied(days: Days): DayRange[] {
  return days.map((range) => ({ from: range.from, to: range.to }));
}

/** A set of days as a memo's key */
function daysKey(days: Days): string {
  return days.map((range) => `${range.from}-${range.to}`).join(',');
}
