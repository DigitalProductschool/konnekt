// Rules as formulas (specs/003-rule-consistency-checks, FR-007; research R3, R4; data-model.md,
// "Variables and literals" and "Formulas and questions"): `ruleFormula()` turns a rule of the rules
// state into a literal on one variable, with its values exactly as `_rule_outcome()` in
// backend/app/services/evaluation.py reads and compares them, so that the theories decide what the
// evaluator would. A rule on a licence class's date is `held(K) ∧ c(date_K)`, since the evaluator
// answers `not_met` for a class the licence doesn't list (FR-007, fifth bullet). `negate()` gives a
// formula's De Morgan dual for the questions of research R4, and `simplify()`, `allOf()` and
// `anyOf()` take `true` and `false` out of AND and OR.
//
// A rule that the evaluator couldn't evaluate, or that the save's checks would refuse, has no
// formula: `ruleFormula()` returns null for it and never throws, whatever the rules state holds.
// The checked tree (checkedTree.ts) leaves such a rule out, as it leaves out an incomplete one
import type { DocumentField, FieldPart } from '@connection-portal/api-types/document-types';
import type {
  Condition,
  RuleItem,
  RuleTarget,
} from '@connection-portal/api-types/form-connections';
import type { Option, OptionSet } from '@connection-portal/api-types/option-sets';

import { resolveTarget } from '../conditions';
import { LICENCE_CLASSES_SET } from '../constants';
import type { ResolvedTarget, RuleContext } from '../types';
import { parseDayNumber } from './calendar';
import { normalisedText } from './text';
import type {
  DateUnit,
  EnumOp,
  EnumTest,
  EnumValue,
  FixedDateOp,
  Formula,
  FromNowOp,
  Literal,
  LiteralTest,
  NumberOp,
  TextOp,
  Variable,
  YearsAgoOp,
} from './types';

/**
 * What `ruleFormula()` reads besides the rule: the checked tree's context (contracts/rule-checks.md,
 * `buildCheckedBranch()`), which is the rules modules' `RuleContext`.
 * - `documents`: the requested documents, each with only its requested fields
 *   (`requestedRuleDocuments()`), whose fields and parts carry `multiple_values`. A rule on data
 *   that isn't among them has no formula.
 * - `optionSets`: the value sets as loaded. A rule on an enum, or on a licence class's date, whose
 *   value set isn't loaded has no formula
 */
export type LiteralContext = RuleContext;

/** A rule as the checks read it (`ruleFormula()`) */
export interface RuleFormula {
  /**
   * One literal, not negated. For a licence class's date, `{ and: [held(K), c(date_K)] }`, where
   * `held(K)` is "Licence classes includes one of K"
   */
  formula: Formula;
  /**
   * The variables the formula uses, in its order: one, or for a licence class's date the classes'
   * variable, then the class's date. The same key always comes with the same variable, so they can
   * be collected by key (`CheckedBranch.variables`)
   */
  variables: Variable[];
}

/**
 * The part of the driving licence's `driving_privileges` that lists the classes held: `CLASSES` of
 * evaluation.py, whose variable `held(K)` reads
 */
const CLASSES_PART = 'classes';

/** The API's operators of each kind as the literals' tests: one per operator of `OPERATORS` */
const NUMBER_OPS: ReadonlyMap<string, NumberOp> = new Map([
  ['greater_than', 'gt'],
  ['less_than', 'lt'],
  ['equal_to', 'eq'],
  ['not_equal_to', 'ne'],
]);
const TEXT_OPS: ReadonlyMap<string, TextOp> = new Map([
  ['equal_to', 'eq'],
  ['not_equal_to', 'ne'],
  ['contains', 'contains'],
  ['not_contains', 'not_contains'],
]);
const ENUM_OPS: ReadonlyMap<string, EnumOp> = new Map([
  ['includes_one_of', 'one_of'],
  ['includes_none_of', 'none_of'],
]);
const FIXED_DATE_OPS: ReadonlyMap<string, FixedDateOp> = new Map([
  ['before', 'before'],
  ['after', 'after'],
  ['on', 'on'],
]);
const YEARS_AGO_OPS: ReadonlyMap<string, YearsAgoOp> = new Map([
  ['at_least_years_ago', 'at_least_years_ago'],
  ['less_than_years_ago', 'less_than_years_ago'],
  ['exactly_years_ago', 'exactly_years_ago'],
]);
const FROM_NOW_OPS: ReadonlyMap<string, FromNowOp> = new Map([
  ['at_least_from_now', 'at_least_from_now'],
  ['less_than_from_now', 'less_than_from_now'],
]);

/** `_DIGITS` of evaluation.py, for codes written as text, in ASCII digits */
const DIGITS = /^[0-9]+$/;

/** A value set's keys as the evaluator compares them */
interface SetKeys {
  /** `_has_integer_values()`: every option's value is a whole number, so the keys are codes */
  asCodes: boolean;
  /** `Variable.values`: the options' keys that the evaluator can read, each once, in set order */
  values: EnumValue[];
}

/**
 * Each value set's keys, by its options, computed once: building a rule's variable then takes
 * constant time, not the size of the set. The options of a loaded set don't change
 */
const SET_KEYS = new WeakMap<readonly Option[], SetKeys | null>();

/**
 * A variable's key: `document_type.field`, then `.part` for a field made of parts, then `#class`
 * for a licence class's date, such as `mdl.driving_privileges.issue_date#B`. The class is the
 * licence-class set's code as written, which the save's checks require. The key of a target that
 * `ruleFormula()` accepts
 */
export function variableKey(target: RuleTarget): string {
  const part = target.part ? `.${target.part}` : '';
  const licenceClass = target.licence_class ? `#${target.licence_class}` : '';
  return `${target.document_type}.${target.field}${part}${licenceClass}`;
}

/**
 * The rule's formula and its variables, or null when the rule has none: one literal on the
 * target's variable, with the values the evaluator compares (`_rule_outcome()`), and `negated`
 * false, which only the questions of research R4 set. A rule on a licence class K's date is
 * `{ and: [held(K), c(date_K)] }`, where `held(K)` is "Licence classes includes one of K".
 *
 * The literal's test, by the operators of `OPERATORS` (`rules/src/constants.ts`):
 * - number: `gt`, `lt`, `eq`, `ne` with the rule's number as given, decimals kept;
 * - text: `eq`, `ne`, `contains`, `not_contains` with the rule's text through `normalisedText()`
 *   and `matchCase` from the rule's `match_case` (absent counts as false, as `bool(None)`);
 * - enum: `one_of`, `none_of` with the rule's values as `_enum_key()` reads them, codes as
 *   integers and texts case-folded, each once in the rule's order;
 * - date: `before`, `after`, `on` with the date as a day number; `at_least_years_ago`,
 *   `less_than_years_ago`, `exactly_years_ago` with `count` the years and `unit` 'years';
 *   `at_least_from_now`, `less_than_from_now` with `count` the amount and the rule's `unit`.
 *
 * Null, never an exception, for a rule that the evaluator couldn't evaluate or the save's checks
 * would refuse (checkedTree.ts leaves it out):
 * - without a target or a condition, or with a target that isn't among `context.documents`, an
 *   image, or a field made of parts without one of its parts;
 * - with a part or a class that its field or part doesn't take, or a class that isn't a code of
 *   the licence-class set (the save's `_clean_target()`);
 * - with an operator that isn't one of the kind's, or a value it can't read: a number that isn't
 *   finite, a text that is empty after `normalisedText()`, no readable enum value, a date that
 *   isn't `YYYY-MM-DD` of the calendar, a count of years or months that isn't a whole number from
 *   1, or a unit other than years or months;
 * - on an enum, or a licence class's date, whose value set isn't loaded, is empty, or has no
 *   value the evaluator can read.
 *
 * Linear in the size of the rule: each value set's keys are computed once
 */
export function ruleFormula(
  rule: Pick<RuleItem, 'target' | 'condition'>,
  context: LiteralContext
): RuleFormula | null {
  const { target, condition } = rule;
  const resolved = checkedTarget(target, context);
  if (!target || !condition || !resolved) {
    return null;
  }
  const variable = variableOf(variableKey(target), resolved, context.optionSets);
  const test = testOf(condition, resolved, context.optionSets);
  if (!variable || !test) {
    return null;
  }
  const literal = literalOf(variable, test);
  if (resolved.licenceClass === null) {
    return { formula: literal, variables: [variable] };
  }
  const held = heldOf(target, resolved, context.optionSets);
  if (!held) {
    return null;
  }
  return { formula: { and: [held.formula, literal] }, variables: [...held.variables, variable] };
}

/**
 * The formula's negation, its De Morgan dual: `true` and `false` swap, AND and OR swap, and each
 * literal's `negated` flips. A licence class's date `held(K) ∧ c(date_K)` becomes
 * `¬held(K) ∨ ¬c(date_K)`. It builds a new formula and leaves the given one as it is, with the
 * same shape, so `negate(negate(f))` equals `f`. It doesn't simplify (`simplify()`). Linear in
 * the size of the formula
 */
export function negate(formula: Formula): Formula {
  if (typeof formula === 'boolean') {
    return !formula;
  }
  if ('and' in formula) {
    return { or: formula.and.map(negate) };
  }
  if ('or' in formula) {
    return { and: formula.or.map(negate) };
  }
  return { ...formula, negated: !formula.negated };
}

/**
 * The formula without `true` and `false` inside AND and OR, from the innermost level out: AND
 * leaves out `true` and is `false` with a `false`, OR leaves out `false` and is `true` with a
 * `true`. A level left with one formula is that formula, and one left with none is its unit:
 * `true` for AND and `false` for OR. So the result is `true`, `false`, or a formula without
 * either, which every citizen meets or none does exactly when the given one is. Literals stay
 * as they are, and nothing else is merged. Linear in the size of the formula
 */
export function simplify(formula: Formula): Formula {
  if (typeof formula === 'boolean' || isLiteral(formula)) {
    return formula;
  }
  return 'and' in formula ? allOf(formula.and.map(simplify)) : anyOf(formula.or.map(simplify));
}

/**
 * The AND of `formulas`, without `true`: `false` when one of them is `false`, `true` when none is
 * left, and the formula itself when one is. It looks at the formulas themselves, not inside them,
 * so give it simplified formulas for a simplified result
 */
export function allOf(formulas: readonly Formula[]): Formula {
  const kept: Formula[] = [];
  for (const formula of formulas) {
    if (formula === false) {
      return false;
    }
    if (formula !== true) {
      kept.push(formula);
    }
  }
  return levelOf(kept, true, (members) => ({ and: members }));
}

/**
 * The OR of `formulas`, without `false`: `true` when one of them is `true`, `false` when none is
 * left, and the formula itself when one is. It looks at the formulas themselves, not inside them,
 * so give it simplified formulas for a simplified result
 */
export function anyOf(formulas: readonly Formula[]): Formula {
  const kept: Formula[] = [];
  for (const formula of formulas) {
    if (formula === true) {
      return true;
    }
    if (formula !== false) {
      kept.push(formula);
    }
  }
  return levelOf(kept, false, (members) => ({ or: members }));
}

/** Whether a formula is a literal, rather than `true`, `false`, an AND or an OR */
export function isLiteral(formula: Formula): formula is Literal {
  return typeof formula !== 'boolean' && 'variable' in formula;
}

/** A level's formula from its members: its unit without any, the member alone with one */
function levelOf(
  members: Formula[],
  unit: boolean,
  level: (members: Formula[]) => Formula
): Formula {
  if (members.length === 0) {
    return unit;
  }
  return members.length === 1 ? members[0] : level(members);
}

/**
 * The target looked up in the documents (`resolveTarget()`), if the evaluator reads it and the
 * save's checks accept it: a field without parts names no part or class, a part names a class
 * exactly when it is per class, and that class is a code of the licence-class set. Null otherwise
 */
function checkedTarget(target: RuleTarget | null, context: LiteralContext): ResolvedTarget | null {
  const resolved = resolveTarget(target, context.documents);
  if (!target || !resolved || resolved.kind === null) {
    return null;
  }
  const part = target.part ?? null;
  const licenceClass = target.licence_class ?? null;
  if (resolved.part === null) {
    return part === null && licenceClass === null ? resolved : null;
  }
  if (!resolved.part.per_licence_class) {
    return licenceClass === null ? resolved : null;
  }
  const classes = context.optionSets.find((set) => set.key === LICENCE_CLASSES_SET)?.options;
  return classes?.some((option) => option.value === licenceClass) ? resolved : null;
}

/**
 * The variable of a resolved target under `key`: its kind, and for an enum `multiple_values` of
 * its part, or of its field without parts, and the value set's keys. Null for an enum whose set
 * isn't loaded or has no key the evaluator can read
 */
function variableOf(
  key: string,
  resolved: ResolvedTarget,
  optionSets: readonly OptionSet[]
): Variable | null {
  const { kind } = resolved;
  if (kind === null) {
    return null;
  }
  if (kind !== 'enum') {
    return { key, kind, multiple: false, values: [] };
  }
  const keys = setKeysOf(resolved.optionSet, optionSets);
  if (!keys || keys.values.length === 0) {
    return null;
  }
  const declared: DocumentField | FieldPart = resolved.part ?? resolved.field;
  return { key, kind, multiple: declared.multiple_values, values: keys.values };
}

/** The test of a condition on a target of its kind, or null when the evaluator can't read it */
function testOf(
  condition: Condition,
  resolved: ResolvedTarget,
  optionSets: readonly OptionSet[]
): LiteralTest | null {
  const { operator } = condition;
  switch (resolved.kind) {
    case 'number':
      return numberTestOf(operator, condition.value);
    case 'text':
      return textTestOf(operator, condition.value, condition.match_case === true);
    case 'enum':
      return enumTestOf(operator, condition.values, setKeysOf(resolved.optionSet, optionSets));
    case 'date':
      return dateTestOf(condition);
    case null:
      return null;
  }
}

/** `_number_holds()`: the rule's number as `_number()` reads it, a finite number, not a boolean */
function numberTestOf(operator: string, value: unknown): LiteralTest | null {
  const op = NUMBER_OPS.get(operator);
  if (!op || typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return { kind: 'number', op, value };
}

/** `_text_holds()`: the rule's text through `_normalised_text()`, which mustn't leave it empty */
function textTestOf(operator: string, value: unknown, matchCase: boolean): LiteralTest | null {
  const op = TEXT_OPS.get(operator);
  if (!op || typeof value !== 'string') {
    return null;
  }
  const text = normalisedText(value, matchCase);
  return text === '' ? null : { kind: 'text', op, text, matchCase };
}

/** `_enum_holds()`: the rule's values as `_enum_key()` reads them, each once, at least one */
function enumTestOf(
  operator: string,
  values: Condition['values'],
  keys: SetKeys | null
): EnumTest | null {
  const op = ENUM_OPS.get(operator);
  if (!op || !keys || !Array.isArray(values)) {
    return null;
  }
  const chosen = distinctKeys(values, keys.asCodes);
  return chosen.length === 0 ? null : { kind: 'enum', op, values: chosen };
}

/** `_date_holds()`: a fixed date as a day number, or a whole count of years or months from 1 */
function dateTestOf(condition: Condition): LiteralTest | null {
  const { operator } = condition;
  const fixed = FIXED_DATE_OPS.get(operator);
  if (fixed) {
    const date = parseDayNumber(condition.date);
    return date === null ? null : { kind: 'date', op: fixed, date };
  }
  const yearsAgo = YEARS_AGO_OPS.get(operator);
  if (yearsAgo) {
    return isWhole(condition.years)
      ? { kind: 'date', op: yearsAgo, count: condition.years, unit: 'years' }
      : null;
  }
  const fromNow = FROM_NOW_OPS.get(operator);
  const unit = unitOf(condition.unit);
  if (fromNow && unit && isWhole(condition.amount)) {
    return { kind: 'date', op: fromNow, count: condition.amount, unit };
  }
  return null;
}

/**
 * `held(K)` for a rule on class K's date: "Licence classes includes one of K" on the variable of
 * the field's classes part, with K as `_enum_key()` reads it. `_privileges_value()` finds the
 * class's entry by its code stripped and case-folded, the classes' keys are the codes stripped,
 * case-folded and in NFC, and the codes of the licence-class set are ASCII, where the two agree:
 * so `held(K)` holds exactly when the evaluator finds the class's entry
 */
function heldOf(
  target: RuleTarget,
  resolved: ResolvedTarget,
  optionSets: readonly OptionSet[]
): RuleFormula | null {
  const part = resolved.field.parts?.find((entry) => entry.key === CLASSES_PART);
  if (!part || part.kind !== 'enum' || resolved.licenceClass === null) {
    return null;
  }
  const classes: ResolvedTarget = {
    ...resolved,
    part,
    licenceClass: null,
    kind: 'enum',
    optionSet: part.option_set,
  };
  const key = variableKey({ ...target, part: CLASSES_PART, licence_class: null });
  const variable = variableOf(key, classes, optionSets);
  const test = enumTestOf(
    'includes_one_of',
    [resolved.licenceClass],
    setKeysOf(part.option_set, optionSets)
  );
  if (!variable || !test) {
    return null;
  }
  return { formula: literalOf(variable, test), variables: [variable] };
}

/** A rule's literal on `variable`: `negated` is set by the questions of research R4 only */
function literalOf(variable: Variable, test: LiteralTest): Literal {
  return { variable: variable.key, test, negated: false };
}

/** The keys of a value set, computed once per loaded set, or null when it isn't loaded */
function setKeysOf(key: string | null, optionSets: readonly OptionSet[]): SetKeys | null {
  const options = optionSets.find((set) => set.key === key)?.options;
  if (!options) {
    return null;
  }
  let keys = SET_KEYS.get(options);
  if (keys === undefined) {
    keys = computedSetKeys(options);
    SET_KEYS.set(options, keys);
  }
  return keys;
}

/**
 * A set's keys: codes when every option's value is a whole number (`_has_integer_values()`),
 * else case-folded texts. Null for an empty set, which the evaluator refuses
 */
function computedSetKeys(options: readonly Option[]): SetKeys | null {
  if (options.length === 0) {
    return null;
  }
  const asCodes = options.every(
    (option) => typeof option.value === 'number' && Number.isInteger(option.value)
  );
  return {
    asCodes,
    values: distinctKeys(
      options.map((option) => option.value),
      asCodes
    ),
  };
}

/** The keys that `_enum_key()` reads of `items`, each once, in their order */
function distinctKeys(items: readonly unknown[], asCodes: boolean): EnumValue[] {
  const keys = new Set<EnumValue>();
  for (const item of items) {
    const key = enumKey(item, asCodes);
    if (key !== null) {
      keys.add(key);
    }
  }
  return [...keys];
}

/**
 * `_enum_key()`: a code as an integer, from a whole number or a text of digits with Python's
 * whitespace around it; a text through `normalisedText()` ignoring letter case, unless that leaves
 * it empty. Null for anything else. Python's `\d` also takes other scripts' digits, which no code
 * of a value set is written in
 */
function enumKey(item: unknown, asCodes: boolean): EnumValue | null {
  if (asCodes) {
    if (typeof item === 'number') {
      return Number.isInteger(item) ? item : null;
    }
    const text = typeof item === 'string' ? normalisedText(item, true) : '';
    return DIGITS.test(text) ? Number(text) : null;
  }
  const text = typeof item === 'string' ? normalisedText(item, false) : '';
  return text === '' ? null : text;
}

/** `_whole()`: a count of years or months, a whole number of at least 1 */
function isWhole(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

/** The unit of a from-now condition, or null for anything but years and months */
function unitOf(unit: unknown): DateUnit | null {
  return unit === 'years' || unit === 'months' ? unit : null;
}
