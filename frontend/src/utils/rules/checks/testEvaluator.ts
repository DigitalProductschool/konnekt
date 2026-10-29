// A test evaluator (specs/003-rule-consistency-checks, research R13): a plain port of the
// comparisons and the AND/OR evaluation of backend/app/services/evaluation.py. It is the ground
// truth of the brute-force oracle (testOracle.ts), which validates the solver and the findings, so
// only tests import it. It shares no code with the theories, literals.ts, checkedTree.ts or the
// solver, so that a mistake there can't hide in the oracle as well. It uses calendar.ts and text.ts,
// which Python's vectors in fixtures/evaluator-vectors.json pin, and its test replays every
// rule-outcome vector. Each function names the Python function it ports.
//
// What it reads:
// - a branch of the rules state as the server stores it (`EvaluatedBranch`; a `BranchInput` fits).
//   Like `evaluate_branch()`, it evaluates the items that count: in a branch based on the main
//   branch, removed items are left out and an inherited group with fewer than two members that
//   count is dissolved (`effectiveItems()`, ported here from `effective_items()`, not imported
//   from tree.ts). It throws where Python raises ValueError, on what the save's checks refuse: a
//   rule without a target or a condition, a target the catalog doesn't have, a mark outside a
//   based branch, a group with fewer than two members that count (in a based branch, a group the
//   branch added; elsewhere, any group), and, once there is a value to compare, an incomplete
//   condition. Every rule is evaluated, so any of them throws. A branch must therefore hold only
//   complete rules on fields of `context.documents`, and a group left with one member must be
//   replaced by that member before it is evaluated, as `buildCheckedBranch()` does. As in Python,
//   parts are read only from the fields keyed `place_of_birth` and `driving_privileges`;
// - an applicant's delivered documents (`Applicant`);
// - the day of sharing as a day number (calendar.ts), the calendar date in Germany;
// - a `RuleContext`: its documents stand for the catalog that `_kind_of()` looks targets up in, and
//   its option sets for `OPTION_SETS`.
//
// One part of `_date()` isn't ported: a date-time with a time zone (`_DATE_TIME`), read by
// `datetime.fromisoformat()` in Germany's time zone. Such a value throws instead of risking an
// answer Python wouldn't give; the oracle delivers dates as `YYYY-MM-DD`
import type { FieldKind, PartKind } from '../../../types/document-types';
import type {
  BranchInput,
  Combinator,
  Condition,
  RuleItem,
  RuleTarget,
  RuleTreeItem,
} from '../../../types/form-connections';
import type { OptionSet } from '../../../types/option-sets';
import type { RuleContext } from '../types';
import { isDayNumber, monthsAfter, parseDayNumber, yearsAfter } from './calendar';
import { caseFold, normalisedText } from './text';

/** `Outcome` of backend/app/schemas.py: a rule's outcome; a group's is met or not met */
export type Outcome = 'met' | 'not_met' | 'not_checked';

/**
 * An applicant's delivered documents, as `_DocumentValues` holds them: by document type, then by
 * field key, each field's value as delivered (JSON). A field's value is the whole field, also when
 * a rule checks a part of it: the place of birth's object, the licence's list of
 * `driving_privileges` entries. A missing document or field, and `null`, read as missing
 */
export type Applicant = Readonly<Record<string, Readonly<Record<string, unknown>>>>;

/** What `evaluateBranch()` reads of a branch, as `SnapshotBranch`; a `BranchInput` fits */
export type EvaluatedBranch = Pick<BranchInput, 'origin' | 'operator' | 'items'>;

/** `_Evaluated`: an item that counts, its outcome, and its members' if it is a group */
export interface EvaluatedItem {
  item: RuleTreeItem;
  outcome: Outcome;
  /** A group's members that count, in order; empty for a rule */
  members: EvaluatedItem[];
}

/** What `evaluate_branch()` decides: whether the branch is met, and each item's outcome */
export interface BranchEvaluation {
  /** `Evaluation.met`: true for a branch without items that count */
  met: boolean;
  /** The top level's items that count, in order */
  items: EvaluatedItem[];
}

/** `_kind_of()`'s answer: the kind of value a rule checks, and the value set of an enum */
export interface TargetKind {
  kind: FieldKind | PartKind;
  optionSet: string | null;
}

/** `_Missing`: the value is missing, or can't be read for the condition */
const MISSING = Symbol('missing');

/** `_NotHeld`: the licence doesn't list the class whose date the rule checks */
const NOT_HELD = Symbol('not held');

/** The fields whose parts the evaluator reads, and the keys inside `driving_privileges` */
const PLACE_OF_BIRTH = 'place_of_birth';
const DRIVING_PRIVILEGES = 'driving_privileges';
const CLASS_CODE = 'vehicle_category_code';
const CLASSES = 'classes';

// `_DATE`, `_DATE_TIME` and `_DIGITS`, matched in full. Python's `\d` is any Unicode decimal
// digit (category Nd), and its `.` anything but a newline. `\p{Nd}` is the engine's Unicode, which
// agrees with Python 3.13's for every character that Unicode 15.1 assigns
const DATE = /^\p{Nd}{4}-\p{Nd}{2}-\p{Nd}{2}$/u;
const DATE_TIME = /^\p{Nd}{4}-\p{Nd}{2}-\p{Nd}{2}T[^\n]+$/u;
const DIGITS = /^\p{Nd}+$/u;
const DIGIT = /^\p{Nd}$/u;

/**
 * Python's whitespace, which `str.strip()` removes: the 29 code points of `str.isspace()`. text.ts
 * strips them too, but only inside `normalisedText()`, which adds NFC: `_privileges_value()` and
 * `_enum_key()` strip without it
 */
const PYTHON_WHITESPACE: ReadonlySet<number> = new Set([
  0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x1c, 0x1d, 0x1e, 0x1f, 0x20, 0x85, 0xa0, 0x1680, 0x2000, 0x2001,
  0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200a, 0x2028, 0x2029, 0x202f,
  0x205f, 0x3000,
]);

/**
 * How many normal forms each memo keeps (see `remembered()`): more than an oracle's domain of texts,
 * and few enough that a test run never fills memory
 */
const MAX_REMEMBERED = 10000;

/** The memos: texts normalised respecting and ignoring letter case, and class codes folded */
const MATCHING_CASE = new Map<string, string>();
const IGNORING_CASE = new Map<string, string>();
const CLASS_CODES = new Map<string, string>();

/** The ingredients of an evaluation: `_DocumentValues`, `shared_on`, and the catalog */
interface Inputs {
  applicant: Applicant;
  sharedOn: number;
  context: RuleContext;
}

// Python's built-ins

/** Python's `None`: `null`, or a key left out */
function isNone(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/** Python's `isinstance(value, Mapping)`: a JSON object */
function isMapping(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Python's `mapping.get(key)`: an own key only, so that `constructor` isn't the prototype's */
function get(mapping: Readonly<Record<string, unknown>>, key: string): unknown {
  return Object.hasOwn(mapping, key) ? mapping[key] : undefined;
}

/** Python's `str.strip()` without arguments: its whitespace removed at both ends */
function strip(text: string): string {
  // Python's whitespace lies in the BMP, outside the surrogates, so code units suffice
  let start = 0;
  let end = text.length;
  while (start < end && PYTHON_WHITESPACE.has(text.charCodeAt(start))) {
    start += 1;
  }
  while (end > start && PYTHON_WHITESPACE.has(text.charCodeAt(end - 1))) {
    end -= 1;
  }
  return text.slice(start, end);
}

/**
 * Python's `int()` of a text of decimal digits, any of Unicode's, as `_enum_key()` reads a code.
 * Unicode encodes each set of decimal digits as a run from 0 to 9, and adjacent sets (the
 * mathematical digits) each from 0, so a digit's value is its distance from the run's start, mod 10
 */
function decimalValue(digits: string): bigint {
  const ascii = Array.from(digits, (digit) => {
    const codePoint = digit.codePointAt(0) ?? 0;
    let start = codePoint;
    while (DIGIT.test(String.fromCodePoint(start - 1))) {
      start -= 1;
    }
    return String((codePoint - start) % 10);
  });
  return BigInt(ascii.join(''));
}

// The texts' normal forms, remembered

/**
 * `compute(text)`, kept in `memo`, which is emptied when full. The oracle compares the same few
 * texts millions of times, and normalising one costs more than the rest of a rule's evaluation.
 * `compute` is a pure function of the text, so remembering it changes no answer
 */
function remembered(
  memo: Map<string, string>,
  text: string,
  compute: (text: string) => string
): string {
  const known = memo.get(text);
  if (known !== undefined) {
    return known;
  }
  if (memo.size >= MAX_REMEMBERED) {
    memo.clear();
  }
  const result = compute(text);
  memo.set(text, result);
  return result;
}

/** `_normalised_text()`: text.ts' `normalisedText()`, remembered */
function normalised(text: string, matchCase: boolean): string {
  return matchCase
    ? remembered(MATCHING_CASE, text, (each) => normalisedText(each, true))
    : remembered(IGNORING_CASE, text, (each) => normalisedText(each, false));
}

/** A class code as `_privileges_value()` compares it, `.strip().casefold()`, remembered */
function classCode(code: string): string {
  return remembered(CLASS_CODES, code, (each) => caseFold(strip(each)));
}

// The branch and its levels

/**
 * `effective_items()`: the items of a level that count. In the main branch and in a branch that
 * started empty (`based` false), every item counts. In a branch based on the main branch, items
 * marked removed don't count, and an inherited group (one not added there) with fewer than two
 * items that count is dissolved: the item that remains, if any, counts in its place
 */
function effectiveItems(items: readonly RuleTreeItem[], based: boolean): RuleTreeItem[] {
  if (!based) {
    return [...items];
  }
  const counted: RuleTreeItem[] = [];
  for (const item of items) {
    if (item.mark === 'removed') {
      continue;
    }
    if (item.type === 'group' && item.mark !== 'added') {
      const members = effectiveItems(item.items, based);
      if (members.length < 2) {
        counted.push(...members);
        continue;
      }
    }
    counted.push(item);
  }
  return counted;
}

/**
 * `evaluate_branch()`, without the names and messages: whether the applicant meets the branch's
 * rules on the day of sharing `sharedOn` (a day number), and each item's outcome. Every level
 * combines its items with its own AND or OR, the top level with the branch's, and a group counts as
 * one item of its level. `not_checked` counts as not met, and a branch without items that count is
 * met. In a based branch, only the items that count are evaluated (`effective_items()`). Throws
 * where Python raises ValueError (see the module's comment), and a `RangeError` unless `sharedOn` is
 * a day number
 */
export function evaluateBranch(
  branch: EvaluatedBranch,
  applicant: Applicant,
  sharedOn: number,
  context: RuleContext
): BranchEvaluation {
  requireDay(sharedOn);
  const based = branch.origin === 'based';
  const items = evaluatedLevel(branch.items, { applicant, sharedOn, context }, based);
  return { met: items.length === 0 || levelMet(branch.operator, items), items };
}

/** `_evaluated_level()`: the outcomes of the items of a level that count, in order */
function evaluatedLevel(
  items: readonly RuleTreeItem[],
  inputs: Inputs,
  based: boolean
): EvaluatedItem[] {
  if (!based && items.some((item) => !isNone(item.mark))) {
    throw new Error('A branch that is not based on the main branch has a mark');
  }
  return effectiveItems(items, based).map((item) => evaluated(item, inputs, based));
}

/** `_evaluated()`: a rule's outcome, or a group's with its members' */
function evaluated(item: RuleTreeItem, inputs: Inputs, based: boolean): EvaluatedItem {
  if (item.type === 'rule') {
    const outcome = ruleOutcome(item, inputs.applicant, inputs.sharedOn, inputs.context);
    return { item, outcome, members: [] };
  }
  const members = evaluatedLevel(item.items, inputs, based);
  if (members.length < 2) {
    throw new Error('A saved group has fewer than two members that count');
  }
  return { item, outcome: levelMet(item.operator, members) ? 'met' : 'not_met', members };
}

/** `_level_met()`: AND, every item is met; OR, at least one is */
function levelMet(operator: Combinator, items: readonly EvaluatedItem[]): boolean {
  if (operator === 'and') {
    return items.every((item) => item.outcome === 'met');
  }
  return items.some((item) => item.outcome === 'met');
}

// Rules

/**
 * `_rule_outcome()`: a rule's outcome for the applicant on the day of sharing `sharedOn` (a day
 * number). `not_checked` when the value is missing or can't be read for the condition; `not_met`
 * for a rule on the date of a licence class that the licence doesn't list. Throws where Python
 * raises ValueError, and a `RangeError` unless `sharedOn` is a day number
 */
export function ruleOutcome(
  rule: RuleItem,
  applicant: Applicant,
  sharedOn: number,
  context: RuleContext
): Outcome {
  requireDay(sharedOn);
  const { target, condition } = rule;
  if (isNone(target) || isNone(condition)) {
    throw new Error('A saved rule has no target or no condition');
  }
  const { kind, optionSet } = kindOf(target, context);
  if (kind !== 'number' && kind !== 'text' && kind !== 'enum' && kind !== 'date') {
    throw new Error(`A rule checks a field of kind ${kind}`);
  }
  const value = valueOf(target, applicant);
  if (value === NOT_HELD) {
    return 'not_met';
  }
  if (value === MISSING) {
    return 'not_checked';
  }

  let holds: boolean | null;
  if (kind === 'number') {
    holds = numberHolds(condition, value);
  } else if (kind === 'text') {
    holds = textHolds(condition, value);
  } else if (kind === 'enum') {
    holds = enumHolds(condition, value, optionSet, context.optionSets);
  } else {
    holds = dateHolds(condition, value, sharedOn);
  }
  if (holds === null) {
    return 'not_checked';
  }
  return holds ? 'met' : 'not_met';
}

/**
 * `_kind_of()`: the kind of value a rule checks, and the value set of an enum, from the catalog
 * (`context.documents`). Throws for a field the catalog doesn't have, a part of a field without
 * parts, a part its field doesn't have, and a licence class's date without the class
 */
export function kindOf(target: RuleTarget, context: RuleContext): TargetKind {
  const documentType = context.documents.find((document) => document.key === target.document_type);
  const field = documentType?.fields.find((each) => each.key === target.field);
  if (field === undefined) {
    throw new Error('A rule checks a field that the catalog does not have');
  }
  if (field.kind !== 'parts') {
    if (!isNone(target.part) || !isNone(target.licence_class)) {
      throw new Error('A rule checks a part of a field without parts');
    }
    return { kind: field.kind, optionSet: field.option_set };
  }
  const part = (field.parts ?? []).find((each) => each.key === target.part);
  if (part === undefined) {
    throw new Error('A rule checks a part that its field does not have');
  }
  if (part.per_licence_class && !target.licence_class) {
    throw new Error('A rule on a licence class date names no class');
  }
  return { kind: part.kind, optionSet: part.option_set };
}

/** `_DocumentValues.get()`: the field's value, or `MISSING` when it is absent or null */
function fieldValue(applicant: Applicant, documentType: string, key: string): unknown {
  const fields = get(applicant, documentType);
  const value = isMapping(fields) ? get(fields, key) : undefined;
  return isNone(value) ? MISSING : value;
}

/** `_value_of()`: the value a rule checks, `MISSING`, or `NOT_HELD` for a class not listed */
function valueOf(target: RuleTarget, applicant: Applicant): unknown {
  const value = fieldValue(applicant, target.document_type, target.field);
  if (value === MISSING || isNone(target.part)) {
    return value;
  }
  if (target.field === PLACE_OF_BIRTH) {
    if (!isMapping(value)) {
      return MISSING;
    }
    const part = get(value, target.part);
    return isNone(part) ? MISSING : part;
  }
  if (target.field === DRIVING_PRIVILEGES) {
    return privilegesValue(value, target.part, target.licence_class);
  }
  throw new Error('A rule checks a part that this module cannot read');
}

/**
 * `_privileges_value()`: the licence classes held (the codes as delivered), or one class's issue
 * or expiry date. A class is held when the licence lists it, whatever its own expiry date; the
 * first entry with the class's code counts. A class's date never falls back to the licence's own
 */
function privilegesValue(value: unknown, part: string, licenceClass: string | null): unknown {
  const entries = privilegeEntries(value);
  if (entries.length === 0) {
    // Missing, empty, or entries without a class code (research R14)
    return MISSING;
  }
  if (part === CLASSES) {
    return entries.map(([code]) => code);
  }
  // Trimmed and case-folded without NFC, as Python does here
  const wanted = classCode(licenceClass || '');
  for (const [code, entry] of entries) {
    if (classCode(code) === wanted) {
      const classDate = get(entry, part);
      return isNone(classDate) ? MISSING : classDate;
    }
  }
  return NOT_HELD;
}

/** `_privilege_entries()`: the entries that are objects with a class code that isn't blank */
function privilegeEntries(value: unknown): [string, Readonly<Record<string, unknown>>][] {
  if (!Array.isArray(value)) {
    return [];
  }
  const entries: [string, Readonly<Record<string, unknown>>][] = [];
  for (const entry of value) {
    if (!isMapping(entry)) {
      continue;
    }
    const code = get(entry, CLASS_CODE);
    if (typeof code === 'string' && strip(code) !== '') {
      entries.push([code, entry]);
    }
  }
  return entries;
}

// Numbers: strict comparisons with one value

/**
 * `_number_holds()`: whether the value compares with the condition's number, or null when the
 * value isn't a JSON number. Decimals compare as they are, as Python's floats do
 */
export function numberHolds(condition: Condition, value: unknown): boolean | null {
  const number = numberOf(value);
  if (number === null) {
    return null;
  }
  const limit = numberOf(condition.value);
  if (limit === null) {
    throw new Error('A number rule has no number to compare with');
  }
  switch (condition.operator) {
    case 'greater_than':
      return number > limit;
    case 'less_than':
      return number < limit;
    case 'equal_to':
      return number === limit;
    case 'not_equal_to':
      return number !== limit;
  }
  throw new Error('Unknown operator for a number rule');
}

/** `_number()`: a finite JSON number; a boolean, a text or anything else is none */
function numberOf(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

// Text (FR-013)

/**
 * `_text_holds()`: whether the text compares with the condition's text, both normalised by
 * `_normalised_text()` (text.ts) with the condition's letter case setting, which is off unless it
 * is true. Null when the value isn't a text, or is empty after normalisation
 */
export function textHolds(condition: Condition, value: unknown): boolean | null {
  if (typeof value !== 'string') {
    return null;
  }
  const matchCase = Boolean(condition.match_case);
  const text = normalised(value, matchCase);
  if (text === '') {
    return null;
  }
  if (typeof condition.value !== 'string') {
    throw new Error('A text rule has no text to compare with');
  }
  const expected = normalised(condition.value, matchCase);
  if (expected === '') {
    throw new Error('A text rule has an empty text to compare with');
  }
  switch (condition.operator) {
    case 'equal_to':
      return text === expected;
    case 'not_equal_to':
      return text !== expected;
    case 'contains':
      return text.includes(expected);
    case 'not_contains':
      return !text.includes(expected);
  }
  throw new Error('Unknown operator for a text rule');
}

// Enums (FR-003)

/**
 * `_enum_holds()`: whether the value, one or a list of several, includes one or none of the
 * condition's values, compared as `_enum_key()` reads them. Null when no value can be read, as for
 * an empty list. A value outside the field's set matches none of the rule's values. `optionSets`
 * stands for `OPTION_SETS`
 */
export function enumHolds(
  condition: Condition,
  value: unknown,
  optionSet: string | null,
  optionSets: readonly OptionSet[]
): boolean | null {
  const asCodes = hasIntegerValues(optionSet, optionSets);
  const items: readonly unknown[] = Array.isArray(value) ? value : [value];
  const present = enumKeys(items, asCodes);
  if (present.size === 0) {
    return null;
  }
  const chosen = enumKeys(condition.values ?? [], asCodes);
  if (chosen.size === 0) {
    throw new Error('An enum rule has no values to compare with');
  }
  const includes = [...present].some((key) => chosen.has(key));
  switch (condition.operator) {
    case 'includes_one_of':
      return includes;
    case 'includes_none_of':
      return !includes;
  }
  throw new Error('Unknown operator for an enum rule');
}

/** `_has_integer_values()`: whether a value set holds codes, all of its values integers */
function hasIntegerValues(optionSet: string | null, optionSets: readonly OptionSet[]): boolean {
  const options = optionSets.find((set) => set.key === (optionSet || ''))?.options;
  if (options === undefined || options.length === 0) {
    throw new Error('An enum rule names no known value set');
  }
  return options.every(
    (option) => typeof option.value === 'number' && Number.isInteger(option.value)
  );
}

/** The keys of the items that `_enum_key()` can read */
function enumKeys(items: readonly unknown[], asCodes: boolean): Set<bigint | string> {
  const keys = new Set<bigint | string>();
  for (const item of items) {
    const key = enumKey(item, asCodes);
    if (key !== null) {
      keys.add(key);
    }
  }
  return keys;
}

/**
 * `_enum_key()`: an enum value as compared. A code as an integer (a `bigint`, as exact as Python's
 * `int`): a whole JSON number, or a text of decimal digits once stripped. A text ignoring letter
 * case (`_normalised_text()` without letter case). Null when it can't be read: a boolean, an empty
 * text, or another type
 */
function enumKey(item: unknown, asCodes: boolean): bigint | string | null {
  if (typeof item === 'boolean') {
    return null;
  }
  if (asCodes) {
    if (typeof item === 'number') {
      // Python's int, or a float that `is_integer()`; JSON can't tell them apart here
      return Number.isInteger(item) ? BigInt(item) : null;
    }
    if (typeof item === 'string' && DIGITS.test(strip(item))) {
      return decimalValue(strip(item));
    }
    return null;
  }
  if (typeof item === 'string') {
    return normalised(item, false) || null;
  }
  return null;
}

// Dates (FR-012)

/**
 * `_date_holds()` with `_from_now()`: whether the date compares with the condition on the day of
 * sharing `sharedOn` (a day number). Null when the value isn't a date `_date()` can read, such as a
 * year alone
 */
export function dateHolds(condition: Condition, value: unknown, sharedOn: number): boolean | null {
  const day = dateOf(value);
  if (day === null) {
    return null;
  }
  switch (condition.operator) {
    case 'before':
    case 'after':
    case 'on': {
      const given = dateOf(condition.date);
      if (given === null) {
        throw new Error('A date rule has no date to compare with');
      }
      if (condition.operator === 'before') {
        return day < given;
      }
      if (condition.operator === 'after') {
        return day > given;
      }
      return day === given;
    }
    case 'at_least_years_ago':
      return sharedOn >= yearsAfter(day, whole(condition.years));
    case 'less_than_years_ago':
      return sharedOn < yearsAfter(day, whole(condition.years));
    case 'exactly_years_ago': {
      const years = whole(condition.years);
      return yearsAfter(day, years) <= sharedOn && sharedOn < yearsAfter(day, years + 1);
    }
    case 'at_least_from_now':
      return day >= fromNow(condition, sharedOn);
    case 'less_than_from_now':
      return day < fromNow(condition, sharedOn);
  }
  throw new Error('Unknown operator for a date rule');
}

/** `_from_now()`: the day `amount` years or months after the day of sharing */
function fromNow(condition: Condition, sharedOn: number): number {
  const amount = whole(condition.amount);
  if (condition.unit === 'years') {
    return yearsAfter(sharedOn, amount);
  }
  if (condition.unit === 'months') {
    return monthsAfter(sharedOn, amount);
  }
  throw new Error('A from-now rule has no unit');
}

/** `_whole()`: a rule's number of years or months, a whole number of at least 1 */
function whole(number: number | null | undefined): number {
  if (typeof number !== 'number' || !Number.isInteger(number) || number < 1) {
    throw new Error('A date rule has no whole number of at least 1');
  }
  return number;
}

/**
 * `_date()`: the day number of a `YYYY-MM-DD` text, stripped, that the calendar has; null for
 * anything else, such as a year alone. `date.fromisoformat()` reads ASCII digits only, as
 * `parseDayNumber()` does. A date-time throws: that part isn't ported (see the module's comment)
 */
function dateOf(value: unknown): number | null {
  if (typeof value !== 'string') {
    return null;
  }
  const text = strip(value);
  if (DATE.test(text)) {
    return parseDayNumber(text);
  }
  if (DATE_TIME.test(text)) {
    throw new Error('The test evaluator reads no date-times: deliver dates as YYYY-MM-DD');
  }
  return null;
}

/** Python's `shared_on` is always a date: a day number here */
function requireDay(day: number): void {
  if (!isDayNumber(day)) {
    throw new RangeError(`Not a day number: ${day}`);
  }
}
