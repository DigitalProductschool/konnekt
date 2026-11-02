// The brute-force oracle (specs/003-rule-consistency-checks, SC-001, SC-002; research R13): seeded
// random branches (`randomBranch()`), and the answers to the questions of research R4 found by
// enumerating every applicant and every day of sharing of a domain small enough to enumerate and
// large enough to stand for every applicant and every day from 0001-01-01 to 9999-12-31
// (`oracleOf()`). The solver's and the findings' tests compare their answers with it. Only tests
// import it.
//
// Independence: every answer comes from evaluating real applicants on real days with
// ../evaluation.ts, the port of the evaluator that Python's vectors pin: `ruleOutcome()` sorts a
// field's values by their outcomes, and `evaluateBranch()` gives each combination's items and
// branch. The deletion questions recombine a combination's rule outcomes with `levelMet()`, a
// port of `_level_met()` that every evaluation checks against `evaluateBranch()` on the whole
// tree, as it checks each rule's outcome against its field's vector. Nothing here uses the
// theories, the solver or literals.ts. calendar.ts' `yearsAfter()` and `monthsAfter()`, the
// evaluator's own arithmetic, only place the dates and days that are enumerated; the threshold of
// "N years ago" is found by bisection over `yearsAfter()`, not with `yearsAgoThreshold()`, which
// the date theory uses. `buildCheckedBranch()` is called only to check that a generated branch is
// checked whole (`checkedBranchOf()`).
//
// Why the domain stands for every applicant and every day:
// - Fields. Each rule reads one field: the licence's classes and the classes' dates are both read
//   from `driving_privileges`, which is therefore one field here, so that a class's date exists
//   exactly when the class is listed (FR-007, fifth bullet). Fields don't constrain each other
//   (FR-007), and every applicant gives every field a rule checks (FR-009). Two values of a field
//   whose outcomes agree for every rule on it are interchangeable, since an item's outcome
//   depends only on its rules' outcomes. So on a day d, the applicants that matter are, per
//   field, one value for each vector of outcomes its values can have on d, combined in every way.
//   Each combination is evaluated once with `evaluateBranch()`. A rule on the classes reads only
//   the classes listed, and one on class K's date only K's entry or that K isn't listed, so the
//   licence's values are found per set of classes and per date of each class
//   (`privilegesValues()`).
// - Numbers: 0 to the largest constant rounded up, plus 2. Applicants hold whole numbers from 0
//   (research R3); every whole number above every constant compares with each constant alike.
// - Enums: every value of the set, or every non-empty set of its values for a field that holds
//   several (research R9), such as the licence's classes. The generated rules use three values.
// - Texts: every string of one to four units of `TEXT_UNITS`, 7380 texts. A rule compares the text
//   as written (stripped and in NFC) or folded (ignoring letter case) with its own text, by
//   equality or containment. The generated rules' texts are one or two of a, A, b and ß, so the
//   text as written matters only through where a, A, b and ß occur in it, and the folded text only
//   through where a, b and s occur (ß folds to "ss"); every other character only separates. Each
//   character, with the combining marks after it, adds to the two forms what one or two of the
//   units add: a (a | a), A (A | a), b (b | b), B (- | b), s (- | s; also S and ſ), ß (ß | ss; ẞ
//   adds - | ss, as "ss" does), ß followed by a mark that composes with s, such as U+0307
//   (ß - | s -: the second NFC turns the folded "ss" and the mark into s and ṡ), ẚ U+1E9A
//   (- | a -, since it folds to a and U+02BE; ﬅ and ﬆ add - | s -, as "s" and "x" do), and x (- |
//   -) for every other character, an accented letter included, which folds to another one.
//   testOracle.test.ts checks this table for every code point up to U+1FFFF (none beyond folds;
//   a scan of all of them, while writing this, found nothing more), and for a, A, b, B, s, S, ſ, ß,
//   ẞ, ẚ, ﬅ and ﬆ followed by every combining mark. Four units suffice because a branch has at most
//   two text rules (`MAX_TEXT_RULES`) with texts of one or two letters. Each asks the text to
//   equal, not equal, contain or not contain its text in its form. A text that must equal one is
//   made of units that add no separator, each at least one letter of it: at most two units as
//   written, four folded ("ßß" folds to "ssss", which "ssss" also folds to). Otherwise, two texts
//   that must be contained are met by both side by side, four units. One that must be contained
//   next to one that must not equal is met by its own letters, followed by x if they are equal.
//   One that must be contained next to one that must not be contained is met by the shortest run
//   of units of any text meeting both whose form contains it, at most four units: that run's
//   forms are parts of that text's forms. And texts that must be neither equal nor contained are
//   met by x. `oracleOf()` refuses a branch outside these bounds rather than answer for it
// - Dates on one day d: each rule is met by one interval of dates. "Before F" is [first, F - 1],
//   "after F" [F + 1, last], "on F" [F, F]. "At least N years ago" is [first, L_N(d)], where
//   L_N(d) is the latest date whose N-th anniversary (`yearsAfter()`) falls on or before d; "less
//   than" is [L_N(d) + 1, last], and "exactly" [L_{N+1}(d) + 1, L_N(d)]. "At least N months or
//   years from now" is [A(d), last] with A(d) = `monthsAfter()` or `yearsAfter()` of d, and "less
//   than" [first, A(d) - 1]. The intervals cut the calendar into runs of dates that meet the same
//   rules, and each run starts at 0001-01-01 or at one of F, F + 1, L_N(d) + 1 and A(d). The
//   oracle takes those starts with their neighbours (F - 1 to F + 2, L_N(d) to L_N(d) + 2, A(d) - 1
//   to A(d) + 1) and 9999-12-31, so an off-by-one in this reasoning would change nothing
// - Days: which outcomes a field's dates can have together on day d depends only on the order of
//   those starts. F and F + 1 stay put; L_N(d) + 1 and A(d) move with d and never decrease
//   (calendar.ts). L_N(d) reaches a date q exactly from the day `yearsAfter(q, N)` on, and the
//   oracle takes those days for q = 0001-01-01, F - 1 to F + 2 and 9999-12-31 (on which L_N jumps
//   there). A(d) reaches q on the first day found by bisection, which it takes for q = F - 1 to
//   F + 2 and 9999-12-31. Moving starts don't pass each other: L_N(d) lies before d and A(d) after
//   it, and different counts stay at least 28 days apart (research R6) until A(d) reaches
//   9999-12-31, where it stays. So every stretch of days on which the order stays the same starts
//   on one of those days (`eventDays`) or at the start of the range asked about, and the oracle
//   answers for a range from those days alone. Its answer is exact for every range, in particular
//   for today alone, the later days and every day from today on (research R4). testOracle.test.ts
//   compares the dates with every date from 3 years before to 2 years after the day, and the days
//   with single days around them
import type {
  BranchInput,
  Combinator,
  Condition,
  GroupItem,
  Mark,
  RuleItem,
  RuleTreeItem,
} from '../../../types/form-connections';
import { LICENCE_CLASSES_SET, OPERATORS } from '../constants';
import {
  type Applicant,
  type BranchEvaluation,
  evaluateBranch,
  type EvaluatedBranch,
  type EvaluatedItem,
  type Outcome,
  ruleOutcome,
} from '../evaluation';
import { MDL, PID, rule, target } from '../testData';
import { effectiveItems } from '../tree';
import type { RuleContext, RuleDocument } from '../types';
import { dayNumber, isDayNumber, isoDate, monthsAfter, yearsAfter } from './calendar';
import { buildCheckedBranch, type KeyedBranch } from './checkedTree';
import { FIRST_DAY, LAST_DAY } from './constants';
import type { CheckedBranch, DayRange } from './types';

// The context and the day

/**
 * Today in Germany for every generated branch: three days before a 29 February, so that the days
 * after it cross a month's end and a leap day, and the dates a year back do not have one
 */
export const ORACLE_TODAY = '2028-02-26';

/** `ORACLE_TODAY` as a day number */
export const ORACLE_TODAY_DAY = dayNumber(ORACLE_TODAY);

/** Every day from today on: the days of the always-met and redundancy questions (research R4) */
export const FROM_TODAY: DayRange = { from: ORACLE_TODAY_DAY, to: LAST_DAY };

/** The days after today: whether a conflict holds on later days (FR-008) */
export const LATER_DAYS: DayRange = { from: ORACLE_TODAY_DAY + 1, to: LAST_DAY };

/** The id that stands for the branch itself among the item ids a question takes */
export const BRANCH = 'branch';

/** The fields the generated rules check, as the requested documents give them */
const PID_FIELDS = ['family_name', 'birthdate', 'date_of_expiry', 'sex'];
const MDL_FIELDS = ['height', 'driving_privileges'];

/** The enum's codes and the licence classes: three values each */
const SEX_CODES = [0, 1, 2];
const CLASS_CODES = ['A', 'B', 'C'];

/** A requested document with only the fields named */
function requested(document: RuleDocument, keys: readonly string[]): RuleDocument {
  return { ...document, fields: document.fields.filter((field) => keys.includes(field.key)) };
}

/**
 * The oracle's catalog: the Personal ID's family name (text), date of birth and expiry date
 * (dates) and sex (an enum of three codes), the driving licence's height (number) and licence
 * classes (a set of three values that holds several, with an issue and an expiry date per class)
 */
export const ORACLE_CONTEXT: RuleContext = {
  documents: [requested(PID, PID_FIELDS), requested(MDL, MDL_FIELDS)],
  optionSets: [
    {
      key: 'sex',
      options: SEX_CODES.map((value) => ({ value, label: `Code ${value}`, description: null })),
    },
    {
      key: LICENCE_CLASSES_SET,
      options: CLASS_CODES.map((value) => ({ value, label: value, description: null })),
    },
  ],
};

// The generated branches

/** A generated branch: a `BranchInput` with the rules step's key, which names its seed */
export interface GeneratedBranch extends BranchInput {
  /** `seed-<seed>` */
  key: string;
  seed: number;
}

/** What the generated rules check */
type Slot = 'number' | 'enum' | 'classes' | 'class_date' | 'text' | 'birthdate' | 'expiry';

const SLOTS: readonly Slot[] = [
  'number',
  'enum',
  'classes',
  'class_date',
  'text',
  'birthdate',
  'expiry',
];

/** Rules per branch, and variables per branch */
const FEWEST_RULES = 2;
const MOST_RULES = 8;
const MOST_SLOTS = 4;

/** The most text rules per branch, for which the oracle's texts suffice (see the module comment) */
export const MAX_TEXT_RULES = 2;

/**
 * The most rules per variable: two on the text, four on a date, whose days and dates to try grow
 * with the product of its fixed dates and its counts, and eight on the others
 */
const MOST_RULES_PER_SLOT: Record<Slot, number> = {
  number: MOST_RULES,
  enum: MOST_RULES,
  classes: MOST_RULES,
  class_date: 4,
  text: MAX_TEXT_RULES,
  birthdate: 4,
  expiry: 4,
};

/** Number constants: whole numbers 0 to 5, and sometimes a decimal (EC "Whole numbers") */
const NUMBER_CONSTANTS = [0, 1, 2, 3, 4, 5];
const DECIMAL_CONSTANTS = [0.5, 2.5, 4.5];
const DECIMAL_CHANCE = 0.15;

/** Code points that the texts are written with */
const SHARP_S = String.fromCodePoint(0xdf);
const COMBINING_DOT_ABOVE = String.fromCodePoint(0x307);
const A_WITH_RIGHT_HALF_RING = String.fromCodePoint(0x1e9a);

/** The letters of the rules' texts, which are one or two letters long */
export const TEXT_LETTERS: readonly string[] = ['a', 'A', 'b', SHARP_S];
const LONGEST_RULE_TEXT = 2;

/**
 * The units of the applicants' texts (see the module's comment): a, A, b, B, s, ß, ß with U+0307,
 * ẚ (U+1E9A) and x, which stands for every other character
 */
export const TEXT_UNITS: readonly string[] = [
  'a',
  'A',
  'b',
  'B',
  's',
  SHARP_S,
  SHARP_S + COMBINING_DOT_ABOVE,
  A_WITH_RIGHT_HALF_RING,
  'x',
];

/** The most units an applicant's text has: the rules' texts' total length */
const MOST_TEXT_UNITS = MAX_TEXT_RULES * LONGEST_RULE_TEXT;

/**
 * The dates the fixed dates are drawn near: today, and where today's thresholds lie (one to three
 * years ago, one and two months and one and two years from now), each moved by up to
 * `DATE_SHIFT` days, so that a fixed date meets a threshold on some day near today
 */
const DATE_ANCHORS = [
  '2028-02-26',
  '2027-02-26',
  '2026-02-26',
  '2025-02-26',
  '2028-03-26',
  '2028-04-26',
  '2029-02-26',
  '2030-02-26',
];
const DATE_SHIFT = 3;

/** Counts of "N years ago", and of "N months or years from now" (12 months is 1 year) */
const YEAR_COUNTS = [1, 2];
const FROM_NOW_COUNTS: readonly FromNow[] = [
  { amount: 1, unit: 'months' },
  { amount: 2, unit: 'months' },
  { amount: 12, unit: 'months' },
  { amount: 1, unit: 'years' },
  { amount: 2, unit: 'years' },
];

/** How a text rule sets its letter case: on, off, or absent, which counts as off */
const MATCH_CASES: readonly (boolean | null)[] = [true, false, null];

/** The shape: levels, how often a run of items becomes a group, and its size */
const MOST_LEVELS = 3;
const GROUP_CHANCE = 0.4;
const MOST_GROUP_RULES = 4;

/** Based branches: how often, the marks' chances, and how many tries to keep two rules */
const BASED_CHANCE = 0.3;
const REMOVED_CHANCE = 0.15;
const CHANGED_CHANCE = 0.1;
const ADDED_CHANCE = 0.1;
const MARK_TRIES = 10;

/** A count of "N months or years from now" */
interface FromNow {
  amount: number;
  unit: 'years' | 'months';
}

/** A seeded source of random choices */
interface Random {
  /** A number from 0 to below 1 */
  next: () => number;
  /** A whole number from `low` to `high`, both included */
  int: (low: number, high: number) => number;
  pick: <T>(items: readonly T[]) => T;
  chance: (probability: number) => boolean;
}

/** A seeded random source: mulberry32, the same choices for the same seed on every engine */
function randomOf(seed: number): Random {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
  const int = (low: number, high: number): number => low + Math.floor(next() * (high - low + 1));
  return {
    next,
    int,
    pick: (items) => items[int(0, items.length - 1)],
    chance: (probability) => next() < probability,
  };
}

/** The items in a random order */
function shuffled<T>(items: readonly T[], random: Random): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = random.int(0, index);
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

/**
 * A seeded random branch (research R13): one to three levels, each combined with AND or OR, with
 * two to eight complete rules over a few of these variables, mostly one to four, all of them on
 * fields of `ORACLE_CONTEXT`:
 * - the height, a number, against 0 to 5, sometimes 0.5, 2.5 or 4.5;
 * - the sex, an enum of three codes, and the licence classes, a set of three values that holds
 *   several, with one to three of their values;
 * - one class's issue or expiry date (FR-007, fifth bullet), the class drawn once per branch;
 * - the date of birth and the expiry date: fixed dates near today or near today's thresholds, and
 *   1 or 2 years ago, or 1, 2 or 12 months or 1 or 2 years from now;
 * - the family name, at most two rules, with texts of one or two of a, A, b and ß, respecting
 *   letter case, ignoring it, or without the setting.
 * Every operator of `OPERATORS` occurs across seeds. Three branches in ten are based on the main
 * branch, with rules and groups marked removed or changed and rules marked added, keeping at least
 * two rules that count; inherited groups left with one member that counts are dissolved there.
 * Groups are never marked added, so every group that counts has two members. The same seed gives
 * the same branch. Its key is `seed-<seed>`
 */
export function randomBranch(seed: number): GeneratedBranch {
  const random = randomOf(seed);
  const classDate = {
    part: random.pick(['issue_date', 'expiry_date']),
    licenceClass: random.pick(CLASS_CODES),
  };
  const slots = slotsOfRules(random.int(FEWEST_RULES, MOST_RULES), chosenSlots(random), random);
  const rules = slots.map((slot, index) => generatedRule(index + 1, slot, classDate, random));
  const numbering = { group: 0 };
  let items = shaped(rules, 1, random.int(1, MOST_LEVELS), random, numbering);
  const isBased = random.chance(BASED_CHANCE);
  if (isBased) {
    items = markedItems(items, random);
  }
  return {
    id: null,
    name: 'Standard',
    description: null,
    origin: isBased ? 'based' : random.pick(['main', 'empty'] as const),
    operator: random.pick(['and', 'or'] as const),
    operator_mark: isBased && random.chance(CHANGED_CHANCE) ? 'changed' : null,
    items,
    key: `seed-${seed}`,
    seed,
  };
}

/** One to four of the variables; a class's date often comes with the classes */
function chosenSlots(random: Random): Slot[] {
  const slots = shuffled(SLOTS, random).slice(0, random.int(1, MOST_SLOTS));
  if (slots.includes('class_date') && !slots.includes('classes') && random.chance(0.5)) {
    slots.push('classes');
  }
  return slots;
}

/**
 * What each of `count` rules checks: a chosen slot that isn't full, or another one when all of them
 * are (`MOST_RULES_PER_SLOT`)
 */
function slotsOfRules(count: number, chosen: Slot[], random: Random): Slot[] {
  const slots: Slot[] = [];
  const open = (slot: Slot): boolean =>
    slots.filter((each) => each === slot).length < MOST_RULES_PER_SLOT[slot];
  for (let index = 0; index < count; index += 1) {
    let candidates = chosen.filter(open);
    if (candidates.length === 0) {
      const another = random.pick(SLOTS.filter((slot) => !chosen.includes(slot)));
      chosen.push(another);
      candidates = [another];
    }
    slots.push(random.pick(candidates));
  }
  return slots;
}

/** Rule `number`, complete, on its slot's field, with a random condition */
function generatedRule(
  number: number,
  slot: Slot,
  classDate: { part: string; licenceClass: string },
  random: Random
): RuleItem {
  switch (slot) {
    case 'number':
      return rule(number, target('mdl', 'height'), {
        operator: random.pick(OPERATORS.number).operator,
        value: random.chance(DECIMAL_CHANCE)
          ? random.pick(DECIMAL_CONSTANTS)
          : random.pick(NUMBER_CONSTANTS),
      });
    case 'enum':
      return rule(number, target('pid', 'sex'), enumCondition(SEX_CODES, random));
    case 'classes':
      return rule(
        number,
        target('mdl', 'driving_privileges', 'classes'),
        enumCondition(CLASS_CODES, random)
      );
    case 'class_date':
      return rule(
        number,
        target('mdl', 'driving_privileges', classDate.part, classDate.licenceClass),
        dateCondition(random)
      );
    case 'text':
      return rule(number, target('pid', 'family_name'), textCondition(random));
    case 'birthdate':
      return rule(number, target('pid', 'birthdate'), dateCondition(random));
    case 'expiry':
      return rule(number, target('pid', 'date_of_expiry'), dateCondition(random));
  }
}

/** "Includes one of" or "includes none of" one to three of the values, in a random order */
function enumCondition(values: readonly (string | number)[], random: Random): Condition {
  return {
    operator: random.pick(OPERATORS.enum).operator,
    values: shuffled(values, random).slice(0, random.int(1, values.length)),
  };
}

/** A text condition: one or two of `TEXT_LETTERS`, and a letter-case setting or none */
function textCondition(random: Random): Condition {
  const letters = Array.from({ length: random.int(1, LONGEST_RULE_TEXT) }, () =>
    random.pick(TEXT_LETTERS)
  );
  const condition: Condition = {
    operator: random.pick(OPERATORS.text).operator,
    value: letters.join(''),
  };
  const matchCase = random.pick(MATCH_CASES);
  if (matchCase !== null) {
    condition.match_case = matchCase;
  }
  return condition;
}

/** A date condition of any of the date operators */
function dateCondition(random: Random): Condition {
  const { operator, input } = random.pick(OPERATORS.date);
  if (input === 'date') {
    const anchor = dayNumber(random.pick(DATE_ANCHORS));
    return { operator, date: isoDate(anchor + random.int(-DATE_SHIFT, DATE_SHIFT)) };
  }
  if (input === 'years') {
    return { operator, years: random.pick(YEAR_COUNTS) };
  }
  const { amount, unit } = random.pick(FROM_NOW_COUNTS);
  return { operator, amount, unit };
}

/**
 * One level of the tree, from level `level` (1, the top level) down to `deepest`: runs of two to
 * four items become groups, with sub-groups inside them on the third level
 */
function shaped(
  rules: readonly RuleItem[],
  level: number,
  deepest: number,
  random: Random,
  numbering: { group: number }
): RuleTreeItem[] {
  const items: RuleTreeItem[] = [];
  let index = 0;
  while (index < rules.length) {
    const left = rules.length - index;
    if (level < deepest && left >= 2 && random.chance(GROUP_CHANCE)) {
      const size = random.int(2, Math.min(MOST_GROUP_RULES, left));
      items.push(groupOf(rules.slice(index, index + size), level, deepest, random, numbering));
      index += size;
    } else {
      items.push(rules[index]);
      index += 1;
    }
  }
  return items;
}

/** A group of the rules on level `level + 1`, with two members or more */
function groupOf(
  rules: readonly RuleItem[],
  level: number,
  deepest: number,
  random: Random,
  numbering: { group: number }
): GroupItem {
  numbering.group += 1;
  const number = numbering.group;
  let members = shaped(rules, level + 1, deepest, random, numbering);
  if (members.length === 1 && members[0].type === 'group') {
    // Every rule went into one sub-group: it is the group's level itself
    members = members[0].items;
  }
  const operator: Combinator = random.pick(['and', 'or'] as const);
  return {
    type: 'group',
    id: `group-${number}`,
    name: `Group ${String(number).padStart(2, '0')}`,
    mark: null,
    operator,
    message: null,
    items: members,
  };
}

/**
 * The items of a based branch with marks: rules and groups removed or changed, rules added. Tries
 * until at least two rules count, and leaves the items unmarked if no try does
 */
function markedItems(items: RuleTreeItem[], random: Random): RuleTreeItem[] {
  for (let attempt = 0; attempt < MARK_TRIES; attempt += 1) {
    const marked = withMarks(items, random);
    if (countedRules(effectiveItems(marked, true)) >= FEWEST_RULES) {
      return marked;
    }
  }
  return items;
}

/** The items with random marks */
function withMarks(items: readonly RuleTreeItem[], random: Random): RuleTreeItem[] {
  return items.map((item) => {
    const draw = random.next();
    let mark: Mark | null = null;
    if (draw < REMOVED_CHANCE) {
      mark = 'removed';
    } else if (draw < REMOVED_CHANCE + CHANGED_CHANCE) {
      mark = 'changed';
    } else if (item.type === 'rule' && draw < REMOVED_CHANCE + CHANGED_CHANCE + ADDED_CHANCE) {
      mark = 'added';
    }
    return item.type === 'rule'
      ? { ...item, mark }
      : { ...item, mark, items: withMarks(item.items, random) };
  });
}

/** The rules among items that count, at every level */
function countedRules(items: readonly RuleTreeItem[]): number {
  return items.reduce(
    (count, item) =>
      count + (item.type === 'rule' ? 1 : countedRules(effectiveItems(item.items, true))),
    0
  );
}

/**
 * The branch's checked tree for `ORACLE_TODAY`, which the solver's and the findings' tests read.
 * Throws, naming the branch's key, when a rule is left out: every generated rule is complete and
 * on a field of `ORACLE_CONTEXT`
 */
export function checkedBranchOf(branch: KeyedBranch): CheckedBranch {
  const checked = buildCheckedBranch(branch, ORACLE_CONTEXT, ORACLE_TODAY);
  if (checked.leftOut.length > 0) {
    throw new Error(`${branch.key}: buildCheckedBranch() left out ${checked.leftOut.join(', ')}`);
  }
  return checked;
}

/**
 * Runs `check`, and adds the seed to the message of any error it throws, so that a failed
 * assertion names the branch to replay with `randomBranch(seed)`
 */
export function withSeed<T>(seed: number, check: () => T): T {
  try {
    return check();
  } catch (error) {
    if (error instanceof Error) {
      error.message = `seed ${seed}: ${error.message}`;
    }
    throw error;
  }
}

/** Whether the applicant meets the branch's rules on the day of sharing `day` (a day number) */
export function met(branch: EvaluatedBranch, applicant: Applicant, day: number): boolean {
  return evaluateBranch(branch, applicant, day, ORACLE_CONTEXT).met;
}

// The oracle

/** One day of sharing (a day number), or a range of them, both ends included */
export type Days = number | DayRange;

/** An applicant and a day of sharing that answer a question */
export interface OracleWitness {
  applicant: Applicant;
  day: number;
  /** The day as `YYYY-MM-DD`, to read in a failed assertion */
  date: string;
}

/**
 * The questions about one branch (research R4), answered for every applicant and every day of
 * sharing. Items are named by their ids, the items that count (`itemIds`): a rule or group at its
 * own level, whose outcome is its own, wherever it sits. `BRANCH` stands for the branch's rules
 * as a whole. Days are a day number or a range of them, from 0001-01-01 to 9999-12-31
 */
export interface Oracle {
  /** The ids of the items that count, rules and groups, top-down in display order */
  readonly itemIds: readonly string[];
  /**
   * The days that stand for `days`: its first day, then each day of it on which the outcomes an
   * applicant can have may change. Every day of the range answers as the latest of them on or
   * before it
   */
  days: (days: Days) => number[];
  /** One applicant per combination of the fields' outcomes on `day` */
  applicantsOn: (day: number) => Applicant[];
  /** An applicant who meets every item of `ids` on a day of `days`, or null when none does */
  whoMeets: (ids: readonly string[], days: Days) => OracleWitness | null;
  /** Whether some applicant meets every item of `ids` together on some day of `days` */
  canMeet: (ids: readonly string[], days: Days) => boolean;
  /** The days of `range` on which some applicant meets every item of `ids`, as sorted ranges */
  meetDays: (ids: readonly string[], range: DayRange) => DayRange[];
  /** An applicant who fails an item of `ids` on a day of `days`, or null when none does */
  whoFails: (ids: readonly string[], days: Days) => OracleWitness | null;
  /** Whether every applicant meets every item of `ids` on every day of `days` */
  alwaysMet: (ids: readonly string[], days: Days) => boolean;
  /**
   * An applicant whose outcome for the branch changes on a day of `days` when the items of
   * `deleted` are deleted from the working tree, or null when no outcome changes (FR-005,
   * SC-002). The working tree is the branch without the items of `alreadyDeleted` (research R8).
   * Deleting removes an item with everything in it; a group left with one member becomes that
   * member, in its place, and a group left with none is removed too, as the rules step's
   * deletions do. A branch left without items is met by everyone
   */
  changedOutcome: (
    deleted: readonly string[],
    days: Days,
    alreadyDeleted?: readonly string[]
  ) => OracleWitness | null;
}

/**
 * The oracle of a branch whose rules are complete and on fields of `ORACLE_CONTEXT`, such as
 * `randomBranch()`'s, or one built by hand within the same bounds. Throws, naming the branch's key,
 * where the evaluator would, and for text rules the oracle's texts don't stand for (more than
 * `MAX_TEXT_RULES` on a field, or texts other than one or two of `TEXT_LETTERS`). The work is done
 * as questions need it and kept: a field's values on a day, and each combination's outcomes
 */
export function oracleOf(branch: EvaluatedBranch & { key?: string }): Oracle {
  return new BranchOracle(branch);
}

/** A field that rules check, with those rules */
interface OracleField {
  documentType: string;
  key: string;
  /** The rules on it that count, in display order */
  rules: RuleItem[];
  /** Its values, as `ORACLE_CONTEXT` reads it */
  kind: 'number' | 'text' | 'enum' | 'date' | 'privileges';
  /** Whether its values, and their outcomes, depend on the day */
  dated: boolean;
}

/**
 * A field's values on one day, one per vector of outcomes of its rules: the vectors (`m`, `n`
 * and `c` for met, not met and not checked, a letter per rule) in sorted order, and a value of
 * each
 */
interface FieldValues {
  keys: string[];
  values: unknown[];
}

/** The combinations of a day's field values: by their outcomes, which some days share */
interface DayTable {
  /** Each combination: its fields' vectors, joined and apart, and each field's value's index */
  combinations: { key: string; vectors: string[]; indices: number[] }[];
  /** The distinct sets of items met, as masks: bit 0 the branch, then `itemIds` */
  masks: number[];
  /** A combination for each mask */
  byMask: Map<number, number[]>;
}

/** The dates a date rule compares with, and the counts it reads */
interface DateTerms {
  fixed: number[];
  /** N of "N years ago", and N + 1 for "exactly" */
  years: number[];
  fromNow: FromNow[];
}

/** The letters of an outcome in a vector */
const OUTCOME_LETTERS: Record<Outcome, string> = { met: 'm', not_met: 'n', not_checked: 'c' };

/** The keys of the licence's entries and of the classes' part */
const CLASS_CODE = 'vehicle_category_code';
const CLASSES_PART = 'classes';

/** Every text of one to `MOST_TEXT_UNITS` units */
const TEXT_DOMAIN: readonly string[] = textsUpTo(MOST_TEXT_UNITS);

/** The outcome of each text of `TEXT_DOMAIN`, per text rule, kept across branches */
const TEXT_OUTCOMES = new Map<string, Uint8Array>();
const OUTCOME_CODES: Record<Outcome, number> = { met: 0, not_met: 1, not_checked: 2 };
const CODE_LETTERS = ['m', 'n', 'c'];

/** The most items a mask holds: bit 0 is the branch */
const MOST_ITEMS = 30;

class BranchOracle implements Oracle {
  readonly itemIds: readonly string[];
  private readonly branch: EvaluatedBranch;
  private readonly name: string;
  /** The items that count as the evaluator takes them, without marks */
  private readonly tree: RuleTreeItem[];
  private readonly bits = new Map<string, number>();
  private readonly fields: OracleField[];
  private readonly eventDays: number[];
  private readonly staticValues = new Map<OracleField, FieldValues>();
  private readonly valuesByDay = new Map<number, FieldValues[]>();
  private readonly tables = new Map<string, DayTable>();
  private readonly masksByOutcomes = new Map<string, number>();
  /** Where a rule's outcome is in a combination's vectors: its field's index, its position */
  private readonly places = new Map<string, [number, number]>();

  constructor(branch: EvaluatedBranch & { key?: string }) {
    this.branch = branch;
    this.name = branch.key ?? 'branch';
    // Without values every rule is not checked, so this reads the structure without comparing
    const structure = this.evaluate(branch, {}, ORACLE_TODAY_DAY);
    this.tree = unmarked(structure.items);
    const ids: string[] = [];
    const collect = (item: EvaluatedItem): void => {
      ids.push(item.item.id);
      item.members.forEach(collect);
    };
    structure.items.forEach(collect);
    if (ids.length > MOST_ITEMS) {
      throw new Error(`${this.name}: more than ${MOST_ITEMS} items`);
    }
    ids.forEach((id, index) => this.bits.set(id, index + 1));
    this.itemIds = ids;
    this.fields = fieldsOf(rulesOf(this.tree), this.name);
    this.fields.forEach((field, index) =>
      field.rules.forEach((each, position) => this.places.set(each.id, [index, position]))
    );
    this.eventDays = sortedUnique(
      this.fields.flatMap((field) => dateVariables(field).flatMap(eventDaysOf))
    );
  }

  days(days: Days): number[] {
    const { from, to } = rangeOf(days);
    return [from, ...this.eventDays.filter((day) => day > from && day <= to)];
  }

  applicantsOn(day: number): Applicant[] {
    const values = this.valuesOn(day);
    return this.tableOn(day).combinations.map(({ indices }) =>
      applicantOf(this.fields, values, indices)
    );
  }

  whoMeets(ids: readonly string[], days: Days): OracleWitness | null {
    const need = this.maskOf(ids);
    return this.find(days, (mask) => (mask & need) === need);
  }

  canMeet(ids: readonly string[], days: Days): boolean {
    return this.whoMeets(ids, days) !== null;
  }

  meetDays(ids: readonly string[], range: DayRange): DayRange[] {
    const need = this.maskOf(ids);
    const days = this.days(range);
    const result: DayRange[] = [];
    days.forEach((day, index) => {
      if (!this.tableOn(day).masks.some((mask) => (mask & need) === need)) {
        return;
      }
      const to = index + 1 < days.length ? days[index + 1] - 1 : range.to;
      const last = result.at(-1);
      if (last && last.to === day - 1) {
        last.to = to;
      } else {
        result.push({ from: day, to });
      }
    });
    return result;
  }

  whoFails(ids: readonly string[], days: Days): OracleWitness | null {
    const need = this.maskOf(ids);
    return this.find(days, (mask) => (mask & need) !== need);
  }

  alwaysMet(ids: readonly string[], days: Days): boolean {
    return this.whoFails(ids, days) === null;
  }

  changedOutcome(
    deleted: readonly string[],
    days: Days,
    alreadyDeleted: readonly string[] = []
  ): OracleWitness | null {
    for (const id of [...deleted, ...alreadyDeleted]) {
      if (!this.bits.has(id)) {
        throw new Error(`${this.name}: ${id} is not an item that counts`);
      }
    }
    const working = withoutItems(this.tree, new Set(alreadyDeleted));
    const changed = withoutItems(this.tree, new Set([...alreadyDeleted, ...deleted]));
    const { operator } = this.branch;
    const seen = new Set<string>();
    for (const day of this.days(days)) {
      for (const { key, vectors, indices } of this.tableOn(day).combinations) {
        if (seen.has(key)) {
          // The same outcomes of every rule: the same outcome of every tree of these rules
          continue;
        }
        seen.add(key);
        const outcome = this.outcomeIn(vectors);
        if (branchMet(working, operator, outcome) !== branchMet(changed, operator, outcome)) {
          const applicant = applicantOf(this.fields, this.valuesOn(day), indices);
          return { applicant, day, date: isoDate(day) };
        }
      }
    }
    return null;
  }

  /** The first applicant and day of `days` whose items met pass `test` */
  private find(days: Days, test: (mask: number) => boolean): OracleWitness | null {
    for (const day of this.days(days)) {
      const table = this.tableOn(day);
      const mask = table.masks.find(test);
      const indices = mask === undefined ? undefined : table.byMask.get(mask);
      if (indices) {
        const applicant = applicantOf(this.fields, this.valuesOn(day), indices);
        return { applicant, day, date: isoDate(day) };
      }
    }
    return null;
  }

  /** The mask of `ids`; throws for an id that isn't an item that counts */
  private maskOf(ids: readonly string[]): number {
    let mask = 0;
    for (const id of ids) {
      const bit = id === BRANCH ? 0 : this.bits.get(id);
      if (bit === undefined) {
        throw new Error(`${this.name}: ${id} is not an item that counts`);
      }
      mask |= 1 << bit;
    }
    return mask;
  }

  /** A rule's outcome letter in a combination, from its field's vector */
  private outcomeIn(vectors: readonly string[]): (ruleId: string) => string {
    return (ruleId) => {
      const place = this.places.get(ruleId);
      if (!place) {
        throw new Error(`${this.name}: ${ruleId} is not a rule that counts`);
      }
      return vectors[place[0]][place[1]];
    };
  }

  /** `evaluateBranch()` with `ORACLE_CONTEXT`, naming the branch in what it throws */
  private evaluate(branch: EvaluatedBranch, applicant: Applicant, day: number): BranchEvaluation {
    try {
      return evaluateBranch(branch, applicant, day, ORACLE_CONTEXT);
    } catch (error) {
      if (error instanceof Error) {
        error.message = `${this.name}: ${error.message}`;
      }
      throw error;
    }
  }

  /** Every field's values on `day`, one per vector of outcomes */
  private valuesOn(day: number): FieldValues[] {
    let values = this.valuesByDay.get(day);
    if (!values) {
      values = this.fields.map((field) => {
        if (field.dated) {
          return fieldValues(field, day);
        }
        let fixed = this.staticValues.get(field);
        if (!fixed) {
          fixed = fieldValues(field, ORACLE_TODAY_DAY);
          this.staticValues.set(field, fixed);
        }
        return fixed;
      });
      this.valuesByDay.set(day, values);
    }
    return values;
  }

  /**
   * The combinations of the fields' values on `day`, with the items each meets. Days whose fields
   * have the same vectors share it: a combination's outcomes are those of its vectors
   */
  private tableOn(day: number): DayTable {
    const values = this.valuesOn(day);
    const signature = values.map(({ keys }) => keys.join(',')).join('|');
    const known = this.tables.get(signature);
    if (known) {
      return known;
    }
    const table: DayTable = { combinations: [], masks: [], byMask: new Map() };
    for (const indices of combinationsOf(values.map(({ keys }) => keys.length))) {
      const vectors = indices.map((index, field) => values[field].keys[index]);
      const key = vectors.join('|');
      let mask = this.masksByOutcomes.get(key);
      if (mask === undefined) {
        const applicant = applicantOf(this.fields, values, indices);
        mask = this.maskOfEvaluation(this.evaluate(this.branch, applicant, day), vectors);
        this.masksByOutcomes.set(key, mask);
      }
      table.combinations.push({ key, vectors, indices });
      if (!table.byMask.has(mask)) {
        table.byMask.set(mask, indices);
        table.masks.push(mask);
      }
    }
    this.tables.set(signature, table);
    return table;
  }

  /**
   * The items an evaluation finds met, as a mask. It checks the two shortcuts that the questions
   * take against the evaluation: that each rule's outcome is the one its field's vector gives, and
   * that `levelMet()` over those outcomes gives every item's outcome and the branch's
   */
  private maskOfEvaluation(evaluation: BranchEvaluation, vectors: readonly string[]): number {
    const outcome = this.outcomeIn(vectors);
    let mask = evaluation.met ? 1 : 0;
    const visit = (item: EvaluatedItem): void => {
      const { item: counted } = item;
      if (counted.type === 'rule' && OUTCOME_LETTERS[item.outcome] !== outcome(counted.id)) {
        throw new Error(`${this.name}: ${counted.id}'s outcome differs from its field's vector`);
      }
      if (item.outcome === 'met') {
        mask |= this.maskOf([counted.id]);
      }
      item.members.forEach(visit);
    };
    evaluation.items.forEach(visit);
    const metByLevels = (items: readonly RuleTreeItem[]): number => {
      let bits = 0;
      for (const item of items) {
        const isMet =
          item.type === 'rule'
            ? outcome(item.id) === 'm'
            : levelMet(item.items, item.operator, outcome);
        bits |= isMet ? this.maskOf([item.id]) : 0;
        bits |= item.type === 'group' ? metByLevels(item.items) : 0;
      }
      return bits;
    };
    const levels =
      metByLevels(this.tree) | (branchMet(this.tree, this.branch.operator, outcome) ? 1 : 0);
    if (levels !== mask) {
      throw new Error(`${this.name}: levelMet() differs from evaluateBranch()`);
    }
    return mask;
  }
}

/**
 * `_level_met()` over the rules' outcome letters: AND, every item is met; OR, at least one is. A
 * group is met when its level is; `c` (not checked) counts as not met. The questions about
 * deletions take it on the working tree's rules' outcomes, which the evaluation of each
 * combination gave and checked (`maskOfEvaluation()`)
 */
function levelMet(
  items: readonly RuleTreeItem[],
  operator: Combinator,
  outcome: (ruleId: string) => string
): boolean {
  const isMet = (item: RuleTreeItem): boolean =>
    item.type === 'rule' ? outcome(item.id) === 'm' : levelMet(item.items, item.operator, outcome);
  return operator === 'and' ? items.every(isMet) : items.some(isMet);
}

/** `evaluate_branch()`'s `met`: a branch without items that count is met */
function branchMet(
  items: readonly RuleTreeItem[],
  operator: Combinator,
  outcome: (ruleId: string) => string
): boolean {
  return items.length === 0 || levelMet(items, operator, outcome);
}

/** The items that count, from an evaluation, as a tree without marks */
function unmarked(items: readonly EvaluatedItem[]): RuleTreeItem[] {
  return items.map(({ item, members }) =>
    item.type === 'rule'
      ? { ...item, mark: null }
      : { ...item, mark: null, items: unmarked(members) }
  );
}

/** The rules of a tree, in display order */
function rulesOf(items: readonly RuleTreeItem[]): RuleItem[] {
  return items.flatMap((item) => (item.type === 'rule' ? [item] : rulesOf(item.items)));
}

/**
 * A tree without the items of `deleted` and everything in them: a group left with one member is
 * that member, in its place, and one left with none is gone
 */
function withoutItems(
  items: readonly RuleTreeItem[],
  deleted: ReadonlySet<string>
): RuleTreeItem[] {
  const kept: RuleTreeItem[] = [];
  for (const item of items) {
    if (deleted.has(item.id)) {
      continue;
    }
    if (item.type === 'rule') {
      kept.push(item);
      continue;
    }
    const members = withoutItems(item.items, deleted);
    if (members.length === 1) {
      kept.push(members[0]);
    } else if (members.length > 1) {
      kept.push({ ...item, items: members });
    }
  }
  return kept;
}

/** A day, or a range of days, as a range of day numbers; throws for anything else */
function rangeOf(days: Days): DayRange {
  const range = typeof days === 'number' ? { from: days, to: days } : days;
  if (!isDayNumber(range.from) || !isDayNumber(range.to) || range.from > range.to) {
    throw new RangeError(`Not a range of days: ${JSON.stringify(days)}`);
  }
  return range;
}

/** Each combination of one index per list, for lists of these lengths, the last varying first */
function* combinationsOf(lengths: readonly number[]): Generator<number[]> {
  if (lengths.some((length) => length === 0)) {
    return;
  }
  const indices = lengths.map(() => 0);
  while (true) {
    yield [...indices];
    let position = lengths.length - 1;
    while (position >= 0 && indices[position] === lengths[position] - 1) {
      indices[position] = 0;
      position -= 1;
    }
    if (position < 0) {
      return;
    }
    indices[position] += 1;
  }
}

/** An applicant with one value per field: the values at `indices` */
function applicantOf(
  fields: readonly OracleField[],
  values: readonly FieldValues[],
  indices: readonly number[]
): Applicant {
  const applicant: Record<string, Record<string, unknown>> = {};
  fields.forEach((field, index) => {
    applicant[field.documentType] = {
      ...applicant[field.documentType],
      [field.key]: values[index].values[indices[index]],
    };
  });
  return applicant;
}

/**
 * An applicant who gives only one value of the field: `give(value)` sets it and returns the
 * applicant, the same object each time, so that loops over many values build no new objects
 */
function applicantWith(field: OracleField): (value: unknown) => Applicant {
  const values: Record<string, unknown> = {};
  const applicant: Applicant = { [field.documentType]: values };
  return (value) => {
    values[field.key] = value;
    return applicant;
  };
}

// Fields and their values

/** The fields the rules check, in the order the rules first do; throws for one it can't read */
function fieldsOf(rules: readonly RuleItem[], name: string): OracleField[] {
  const fields = new Map<string, OracleField>();
  for (const each of rules) {
    if (!each.target) {
      throw new Error(`${name}: ${each.id} has no target`);
    }
    const { document_type: documentType, field: key } = each.target;
    const id = `${documentType}.${key}`;
    let field = fields.get(id);
    if (!field) {
      field = {
        documentType,
        key,
        rules: [],
        kind: kindOfField(documentType, key, name),
        dated: false,
      };
      fields.set(id, field);
    }
    field.rules.push(each);
  }
  for (const field of fields.values()) {
    field.dated = dateVariables(field).some(
      (terms) => terms.years.length > 0 || terms.fromNow.length > 0
    );
    if (field.kind === 'text') {
      requireTextBounds(field, name);
    }
  }
  return [...fields.values()];
}

/** How the oracle enumerates a field of `ORACLE_CONTEXT` */
function kindOfField(documentType: string, key: string, name: string): OracleField['kind'] {
  const field = ORACLE_CONTEXT.documents
    .find((document) => document.key === documentType)
    ?.fields.find((each) => each.key === key);
  if (!field) {
    throw new Error(`${name}: ${documentType}.${key} is not a field of ORACLE_CONTEXT`);
  }
  if (field.kind === 'parts') {
    if (key !== 'driving_privileges') {
      throw new Error(`${name}: the oracle enumerates no parts of ${key}`);
    }
    return 'privileges';
  }
  if (field.kind === 'image') {
    throw new Error(`${name}: an image can't be checked`);
  }
  return field.kind;
}

/** Refuses text rules that the oracle's texts don't stand for (see the module's comment) */
function requireTextBounds(field: OracleField, name: string): void {
  const bounded = field.rules.every(({ condition }) => {
    const letters = typeof condition?.value === 'string' ? Array.from(condition.value) : [];
    return (
      letters.length >= 1 &&
      letters.length <= LONGEST_RULE_TEXT &&
      letters.every((letter) => TEXT_LETTERS.includes(letter))
    );
  });
  if (field.rules.length > MAX_TEXT_RULES || !bounded) {
    throw new Error(
      `${name}: the oracle's texts stand for at most ${MAX_TEXT_RULES} rules on a text, each ` +
        `with one or two of ${TEXT_LETTERS.join(', ')}`
    );
  }
}

/** A field's values on `day`, one per vector of outcomes of its rules */
function fieldValues(field: OracleField, day: number): FieldValues {
  if (field.kind === 'text') {
    return textValues(field);
  }
  if (field.kind === 'privileges') {
    return privilegesValues(field, day);
  }
  return valuesByKey(distinctValues(field, field.rules, candidatesOf(field, day), day));
}

/**
 * The first of `candidates` for each vector of outcomes of `rules`, a value of `field` each, by
 * the vector: each rule's outcome for an applicant who gives only that value
 */
function distinctValues(
  field: OracleField,
  rules: readonly RuleItem[],
  candidates: readonly unknown[],
  day: number
): Map<string, unknown> {
  const byKey = new Map<string, unknown>();
  const give = applicantWith(field);
  for (const value of candidates) {
    const key = vectorOf(rules, give(value), day);
    if (!byKey.has(key)) {
      byKey.set(key, value);
    }
  }
  return byKey;
}

/** The rules' outcomes for the applicant on `day`, a letter each */
function vectorOf(rules: readonly RuleItem[], applicant: Applicant, day: number): string {
  return rules
    .map((each) => OUTCOME_LETTERS[ruleOutcome(each, applicant, day, ORACLE_CONTEXT)])
    .join('');
}

/** Values by their vectors, in sorted order */
function valuesByKey(byKey: ReadonlyMap<string, unknown>): FieldValues {
  const keys = [...byKey.keys()].sort();
  return { keys, values: keys.map((key) => byKey.get(key)) };
}

/** The values to try of a field that isn't a text, on `day` (see the module's comment) */
function candidatesOf(field: OracleField, day: number): unknown[] {
  switch (field.kind) {
    case 'number': {
      const constants = field.rules.map(({ condition }) => Math.abs(Number(condition?.value)));
      const largest = Math.ceil(Math.max(0, ...constants.filter(Number.isFinite)));
      return Array.from({ length: largest + 3 }, (_, value) => value);
    }
    case 'enum':
      return enumCandidates(field);
    case 'date':
      return dateCandidates(dateTermsOf(field.rules), day).map(isoDate);
    case 'privileges':
    case 'text':
      throw new Error(`The ${field.kind} have values of their own`);
  }
}

/** The option values of a field without parts, or every non-empty set of them */
function enumCandidates(field: OracleField): unknown[] {
  const declared = ORACLE_CONTEXT.documents
    .find((document) => document.key === field.documentType)
    ?.fields.find((each) => each.key === field.key);
  const values = optionValues(declared?.option_set ?? null);
  return declared?.multiple_values ? nonEmptySubsets(values) : values;
}

/** The values of a value set of `ORACLE_CONTEXT` */
function optionValues(key: string | null): (string | number)[] {
  const options = ORACLE_CONTEXT.optionSets.find((set) => set.key === key)?.options ?? [];
  return options.map((option) => option.value);
}

/** Every non-empty subset of the values, in a fixed order */
function nonEmptySubsets<T>(values: readonly T[]): T[][] {
  const subsets: T[][] = [];
  for (let bits = 1; bits < 2 ** values.length; bits += 1) {
    subsets.push(values.filter((_, index) => (bits >> index) & 1));
  }
  return subsets;
}

/**
 * The licence's entries on `day`, one per vector of outcomes of its rules: every non-empty set of
 * classes, and for each class whose date rules check, while it is listed, one date per vector of
 * those rules' outcomes. A rule on the classes reads only the classes listed, and one on class K's
 * date only K's entry, or that K isn't listed (`_privileges_value()`): so the classes' rules are
 * evaluated per set of classes, and each class's date rules per date, with K listed alone. Each
 * combination's evaluation checks this against the whole entries (`maskOfEvaluation()`)
 */
function privilegesValues(field: OracleField, day: number): FieldValues {
  const classRules = field.rules.filter(({ target }) => target?.part === CLASSES_PART);
  const give = applicantWith(field);
  const variables = classDateVariables(field).map((variable) => {
    const { part, licenceClass, rules } = variable;
    // The first date of each vector, with the class listed alone
    const dates = new Map<string, string>();
    for (const date of dateCandidates(dateTermsOf(rules), day).map(isoDate)) {
      const vector = vectorOf(rules, give([{ [CLASS_CODE]: licenceClass, [part]: date }]), day);
      if (!dates.has(vector)) {
        dates.set(vector, date);
      }
    }
    return { ...variable, dates: [...dates] };
  });
  const byKey = new Map<string, unknown>();
  for (const classes of nonEmptySubsets(optionValues(LICENCE_CLASSES_SET))) {
    const listedOnly = give(classes.map((code) => ({ [CLASS_CODE]: code })));
    const letters = new Map<string, string>();
    const take = (rules: readonly RuleItem[], vector: string): void =>
      rules.forEach((each, index) => letters.set(each.id, vector[index]));
    take(classRules, vectorOf(classRules, listedOnly, day));
    const listed = variables.filter(({ licenceClass }) => classes.includes(licenceClass));
    for (const { rules, licenceClass } of variables) {
      if (!classes.includes(licenceClass)) {
        take(rules, vectorOf(rules, listedOnly, day));
      }
    }
    for (const indices of combinationsOf(listed.map(({ dates }) => dates.length))) {
      listed.forEach(({ rules, dates }, index) => take(rules, dates[indices[index]][0]));
      const key = field.rules.map(({ id }) => letters.get(id)).join('');
      if (!byKey.has(key)) {
        byKey.set(key, entriesOf(classes, listed, indices));
      }
    }
  }
  return valuesByKey(byKey);
}

/** The licence's entries: the classes, with the listed classes' dates at `indices` */
function entriesOf(
  classes: readonly (string | number)[],
  listed: readonly { licenceClass: string; part: string; dates: [string, string][] }[],
  indices: readonly number[]
): Record<string, unknown>[] {
  return classes.map((code) => {
    const entry: Record<string, unknown> = { [CLASS_CODE]: code };
    listed.forEach(({ licenceClass, part, dates }, index) => {
      if (licenceClass === code) {
        entry[part] = dates[indices[index]][1];
      }
    });
    return entry;
  });
}

/** The rules on each licence class's date, by part and class */
function classDateVariables(
  field: OracleField
): { part: string; licenceClass: string; rules: RuleItem[] }[] {
  const variables = new Map<string, { part: string; licenceClass: string; rules: RuleItem[] }>();
  for (const each of field.rules) {
    const part = each.target?.part;
    const licenceClass = each.target?.licence_class;
    if (!part || part === CLASSES_PART || !licenceClass) {
      continue;
    }
    const id = `${part}#${licenceClass}`;
    const variable = variables.get(id) ?? { part, licenceClass, rules: [] };
    variable.rules.push(each);
    variables.set(id, variable);
  }
  return [...variables.values()];
}

/** The date terms of each date variable of a field: the field itself, or each class's date */
function dateVariables(field: OracleField): DateTerms[] {
  if (field.kind === 'date') {
    return [dateTermsOf(field.rules)];
  }
  if (field.kind === 'privileges') {
    return classDateVariables(field).map(({ rules }) => dateTermsOf(rules));
  }
  return [];
}

/** The fixed dates, years and counts from now that date rules compare with */
function dateTermsOf(rules: readonly RuleItem[]): DateTerms {
  const terms: DateTerms = { fixed: [], years: [], fromNow: [] };
  for (const { condition } of rules) {
    switch (condition?.operator) {
      case 'before':
      case 'after':
      case 'on':
        if (typeof condition.date === 'string') {
          terms.fixed.push(dayNumber(condition.date));
        }
        break;
      case 'at_least_years_ago':
      case 'less_than_years_ago':
        if (isCount(condition.years)) {
          terms.years.push(condition.years);
        }
        break;
      case 'exactly_years_ago':
        if (isCount(condition.years)) {
          terms.years.push(condition.years, condition.years + 1);
        }
        break;
      case 'at_least_from_now':
      case 'less_than_from_now':
        if (
          isCount(condition.amount) &&
          (condition.unit === 'years' || condition.unit === 'months')
        ) {
          terms.fromNow.push({ amount: condition.amount, unit: condition.unit });
        }
        break;
    }
  }
  return terms;
}

/** A whole count from 1, as the evaluator reads one; others make it throw anyway */
function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

/**
 * The dates to try on `day` (see the module's comment): 0001-01-01 and 9999-12-31, each fixed
 * date F from F - 1 to F + 2, each L_N(day) to L_N(day) + 2, and each A(day) - 1 to A(day) + 1
 */
function dateCandidates(terms: DateTerms, day: number): number[] {
  const dates = [FIRST_DAY, LAST_DAY];
  for (const date of terms.fixed) {
    dates.push(date - 1, date, date + 1, date + 2);
  }
  for (const years of terms.years) {
    const latest = latestAnniversaryBy(day, years);
    dates.push(latest, latest + 1, latest + 2);
  }
  for (const count of terms.fromNow) {
    const threshold = fromNow(day, count);
    dates.push(threshold - 1, threshold, threshold + 1);
  }
  return sortedUnique(dates);
}

/**
 * The days on which the order of a date variable's run starts may change (see the module's
 * comment): the first days on which L_N reaches each of 0001-01-01, F - 1 to F + 2 and 9999-12-31,
 * and A reaches each of F - 1 to F + 2 and 9999-12-31
 */
function eventDaysOf(terms: DateTerms): number[] {
  const days: number[] = [];
  const near = terms.fixed.flatMap((date) => [date - 1, date, date + 1, date + 2]);
  for (const years of terms.years) {
    for (const date of [FIRST_DAY, LAST_DAY, ...near]) {
      if (isDayNumber(date)) {
        days.push(yearsAfter(date, years));
      }
    }
  }
  for (const count of terms.fromNow) {
    for (const date of [LAST_DAY, ...near]) {
      const reached = isDayNumber(date) ? firstDayReaching(date, count) : null;
      if (reached !== null) {
        days.push(reached);
      }
    }
  }
  return days;
}

/** A(day): the day `count` months or years after `day`, as `_from_now()` computes it */
function fromNow(day: number, { amount, unit }: FromNow): number {
  return unit === 'years' ? yearsAfter(day, amount) : monthsAfter(day, amount);
}

/**
 * L_N(day): the latest date whose `years`-th anniversary falls on or before `day`, or the day
 * before 0001-01-01. Bisection, since anniversaries never decrease as the date grows
 */
function latestAnniversaryBy(day: number, years: number): number {
  let low = FIRST_DAY - 1;
  let high = LAST_DAY + 1;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (yearsAfter(middle, years) <= day) {
      low = middle;
    } else {
      high = middle;
    }
  }
  return low;
}

/** The first day of sharing whose A(day) is `date` or later, or null when none is */
function firstDayReaching(date: number, count: FromNow): number | null {
  let low = FIRST_DAY - 1;
  let high = LAST_DAY + 1;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (fromNow(middle, count) >= date) {
      high = middle;
    } else {
      low = middle;
    }
  }
  return high <= LAST_DAY ? high : null;
}

/** The day numbers among `days`, each once, in order */
function sortedUnique(days: readonly number[]): number[] {
  return [...new Set(days.filter(isDayNumber))].sort((a, b) => a - b);
}

// Texts

/** Every text of one to `most` of `TEXT_UNITS` */
function textsUpTo(most: number): string[] {
  const texts: string[] = [];
  let level = [''];
  for (let length = 1; length <= most; length += 1) {
    level = level.flatMap((text) => TEXT_UNITS.map((unit) => text + unit));
    texts.push(...level);
  }
  return texts;
}

/** A text field's values, one per vector of outcomes of its rules over `TEXT_DOMAIN` */
function textValues(field: OracleField): FieldValues {
  const outcomes = field.rules.map((each) => textOutcomes(field, each));
  // The first text of each vector, found by the vector's number: three outcomes per rule. The
  // search stops once every vector the rules' outcomes allow has a text
  const firsts = new Int32Array(3 ** outcomes.length).fill(-1);
  const possible = outcomes.reduce((count, codes) => count * new Set(codes).size, 1);
  let found = 0;
  for (let index = 0; index < TEXT_DOMAIN.length && found < possible; index += 1) {
    let vector = 0;
    for (const codes of outcomes) {
      vector = vector * 3 + codes[index];
    }
    if (firsts[vector] < 0) {
      firsts[vector] = index;
      found += 1;
    }
  }
  const byKey = new Map<string, unknown>();
  for (const index of firsts) {
    if (index >= 0) {
      byKey.set(outcomes.map((codes) => CODE_LETTERS[codes[index]]).join(''), TEXT_DOMAIN[index]);
    }
  }
  return valuesByKey(byKey);
}

/** The outcome of a text rule for each text of `TEXT_DOMAIN`, computed once per rule's check */
function textOutcomes(field: OracleField, textRule: RuleItem): Uint8Array {
  const key = JSON.stringify([textRule.target, textRule.condition]);
  let codes = TEXT_OUTCOMES.get(key);
  if (!codes) {
    const give = applicantWith(field);
    // Texts don't depend on the day
    codes = Uint8Array.from(
      TEXT_DOMAIN,
      (text) => OUTCOME_CODES[ruleOutcome(textRule, give(text), ORACLE_TODAY_DAY, ORACLE_CONTEXT)]
    );
    TEXT_OUTCOMES.set(key, codes);
  }
  return codes;
}
