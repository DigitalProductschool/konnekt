// The findings of one branch (specs/003-rule-consistency-checks, FR-003 to FR-006, FR-008, FR-010;
// research R4, R8; data-model.md, "Findings"; contracts/rule-checks.md, "checkBranch"):
// `checkBranch()` asks the solver the questions of research R4 about a checked tree and returns
// its notice and its findings, each with its reason. It runs in the worker, and directly in the
// tests.
//
// The steps of research R8 run in order (`STEPS`), on one `Run` that holds what they found:
// 1. Can the branch be met today? If not, the notice `none_can_meet` (FR-004).
// 2. Conflicts (FR-003), for every item, top-down, with a smallest set as the reason.
// 3. Every citizen meets the branch, on every day from today on? The notice `all_meet` (FR-006).
// 4. Always met and redundant (FR-005, FR-006), from the last item to the first, each group before
//    its members, in the working tree: the branch without the items already found redundant.
// 5. Certainty (FR-010) runs through every step: an 'unknown' answer, or the deadline, makes the
//    result incomplete, and keeps the findings made so far, which are true. A later step reads
//    `Run.meetable` and `Run.conflicts`, and visits only the items whose earlier answers are
//    certain.
//
// Every question is asked through one solver memo (`createSolverMemo()`), so the many overlapping
// questions of the smallest-set searches share their answers. Nothing here keeps state between
// calls, logs or reads a clock other than `options.now`: equal checked trees give equal results
import type { Combinator } from '@konnekt/api-types/form-connections';

import { dayNumber } from './calendar';
import { LAST_DAY, SEARCH_QUESTIONS_PER_ITEM } from './constants';
import { isRelativeDateTest } from './dateTheory';
import { negate } from './literals';
import { createSolverMemo, satisfiable, type SolverOptions } from './solver';
import type {
  BranchCheck,
  BranchNotice,
  CheckedBranch,
  CheckedItem,
  CheckOptions,
  ConflictingFinding,
  ConflictingReason,
  DayRange,
  Formula,
  ItemFinding,
  RedundantReason,
  Verdict,
} from './types';

/**
 * One branch's findings and notice (contracts/rule-checks.md, "checkBranch"), from the steps of
 * research R8 that `STEPS` holds:
 * - sound: every finding and notice is true for the rules of `checked`;
 * - complete when `complete` is true: every conflicting and always-met item has its finding, and
 *   the notice is there; the redundant findings are those of research R8, step 4, so deleting them
 *   all at once changes no outcome;
 * - at most one finding per item, in display order (data-model.md, invariant 1);
 * - deterministic: equal fingerprints give equal results, ties going to the earlier item in
 *   display order;
 * - bounded: it returns no later than `options.deadline` plus one theory step, with `complete`
 *   false and the certain findings when the deadline cuts it short.
 *
 * A branch without checked rules has no notice and no findings (W13)
 */
export function checkBranch(checked: CheckedBranch, options: CheckOptions): BranchCheck {
  const run = runOf(checked, options);
  if (run.tree.entries.length > 0) {
    try {
      for (const step of STEPS) {
        checkpoint(run);
        step(run);
      }
    } catch (error) {
      if (!(error instanceof DeadlinePassed)) {
        throw error;
      }
    }
  }
  return resultOf(run);
}

// The run

/** An item of the checked tree, with what the questions read of it */
interface Entry {
  item: CheckedItem;
  /** Its place in display order: top-down, each group before its members */
  order: number;
  /** The group that holds it, or null at the top level */
  parent: Entry | null;
  /** A group's members, in display order. Empty for a rule */
  members: Entry[];
  /** A rule's formula, or a group's AND or OR of its members' formulas */
  formula: Formula;
  /** The variables its formula reads */
  variables: ReadonlySet<string>;
  /**
   * Its variables, and `SHARING_DAY` when a condition is counted from the day of sharing: over a
   * range of days, those conditions are linked by that day (research R5)
   */
  linked: ReadonlySet<string>;
}

/** The checked tree as the steps read it */
interface Tree {
  /** The top level's combination */
  operator: Combinator;
  /** The top level's items */
  top: Entry[];
  /** Every item, in display order */
  entries: Entry[];
  /** The branch's rules as a whole */
  formula: Formula;
}

/**
 * Step 2's answer for an item: it is conflicting, it isn't, or that isn't certain. The later steps
 * visit only items whose answer is 'clear' (research R8, step 5)
 */
type ConflictAnswer = 'conflicting' | 'clear' | 'unknown';

/** What one `checkBranch()` knows: the tree, the solver's options, and what the steps found */
interface Run {
  readonly checked: CheckedBranch;
  readonly tree: Tree;
  readonly solver: SolverOptions;
  /** Today alone: the days of the conflicts and of the unmeetable branch (research R4) */
  readonly today: DayRange;
  /** The days after today: whether a finding holds on later days too (FR-008) */
  readonly later: DayRange;
  /**
   * Today to 9999-12-31: the days of the always-met, redundant and every-citizen questions,
   * which hold on every day from today on or aren't reported (FR-008)
   */
  readonly fromToday: DayRange;
  /** False once a question came back 'unknown' or the deadline passed (FR-010) */
  complete: boolean;
  notice: BranchNotice | null;
  /**
   * Step 1's answer: whether the branch can be met today, null before step 1 has answered. The
   * later steps ask about citizens who meet it only when it is 'sat'
   */
  meetable: Verdict | null;
  /** Step 2's answer per item id; an item without one wasn't reached */
  conflicts: Map<string, ConflictAnswer>;
  /** Whether each item can be met on its own today, by item id, as the questions find it */
  ownVerdicts: Map<string, Verdict>;
  /** The findings by item id: at most one per item (data-model.md, invariant 1) */
  findings: Map<string, ItemFinding>;
}

/** A step of research R8: it asks its questions and records its answers in the run */
type Step = (run: Run) => void;

/** The steps, in the order of research R8 */
const STEPS: readonly Step[] = [branchStep, conflictStep, allMeetStep, redundancyStep];

/** Thrown through the steps once the deadline has passed; the run keeps what it found */
class DeadlinePassed extends Error {
  constructor() {
    super('The deadline passed');
  }
}

function runOf(checked: CheckedBranch, options: CheckOptions): Run {
  const today = dayNumber(checked.today);
  return {
    checked,
    tree: treeOf(checked),
    solver: {
      deadline: options.deadline,
      now: options.now,
      variables: checked.variables,
      memo: createSolverMemo(),
    },
    today: { from: today, to: today },
    later: { from: today + 1, to: LAST_DAY },
    fromToday: { from: today, to: LAST_DAY },
    complete: true,
    notice: null,
    meetable: null,
    conflicts: new Map(),
    ownVerdicts: new Map(),
    findings: new Map(),
  };
}

/** The result: the findings in display order, and the rules checked */
function resultOf(run: Run): BranchCheck {
  const { checked, tree } = run;
  const findings: ItemFinding[] = [];
  for (const entry of tree.entries) {
    const finding = run.findings.get(entry.item.id);
    if (finding) {
      findings.push(finding);
    }
  }
  return {
    branchKey: checked.branchKey,
    fingerprint: checked.fingerprint,
    complete: run.complete,
    notice: run.notice,
    findings,
    checkedRules: tree.entries.filter((entry) => entry.item.type === 'rule').length,
  };
}

/** Throws `DeadlinePassed` once the deadline has passed, and marks the run incomplete */
function checkpoint(run: Run): void {
  if (run.solver.now() >= run.solver.deadline) {
    run.complete = false;
    throw new DeadlinePassed();
  }
}

/**
 * Whether some citizen meets `formula` on a day of `days`. An 'unknown' answer makes the run
 * incomplete (FR-010); it is never taken for 'sat' or 'unsat'. When the deadline caused it, the
 * run stops here (`checkpoint()`), so that nothing more is asked past the deadline
 */
function ask(run: Run, formula: Formula, days: DayRange): Verdict {
  const verdict = askOnce(run, formula, days);
  if (verdict === 'unknown') {
    checkpoint(run);
  }
  return verdict;
}

/**
 * As `ask()`, but it doesn't stop at the deadline: for the last question of a finding, which the
 * run keeps whatever the answer
 */
function askOnce(run: Run, formula: Formula, days: DayRange): Verdict {
  const verdict = satisfiable(formula, days, run.solver);
  if (verdict === 'unknown') {
    run.complete = false;
  }
  return verdict;
}

/** Records a finding, unless the item has one: at most one per item */
function addFinding(run: Run, finding: ItemFinding): void {
  if (!run.findings.has(finding.itemId)) {
    run.findings.set(finding.itemId, finding);
  }
}

// The tree

function treeOf(checked: CheckedBranch): Tree {
  const entries: Entry[] = [];
  const top = entriesOf(checked.items, null, entries);
  return {
    operator: checked.operator,
    top,
    entries,
    formula: levelFormula(
      checked.operator,
      top.map((entry) => entry.formula)
    ),
  };
}

/** The entries of one level, each added to `entries` before its members: display order */
function entriesOf(items: CheckedItem[], parent: Entry | null, entries: Entry[]): Entry[] {
  return items.map((item) => {
    const entry: Entry = {
      item,
      order: entries.length,
      parent,
      members: [],
      formula: true,
      variables: new Set(),
      linked: new Set(),
    };
    entries.push(entry);
    if (item.type === 'rule') {
      entry.formula = item.formula;
    } else {
      entry.members = entriesOf(item.items, entry, entries);
      entry.formula = levelFormula(
        item.operator,
        entry.members.map((member) => member.formula)
      );
    }
    entry.variables = variablesOf(entry.formula);
    entry.linked = countsFromSharing(entry.formula)
      ? new Set([...entry.variables, SHARING_DAY])
      : entry.variables;
    return entry;
  });
}

function levelFormula(operator: Combinator, formulas: Formula[]): Formula {
  return operator === 'and' ? { and: formulas } : { or: formulas };
}

/** The keys of the variables a formula's literals read */
function variablesOf(formula: Formula, found = new Set<string>()): Set<string> {
  if (typeof formula === 'boolean') {
    return found;
  }
  if ('variable' in formula) {
    found.add(formula.variable);
    return found;
  }
  for (const each of 'and' in formula ? formula.and : formula.or) {
    variablesOf(each, found);
  }
  return found;
}

/**
 * Stands for the day of sharing among an entry's `linked` variables. No variable's key is empty,
 * so it can't be one
 */
const SHARING_DAY = '';

/** Whether a formula has a date condition counted from the day of sharing */
function countsFromSharing(formula: Formula): boolean {
  if (typeof formula === 'boolean') {
    return false;
  }
  if ('variable' in formula) {
    return formula.test.kind === 'date' && isRelativeDateTest(formula.test);
  }
  return ('and' in formula ? formula.and : formula.or).some(countsFromSharing);
}

/** The AND of the entries' formulas */
function allOfEntries(entries: readonly Entry[]): Formula {
  return { and: entries.map((entry) => entry.formula) };
}

/** The items of an entry's level, and how it combines them */
function levelOf(tree: Tree, entry: Entry): { operator: Combinator; entries: Entry[] } {
  const holder = entry.parent?.item;
  return entry.parent && holder?.type === 'group'
    ? { operator: holder.operator, entries: entry.parent.members }
    : { operator: tree.operator, entries: tree.top };
}

/**
 * A(X), the item's AND-context (research R4), in display order: along the path from the item up
 * to the top level, the siblings of each item on it whose level combines with AND. The siblings
 * in a level combined with OR are its alternatives, which conflicts don't read
 */
function andContextOf(tree: Tree, entry: Entry): Entry[] {
  const context: Entry[] = [];
  for (let on: Entry | null = entry; on; on = on.parent) {
    const level = levelOf(tree, on);
    if (level.operator === 'and') {
      context.push(...level.entries.filter((sibling) => sibling !== on));
    }
  }
  return context.sort((first, second) => first.order - second.order);
}

/**
 * Whether the entries, with `joined`, are linked by the variables they share: a smallest set
 * that can't be met is, since parts that share no variable are met or not on their own on one day.
 * Over a range of days, `linkedOf` adds the day of sharing (`Entry.linked`)
 */
function connected(
  entries: readonly Entry[],
  joined: Entry | null,
  linkedOf: (entry: Entry) => ReadonlySet<string> = (entry) => entry.variables
): boolean {
  const left = joined ? [...entries] : entries.slice(1);
  const first = joined ?? entries[0];
  if (!first) {
    return true;
  }
  const reached = new Set(linkedOf(first));
  let grew = true;
  while (left.length > 0 && grew) {
    grew = false;
    for (let index = left.length - 1; index >= 0; index -= 1) {
      const entry = left[index];
      const linked = linkedOf(entry);
      if ([...linked].some((key) => reached.has(key))) {
        linked.forEach((key) => reached.add(key));
        left.splice(index, 1);
        grew = true;
      }
    }
  }
  return left.length === 0;
}

// Smallest sets (research R8)

/** The questions a smallest-set search has asked for one item (`SEARCH_QUESTIONS_PER_ITEM`) */
interface Budget {
  questions: number;
  /** The sets looked at, asked about or not */
  sets: number;
}

/**
 * The sets a search may look at per item, besides its questions: the sets it skips cost no
 * question, but looking at them takes time
 */
const SETS_PER_ITEM = 32 * SEARCH_QUESTIONS_PER_ITEM;

/** Whether a set is what a search looks for */
type SetAnswer = 'yes' | 'no' | 'unknown';

/**
 * What a smallest-set search found: the set; 'none' when no set is one, which is certain;
 * 'unknown' when no set was found but an answer was 'unknown'; 'budget' when the budget ran out
 * first
 */
type SearchResult = Entry[] | 'none' | 'unknown' | 'budget';

/**
 * The first set of `pool` that `accepts` answers 'yes' for, trying sets of growing size, and the
 * sets of one size in display order, so that ties go to the earlier items. Sets that `linked`
 * rejects, those not linked by their variables (`connected()`), are skipped without a question: a
 * smallest set always is. `accepts` asks its questions through `budget`; once it is spent, the
 * search returns 'budget', and the caller settles for a minimal set. The deadline unwinds the
 * search
 */
function smallestSet(
  run: Run,
  pool: readonly Entry[],
  linked: (set: Entry[]) => boolean,
  budget: Budget,
  accepts: (set: Entry[]) => SetAnswer
): SearchResult {
  let uncertain = false;
  for (let size = 1; size <= pool.length; size += 1) {
    for (const set of subsetsOf(pool, size)) {
      if (budget.questions >= SEARCH_QUESTIONS_PER_ITEM || budget.sets >= SETS_PER_ITEM) {
        return 'budget';
      }
      budget.sets += 1;
      if (!linked(set)) {
        continue;
      }
      checkpoint(run);
      const answer = accepts(set);
      if (answer === 'yes') {
        return set;
      }
      uncertain ||= answer === 'unknown';
    }
  }
  return uncertain ? 'unknown' : 'none';
}

/** The subsets of `pool` of `size` items, each in pool order, in lexicographic order */
function* subsetsOf<T>(pool: readonly T[], size: number): Generator<T[]> {
  const indices = Array.from({ length: size }, (_, index) => index);
  while (true) {
    yield indices.map((index) => pool[index]);
    let at = size - 1;
    while (at >= 0 && indices[at] === pool.length - size + at) {
      at -= 1;
    }
    if (at < 0) {
      return;
    }
    indices[at] += 1;
    for (let next = at + 1; next < size; next += 1) {
      indices[next] = indices[next - 1] + 1;
    }
  }
}

/**
 * A minimal set: drops the members of `set` from the last to the first, as long as `unmet` still
 * answers 'unsat' without the member, so that the earlier items stay. `unmet` answers 'unsat' for
 * `set`, and for every set that contains a set it answers 'unsat' for, so dropping a member later
 * never makes a member kept before droppable: each member kept is needed
 */
function minimalSet(run: Run, set: readonly Entry[], unmet: (set: Entry[]) => Verdict): Entry[] {
  let kept = [...set];
  for (let index = kept.length - 1; index >= 0 && kept.length > 1; index -= 1) {
    checkpoint(run);
    const without = kept.filter((_, at) => at !== index);
    if (unmet(without) === 'unsat') {
      kept = without;
    }
  }
  return kept;
}

// Step 1: can the branch be met today? (FR-004, FR-008)

function branchStep(run: Run): void {
  const { tree } = run;
  run.meetable = ask(run, tree.formula, run.today);
  if (run.meetable === 'unsat') {
    run.notice = { kind: 'none_can_meet', today: laterToo(run, tree.formula) };
  }
}

/**
 * Whether some citizen meets `formula` on a day after today, for the `today` of a finding that
 * holds today (FR-008). When that isn't certain, true: the words "who shares today" are true
 * either way
 */
function laterToo(run: Run, formula: Formula): boolean {
  return askOnce(run, formula, run.later) !== 'unsat';
}

// Step 2: conflicts (FR-003, FR-008)

function conflictStep(run: Run): void {
  for (const entry of run.tree.entries) {
    checkpoint(run);
    run.conflicts.set(entry.item.id, conflictOf(run, entry));
  }
}

/** Whether an item can be met on its own today */
function ownVerdict(run: Run, entry: Entry): Verdict {
  let verdict = run.ownVerdicts.get(entry.item.id);
  if (verdict === undefined) {
    verdict = ask(run, entry.formula, run.today);
    run.ownVerdicts.set(entry.item.id, verdict);
  }
  return verdict;
}

/**
 * Whether the item belongs to a minimal set of A(X) ∪ {X} that can't be met today (research R4),
 * with its finding when it does
 */
function conflictOf(run: Run, entry: Entry): ConflictAnswer {
  const own = ownVerdict(run, entry);
  if (own === 'unknown') {
    return 'unknown';
  }
  if (own === 'unsat') {
    addFinding(run, onItsOwn(run, entry));
    return 'conflicting';
  }
  const candidates = candidatesOf(run, entry);
  if (candidates.length === 0) {
    return 'clear';
  }
  if (ask(run, allOfEntries([...candidates, entry]), run.today) === 'sat') {
    return 'clear';
  }
  const found = conflictSet(run, entry, candidates);
  if (typeof found === 'string') {
    return found;
  }
  addFinding(
    run,
    conflicting(entry, { type: 'with', items: found.map((each) => each.item.id) }, () =>
      laterToo(run, allOfEntries([...found, entry]))
    )
  );
  return 'conflicting';
}

/**
 * The candidates for T (research R8, step 2): the items of A(X) that share a variable with X,
 * directly or through other candidates, in display order. An item that can't be met on its own
 * never is one, because T must be meetable (FR-003's last sentence)
 */
function candidatesOf(run: Run, entry: Entry): Entry[] {
  const pool = andContextOf(run.tree, entry).filter((each) => each.variables.size > 0);
  const reached = new Set(entry.variables);
  const chosen = new Set<Entry>();
  let grew = true;
  while (grew) {
    grew = false;
    for (const each of pool) {
      if (chosen.has(each) || ![...each.variables].some((key) => reached.has(key))) {
        continue;
      }
      if (ownVerdict(run, each) !== 'sat') {
        continue;
      }
      chosen.add(each);
      each.variables.forEach((key) => reached.add(key));
      grew = true;
    }
  }
  return pool.filter((each) => chosen.has(each));
}

/**
 * A smallest T among the candidates that can be met today while T ∧ X can't, ties going to the
 * earlier items; past the budget, a minimal one. 'clear' when there is none, 'unknown' when that
 * isn't certain. The candidates together and X can't be met
 */
function conflictSet(run: Run, entry: Entry, candidates: Entry[]): Entry[] | ConflictAnswer {
  // When the candidates can be met together, so can every set of them: one question per set
  const allMet = ask(run, allOfEntries(candidates), run.today) === 'sat';
  const unmet: Set<Entry>[] = [];
  const budget: Budget = { questions: 0, sets: 0 };
  const question = (set: Entry[]) => {
    budget.questions += 1;
    return ask(run, allOfEntries(set), run.today);
  };
  const found = smallestSet(
    run,
    candidates,
    (set) => connected(set, entry),
    budget,
    (set) => {
      if (unmet.some((known) => [...known].every((each) => set.includes(each)))) {
        return 'no';
      }
      const withIt = question([...set, entry]);
      if (withIt === 'sat') {
        return 'no';
      }
      if (allMet || withIt === 'unknown') {
        return withIt === 'unsat' ? 'yes' : 'unknown';
      }
      const alone = question(set);
      if (alone === 'unsat') {
        unmet.push(new Set(set));
      }
      return alone === 'sat' ? 'yes' : alone === 'unsat' ? 'no' : 'unknown';
    }
  );
  if (found === 'none') {
    return 'clear';
  }
  if (found !== 'budget') {
    return found;
  }
  return minimalConflictSet(run, entry, candidates, allMet);
}

/**
 * Past the budget (research R8, step 2): a set of candidates that can be met, the candidates
 * together when they can be, or else as many as can be met together, each taken in display order
 * when it can be met with those before it. When it and X can't be met together, a minimal T in
 * it, still a true reason though perhaps not the smallest. Otherwise the search couldn't tell:
 * 'unknown', and the run is incomplete
 */
function minimalConflictSet(
  run: Run,
  entry: Entry,
  candidates: Entry[],
  allMet: boolean
): Entry[] | ConflictAnswer {
  let met = candidates;
  if (!allMet) {
    met = [];
    for (const candidate of candidates) {
      checkpoint(run);
      if (ask(run, allOfEntries([...met, candidate]), run.today) === 'sat') {
        met.push(candidate);
      }
    }
  }
  if (met.length === 0 || ask(run, allOfEntries([...met, entry]), run.today) !== 'unsat') {
    run.complete = false;
    return 'unknown';
  }
  return minimalSet(run, met, (set) => ask(run, allOfEntries([...set, entry]), run.today));
}

/**
 * The finding of an item that can't be met on its own (T = ∅): a rule's condition, or a group's
 * members. Today only when it can be met on a later day (FR-008)
 */
function onItsOwn(run: Run, entry: Entry): ConflictingFinding {
  if (entry.item.type === 'rule') {
    return conflicting(entry, { type: 'condition' }, () => laterToo(run, entry.formula));
  }
  const { operator } = entry.item;
  if (operator === 'or') {
    // None of its members can be met, and the group can be met on a later day when one can
    return conflicting(
      entry,
      { type: 'members', operator, items: entry.members.map((member) => member.item.id) },
      () => laterToo(run, entry.formula)
    );
  }
  const members = unmetMembers(run, entry);
  return conflicting(
    entry,
    { type: 'members', operator, items: members.map((member) => member.item.id) },
    () => laterToo(run, allOfEntries(members))
  );
}

/**
 * A smallest set of an AND group's members that can't be met together today, ties going to the
 * earlier members; past the budget, a minimal one. The group can't be met, so there is one: all
 * its members, when an 'unknown' answer hides the others
 */
function unmetMembers(run: Run, entry: Entry): Entry[] {
  const budget: Budget = { questions: 0, sets: 0 };
  const question = (set: Entry[]) => {
    budget.questions += 1;
    return ask(run, allOfEntries(set), run.today);
  };
  const found = smallestSet(
    run,
    entry.members,
    (set) => connected(set, null),
    budget,
    (set) => {
      const verdict = question(set);
      return verdict === 'unsat' ? 'yes' : verdict === 'sat' ? 'no' : 'unknown';
    }
  );
  if (typeof found !== 'string') {
    return found;
  }
  return minimalSet(run, entry.members, (set) => ask(run, allOfEntries(set), run.today));
}

/** A conflicting finding; `today()` is asked once the reason is known */
function conflicting(
  entry: Entry,
  reason: ConflictingReason,
  today: () => boolean
): ConflictingFinding {
  return { itemId: entry.item.id, kind: 'conflicting', reason, today: today() };
}

// Step 3: does every citizen meet the branch? (FR-006, FR-008)

/**
 * The notice `all_meet` when no citizen fails to meet the branch on any day from today to
 * 9999-12-31. Asked only when step 1 found the branch meetable today; the branch has checked
 * rules, or no step runs
 */
function allMeetStep(run: Run): void {
  if (run.meetable !== 'sat') {
    return;
  }
  if (ask(run, negate(run.tree.formula), run.fromToday) === 'unsat') {
    run.notice = { kind: 'all_meet', today: false };
  }
}

// Step 4: always met and redundant (FR-005, FR-006)

/**
 * An item of the working tree (research R8, step 4): the branch without the items found redundant
 * so far. A group left with one member is that member, in the group's place, and a group left
 * with none is left out, as the rules step's deletions do
 */
interface WorkNode {
  entry: Entry;
  /** The group that holds it in the working tree, or null at the top level */
  parent: WorkNode | null;
  /** A group's members left, at least two. Empty for a rule */
  members: WorkNode[];
  /** Its formula in the working tree */
  formula: Formula;
}

/** The working tree, rebuilt after each deletion */
interface WorkingTree {
  /** The top level's items left */
  top: WorkNode[];
  /** Every item left, by id; a group dissolved into its one member isn't among them */
  byId: Map<string, WorkNode>;
}

/** What step 4 keeps while it visits the items */
interface Visit {
  /** The ids of the items found redundant so far */
  deleted: Set<string>;
  work: WorkingTree;
  /** The groups that hold a conflicting item: they get no finding of step 4 (data-model.md, 3) */
  holdingConflicts: ReadonlySet<Entry>;
}

/** An item's level in the working tree: how it combines its items, and the items */
interface WorkLevel {
  operator: Combinator;
  nodes: WorkNode[];
}

/**
 * An item's context in the working tree (research R4), each in display order: A(X), the siblings
 * along the path to the top level whose level combines with AND; O(X), those whose level combines
 * with OR; and the item's own siblings
 */
interface WorkContext {
  and: WorkNode[];
  or: WorkNode[];
  siblings: WorkNode[];
}

/**
 * Step 4 (research R8): visits the items from the last in display order to the first, each group
 * before its members (reverse post-order). It runs only when step 1 found the branch meetable
 * today (FR-005, W4), and skips the items whose conflict answer isn't 'clear' with everything
 * inside them: conflicting items, and those whose question came back 'unknown' (step 5). An item
 * that is always met, or redundant, gets its finding, and its members are skipped; otherwise they
 * are visited. A group that holds a conflicting item gets no finding, so that no finding is inside
 * a redundant or always-met group (data-model.md, invariant 3), but its members are visited
 */
function redundancyStep(run: Run): void {
  if (run.meetable !== 'sat') {
    return;
  }
  const deleted = new Set<string>();
  const visit: Visit = {
    deleted,
    work: workingTreeOf(run.tree, deleted),
    holdingConflicts: conflictHolders(run),
  };
  visitLevel(run, visit, run.tree.top);
}

/** Visits the entries of one level from the last to the first, each before its members */
function visitLevel(run: Run, visit: Visit, entries: readonly Entry[]): void {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    checkpoint(run);
    if (run.conflicts.get(entry.item.id) !== 'clear') {
      continue;
    }
    const answer = visit.holdingConflicts.has(entry) ? 'visit' : differenceOf(run, visit, entry);
    if (answer === 'visit') {
      visitLevel(run, visit, entry.members);
    }
  }
}

/** The groups that hold a conflicting item, at any depth */
function conflictHolders(run: Run): Set<Entry> {
  const holders = new Set<Entry>();
  for (const entry of run.tree.entries) {
    if (run.findings.get(entry.item.id)?.kind === 'conflicting') {
      for (let on = entry.parent; on; on = on.parent) {
        holders.add(on);
      }
    }
  }
  return holders;
}

/**
 * Whether the item makes a difference: 'found' when it got an always-met or redundant finding,
 * 'visit' when it makes one, so that its members are visited, 'skip' when that isn't certain
 */
function differenceOf(run: Run, visit: Visit, entry: Entry): 'found' | 'visit' | 'skip' {
  const node = visit.work.byId.get(entry.item.id);
  if (!node) {
    // Not reached: an item is visited before anything inside it can be deleted
    return 'skip';
  }
  // Always met (FR-006): no citizen fails to meet it on any day from today on, also in a level
  // combined with OR
  const failed = ask(run, negate(node.formula), run.fromToday);
  if (failed === 'unsat') {
    addFinding(run, { itemId: entry.item.id, kind: 'always_met', reason: null, today: false });
    return 'found';
  }
  if (failed === 'unknown') {
    return 'skip';
  }
  const level = workLevelOf(run.tree, visit.work, node);
  if (level.nodes.length < 2) {
    // The top level's only item: deleting it leaves no rules, which every citizen meets, so it
    // is redundant only when it is always met, which is reported instead (research R4)
    return 'visit';
  }
  const context = workContextOf(run.tree, visit.work, node);
  const changed = ask(run, redundancyQuestion(node, level.operator, context), run.fromToday);
  if (changed !== 'unsat') {
    return changed === 'sat' ? 'visit' : 'skip';
  }
  const reason = redundantReason(run, visit.work, node, level.operator, context);
  addFinding(run, { itemId: entry.item.id, kind: 'redundant', reason, today: false });
  visit.deleted.add(entry.item.id);
  visit.work = workingTreeOf(run.tree, visit.deleted);
  return 'found';
}

/**
 * The citizens for whom deleting the item changes whether the branch is met (research R4):
 * `pivotal(X) ∧ ¬X` in a level combined with AND, `pivotal(X) ∧ X` with OR, where
 * `pivotal(X) = ⋀A(X) ∧ ¬⋁O(X)`. The item is redundant when no citizen meets it
 */
function redundancyQuestion(node: WorkNode, operator: Combinator, context: WorkContext): Formula {
  return {
    and: [
      ...context.and.map((each) => each.formula),
      ...context.or.map((each) => negate(each.formula)),
      operator === 'and' ? negate(node.formula) : node.formula,
    ],
  };
}

/** The working tree: the checked tree without the items of `deleted` */
function workingTreeOf(tree: Tree, deleted: ReadonlySet<string>): WorkingTree {
  const byId = new Map<string, WorkNode>();
  const nodesOf = (entries: readonly Entry[], parent: WorkNode | null): WorkNode[] => {
    const nodes: WorkNode[] = [];
    for (const entry of entries) {
      if (deleted.has(entry.item.id)) {
        continue;
      }
      const node: WorkNode = { entry, parent, members: [], formula: entry.formula };
      if (entry.item.type === 'group') {
        node.members = nodesOf(entry.members, node);
        if (node.members.length === 0) {
          continue;
        }
        if (node.members.length === 1) {
          const [only] = node.members;
          only.parent = parent;
          nodes.push(only);
          continue;
        }
        node.formula = levelFormula(
          entry.item.operator,
          node.members.map((member) => member.formula)
        );
      }
      byId.set(entry.item.id, node);
      nodes.push(node);
    }
    return nodes;
  };
  return { top: nodesOf(tree.top, null), byId };
}

/** The level that holds a node in the working tree */
function workLevelOf(tree: Tree, work: WorkingTree, node: WorkNode): WorkLevel {
  const holder = node.parent?.entry.item;
  return node.parent && holder?.type === 'group'
    ? { operator: holder.operator, nodes: node.parent.members }
    : { operator: tree.operator, nodes: work.top };
}

/** A(X), O(X) and the siblings of a node in the working tree, each in display order */
function workContextOf(tree: Tree, work: WorkingTree, node: WorkNode): WorkContext {
  const context: WorkContext = { and: [], or: [], siblings: [] };
  for (let on: WorkNode | null = node; on; on = on.parent) {
    const level = workLevelOf(tree, work, on);
    const others = level.nodes.filter((sibling) => sibling !== on);
    if (on === node) {
      context.siblings = others;
    }
    context[level.operator].push(...others);
  }
  for (const nodes of [context.and, context.or, context.siblings]) {
    nodes.sort((first, second) => first.entry.order - second.entry.order);
  }
  return context;
}

/**
 * Why a redundant item is redundant (research R8, step 4), as smallest sets in the working tree,
 * ties going to the earlier items:
 * - in a level combined with AND, the smallest S ⊆ A(X) with S ⇒ X (`implied_by`);
 * - in a level combined with OR, the smallest R among X's siblings with X ⇒ ⋁R (`implies`);
 * - `same` when S or R is one item Y, and X and Y imply each other;
 * - otherwise through an enclosing level: S ⊆ A(X) and R ⊆ O(X), with at least one item of R,
 *   such that S ∧ ¬⋁R ⇒ X (`implied_by` with `orItems`, in an AND level), or X ∧ S ⇒ ⋁R
 *   (`implies` with `givenItems`, in an OR level).
 *
 * Past the budget, or when no set linked by its variables is one, a minimal set of the whole
 * pool, still a true reason. The whole context always is one, since the item is redundant
 */
function redundantReason(
  run: Run,
  work: WorkingTree,
  node: WorkNode,
  operator: Combinator,
  context: WorkContext
): RedundantReason {
  const budget: Budget = { questions: 0, sets: 0 };
  const formulaOf = (entry: Entry): Formula => work.byId.get(entry.item.id)?.formula ?? true;
  const inOr = new Set(context.or.map((each) => each.entry));
  const idsOf = (set: readonly Entry[]) => set.map((each) => each.item.id);
  // Each item of a set as the question reads it: an AND-context item as it is, an alternative
  // negated; and X, negated in an AND level
  const question = (set: readonly Entry[]): Verdict =>
    ask(
      run,
      {
        and: [
          ...set.map((each) => (inOr.has(each) ? negate(formulaOf(each)) : formulaOf(each))),
          operator === 'and' ? negate(node.formula) : node.formula,
        ],
      },
      run.fromToday
    );
  const implies = (first: WorkNode, second: Entry) =>
    ask(run, { and: [first.formula, negate(formulaOf(second))] }, run.fromToday) === 'unsat';
  const entriesOf = (nodes: readonly WorkNode[]) => nodes.map((each) => each.entry);

  const direct = reasonSet(
    run,
    node.entry,
    entriesOf(operator === 'and' ? context.and : context.siblings),
    budget,
    question,
    () => true
  );
  if (direct) {
    const [only] = direct;
    // X ⇒ Y in an AND level, Y ⇒ X in an OR level: the other way round of what the set shows
    const other = work.byId.get(only.item.id);
    if (
      direct.length === 1 &&
      other &&
      (operator === 'and' ? implies(node, only) : implies(other, node.entry))
    ) {
      return { type: 'same', item: only.item.id };
    }
    return operator === 'and'
      ? { type: 'implied_by', items: idsOf(direct), orItems: [] }
      : { type: 'implies', items: idsOf(direct), givenItems: [] };
  }
  const pool = entriesOf([...context.and, ...context.or]).sort(
    (first, second) => first.order - second.order
  );
  const hasAlternative = (set: readonly Entry[]) => set.some((each) => inOr.has(each));
  const enclosing = reasonSet(run, node.entry, pool, budget, question, hasAlternative) ?? pool;
  const inContext = idsOf(enclosing.filter((each) => !inOr.has(each)));
  const alternatives = idsOf(enclosing.filter((each) => inOr.has(each)));
  return operator === 'and'
    ? { type: 'implied_by', items: inContext, orItems: alternatives }
    : { type: 'implies', items: alternatives, givenItems: inContext };
}

/**
 * The smallest set of `pool` for which `question` is 'unsat', among the sets `allowed` accepts,
 * linked with `entry` by their variables and the day of sharing; past the budget, or when none of
 * those is, a minimal set of the whole pool when the whole pool is one. Null when there is none,
 * or that isn't certain
 */
function reasonSet(
  run: Run,
  entry: Entry,
  pool: readonly Entry[],
  budget: Budget,
  question: (set: readonly Entry[]) => Verdict,
  allowed: (set: readonly Entry[]) => boolean
): Entry[] | null {
  const found = smallestSet(
    run,
    pool,
    (set) => connected(set, entry, (each) => each.linked),
    budget,
    (set) => {
      if (!allowed(set)) {
        return 'no';
      }
      budget.questions += 1;
      const verdict = question(set);
      return verdict === 'unsat' ? 'yes' : verdict === 'sat' ? 'no' : 'unknown';
    }
  );
  if (typeof found !== 'string') {
    return found;
  }
  if (pool.length === 0 || !allowed(pool) || question(pool) !== 'unsat') {
    return null;
  }
  return minimalSet(run, pool, (set) => (allowed(set) ? question(set) : 'sat'));
}
