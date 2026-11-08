// The enum theory (specs/003-rule-consistency-checks, FR-007; research R3, R6, R9): whether the
// literals of one enum variable can be met together.
//
// Values compare as `_enum_holds()` in backend/app/services/evaluation.py compares them: keys of
// the variable's set, codes as integers and texts case-folded, in the form `literals.ts` gives
// them, so plain equality decides. An applicant's values are a non-empty list, one value long
// unless the variable is `multiple`, as the evaluator reads a single value as a list of one. A
// negated literal swaps "includes one of" and "includes none of".
// - One value: the allowed values are the set, within every "includes one of", without every
//   "includes none of". The literals can be met when one value is left.
// - Several values: the applicant's values lie in the set without every "includes none of", and
//   meet every "includes one of" V. The literals can be met when each V keeps a value outside the
//   "none of" values, and the set keeps at least one, since the values can't be empty
import type {
  EnumTest,
  EnumValue,
  Literal,
  Theory,
  TheoryAnswer,
  UnsatAnswer,
  Variable,
} from './types';

const UNSAT: UnsatAnswer = { verdict: 'unsat' };

/**
 * Whether an applicant with `values` (non-empty, a single value as a list of one) meets the
 * literal, as the evaluator compares, with `negated` flipping it
 */
export function enumHolds(literal: Literal<EnumTest>, values: readonly EnumValue[]): boolean {
  let includes = false;
  for (const value of values) {
    if (literal.test.values.includes(value)) {
      includes = true;
      break;
    }
  }
  return includes === wantsOneOf(literal);
}

/**
 * Whether values of `variable` meet every literal: one value, or a non-empty set of values when
 * the variable is `multiple`. The witness is a list of one value, or for `multiple` of distinct
 * values: for each "includes one of" that the values before it don't meet, its first allowed
 * value, or the set's first allowed value without any. Never `'unknown'`
 */
export function decideEnum(
  literals: readonly Literal<EnumTest>[],
  variable: Variable
): TheoryAnswer<readonly EnumValue[]> {
  return variable.multiple
    ? decideSeveral(literals, variable.values)
    : decideOne(literals, variable.values);
}

/** The enum theory, for the solver (`Theory`) */
export const enumTheory: Theory<EnumTest, readonly EnumValue[]> = {
  holds: enumHolds,
  decide: decideEnum,
};

/** Whether the literal asks for one of its values: "includes one of", or a negated "none of" */
function wantsOneOf(literal: Literal<EnumTest>): boolean {
  return (literal.test.op === 'one_of') !== literal.negated;
}

/**
 * One value: the first value of the set that every literal allows. The candidates are the values
 * of the shortest "includes one of", since every allowed value is among them, or else the set
 */
function decideOne(
  literals: readonly Literal<EnumTest>[],
  set: readonly EnumValue[]
): TheoryAnswer<readonly EnumValue[]> {
  let candidates = set;
  for (const literal of literals) {
    if (wantsOneOf(literal) && literal.test.values.length < candidates.length) {
      candidates = literal.test.values;
    }
  }
  for (const value of candidates) {
    if ((candidates === set || set.includes(value)) && allowsAlone(literals, value)) {
      return { verdict: 'sat', witness: [value] };
    }
  }
  return UNSAT;
}

/** Whether an applicant whose only value is `value` meets every literal */
function allowsAlone(literals: readonly Literal<EnumTest>[], value: EnumValue): boolean {
  for (const literal of literals) {
    if (literal.test.values.includes(value) !== wantsOneOf(literal)) {
      return false;
    }
  }
  return true;
}

/**
 * Several values: for each "includes one of" that the values chosen so far don't meet, its first
 * value of the set that no "includes none of" excludes; without any, the set's first such value
 */
function decideSeveral(
  literals: readonly Literal<EnumTest>[],
  set: readonly EnumValue[]
): TheoryAnswer<readonly EnumValue[]> {
  const witness: EnumValue[] = [];
  for (const literal of literals) {
    if (!wantsOneOf(literal) || enumHolds(literal, witness)) {
      continue;
    }
    const value = firstAllowed(literal.test.values, set, literals);
    if (value === undefined) {
      return UNSAT;
    }
    witness.push(value);
  }
  if (witness.length === 0) {
    const value = firstAllowed(set, set, literals);
    if (value === undefined) {
      return UNSAT;
    }
    witness.push(value);
  }
  return { verdict: 'sat', witness };
}

/** The first of `candidates` that is in the set and that no "includes none of" excludes */
function firstAllowed(
  candidates: readonly EnumValue[],
  set: readonly EnumValue[],
  literals: readonly Literal<EnumTest>[]
): EnumValue | undefined {
  for (const value of candidates) {
    if ((candidates === set || set.includes(value)) && !excluded(literals, value)) {
      return value;
    }
  }
  return undefined;
}

/** Whether an "includes none of" names `value` */
function excluded(literals: readonly Literal<EnumTest>[], value: EnumValue): boolean {
  for (const literal of literals) {
    if (!wantsOneOf(literal) && literal.test.values.includes(value)) {
      return true;
    }
  }
  return false;
}
