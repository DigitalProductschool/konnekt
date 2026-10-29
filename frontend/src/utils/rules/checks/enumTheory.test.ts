import { describe, expect, it } from 'vitest';

import { OPTION_SETS } from '../testData';
import { decideEnum, enumHolds, enumTheory } from './enumTheory';
import vectors from './fixtures/evaluator-vectors.json';
import type { EnumOp, EnumTest, EnumValue, Literal, Variable, Verdict } from './types';

/** The part of a `rule_outcomes` vector that an enum literal replays */
interface OutcomeVector {
  condition: { operator: string; values?: (string | number)[] };
  description: string;
  kind: string;
  option_set: string | null;
  outcome: string;
  target: { document_type: string; field: string; part: string | null };
  value: unknown;
}

/** The API's enum operators as the literals' tests, as `literals.ts` maps them */
const OPS: Record<string, EnumOp> = { includes_one_of: 'one_of', includes_none_of: 'none_of' };

const ENUM_OUTCOMES = (vectors.rule_outcomes as OutcomeVector[]).filter(
  (vector) => vector.kind === 'enum' && vector.outcome !== 'not_checked'
);

/** Countries as the evaluator compares them: case-folded */
const COUNTRIES: EnumValue[] = ['de', 'at', 'fr', 'it'];

/** "Personal ID – Nationality", which holds several countries (`multiple_values`) */
const PID_NATIONALITIES: Variable = {
  key: 'pid.nationalities',
  kind: 'enum',
  multiple: true,
  values: COUNTRIES,
};

/** "Driving licence – Nationality", which holds one country */
const MDL_NATIONALITY: Variable = {
  key: 'mdl.nationality',
  kind: 'enum',
  multiple: false,
  values: COUNTRIES,
};

/** "Driving licence – Licence classes", which holds several classes (`multiple_values`) */
const LICENCE_CLASSES: Variable = {
  key: 'mdl.driving_privileges.classes',
  kind: 'enum',
  multiple: true,
  values: ['a', 'b', 'be', 'c'],
};

/** "Personal ID – Sex", whose codes compare as integers */
const SEX: Variable = { key: 'pid.sex', kind: 'enum', multiple: false, values: [0, 1, 2] };

/** 2026-10-28 as a day number, which the enum theory doesn't read */
const TODAY = 739917;

function literal(key: string, op: EnumOp, values: EnumValue[], negated = false): Literal<EnumTest> {
  return { variable: key, test: { kind: 'enum', op, values }, negated };
}

const oneOf = (variable: Variable, ...values: EnumValue[]) =>
  literal(variable.key, 'one_of', values);
const noneOf = (variable: Variable, ...values: EnumValue[]) =>
  literal(variable.key, 'none_of', values);

/** The literal's negation: the same test with `negated` flipped */
function not(of: Literal<EnumTest>): Literal<EnumTest> {
  return { ...of, negated: !of.negated };
}

function meetsAll(literals: Literal<EnumTest>[], values: readonly EnumValue[]): boolean {
  return literals.every((each) => enumHolds(each, values));
}

/**
 * The verdict, once a witness is checked: values an applicant can have (one value of the set, or
 * distinct values of it for `multiple`) that meet every literal
 */
function verdictOf(literals: Literal<EnumTest>[], variable: Variable): Verdict {
  const answer = decideEnum(literals, variable);
  if (answer.verdict === 'sat') {
    const { witness } = answer;
    expect(variable.multiple ? witness.length > 0 : witness.length === 1).toBe(true);
    expect(new Set(witness).size).toBe(witness.length);
    expect(witness.every((value) => variable.values.includes(value))).toBe(true);
    expect(meetsAll(literals, witness)).toBe(true);
  }
  return answer.verdict;
}

/** The witness, or null when the literals can't be met */
function witnessOf(literals: Literal<EnumTest>[], variable: Variable): readonly EnumValue[] | null {
  const answer = decideEnum(literals, variable);
  return answer.verdict === 'sat' ? answer.witness : null;
}

/** Every non-empty subset of `values` */
function subsets(values: readonly EnumValue[]): EnumValue[][] {
  return Array.from({ length: 2 ** values.length - 1 }, (_, index) =>
    values.filter((_, bit) => ((index + 1) >> bit) & 1)
  );
}

/** A seeded generator of numbers in [0, 1) (mulberry32), so that a failure can be replayed */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** Whether the value set holds codes, which compare as integers (`_has_integer_values()`) */
function holdsCodes(optionSet: string | null): boolean {
  const set = OPTION_SETS.find((entry) => entry.key === optionSet);
  if (!set) {
    throw new Error(`testData has no value set ${String(optionSet)}`);
  }
  return set.options.every((option) => typeof option.value === 'number');
}

/**
 * The keys of enum values as `_enum_key()` reads them: codes as integers, texts trimmed and
 * case-folded, without those it can't read. The vectors' texts are printable ASCII, where
 * Python's `strip()` and `casefold()` are `trim()` and `toLowerCase()`; `literals.ts` folds the
 * rules' values with `normalisedText()`
 */
function keysOf(items: readonly unknown[], asCodes: boolean): EnumValue[] {
  return items.flatMap((item): EnumValue[] => {
    if (typeof item === 'number') {
      return asCodes && Number.isInteger(item) ? [item] : [];
    }
    if (typeof item !== 'string') {
      return [];
    }
    if (![...item].every((character) => character >= ' ' && character <= '~')) {
      throw new Error(`Not printable ASCII: ${JSON.stringify(item)}`);
    }
    const text = item.trim();
    if (asCodes) {
      return /^\d+$/.test(text) ? [Number(text)] : [];
    }
    return text === '' ? [] : [text.toLowerCase()];
  });
}

/**
 * What the rule reads of the delivered value (`_value_of()`): a part of the place of birth, the
 * class codes of the driving privileges, or the field, a single value as a list of one
 */
function deliveredItems(vector: OutcomeVector): unknown[] {
  const { part } = vector.target;
  if (part === 'classes') {
    return (vector.value as { vehicle_category_code?: unknown }[]).map(
      (entry) => entry.vehicle_category_code
    );
  }
  if (part !== null) {
    return [(vector.value as Record<string, unknown>)[part]];
  }
  return Array.isArray(vector.value) ? vector.value : [vector.value];
}

describe('decideEnum', () => {
  it('meets no literals with the set’s first value', () => {
    expect(decideEnum([], MDL_NATIONALITY)).toEqual({ verdict: 'sat', witness: ['de'] });
    expect(decideEnum([], PID_NATIONALITIES)).toEqual({ verdict: 'sat', witness: ['de'] });
  });

  describe('EC "Fields with several values"', () => {
    it('meets the Personal ID’s Nationality "includes one of Germany" and "of Italy" together', () => {
      const literals = [oneOf(PID_NATIONALITIES, 'de'), oneOf(PID_NATIONALITIES, 'it')];
      expect(verdictOf(literals, PID_NATIONALITIES)).toBe('sat');
      expect(witnessOf(literals, PID_NATIONALITIES)).toEqual(['de', 'it']);
    });

    it('can’t meet them together on the driving licence’s Nationality, which holds one', () => {
      const literals = [oneOf(MDL_NATIONALITY, 'de'), oneOf(MDL_NATIONALITY, 'it')];
      expect(verdictOf(literals, MDL_NATIONALITY)).toBe('unsat');
    });

    it('meets Licence classes "includes one of B" and "includes one of C" together', () => {
      const literals = [oneOf(LICENCE_CLASSES, 'b'), oneOf(LICENCE_CLASSES, 'c')];
      expect(verdictOf(literals, LICENCE_CLASSES)).toBe('sat');
      expect(witnessOf(literals, LICENCE_CLASSES)).toEqual(['b', 'c']);
    });
  });

  describe('EC "An enum rule with every value"', () => {
    const variables = [MDL_NATIONALITY, PID_NATIONALITIES, LICENCE_CLASSES, SEX];

    it.each(variables)('can’t meet "includes none of" every value of $key', (variable) => {
      expect(verdictOf([noneOf(variable, ...variable.values)], variable)).toBe('unsat');
    });

    it.each(variables)('always meets "includes one of" every value of $key', (variable) => {
      const everyValue = oneOf(variable, ...variable.values);
      expect(verdictOf([everyValue], variable)).toBe('sat');
      // Its negation can't be met
      expect(verdictOf([not(everyValue)], variable)).toBe('unsat');
    });
  });

  describe('one value', () => {
    it('allows the set within every "includes one of", without every "includes none of"', () => {
      const literals = [
        oneOf(MDL_NATIONALITY, 'de', 'at', 'fr'),
        noneOf(MDL_NATIONALITY, 'de'),
        oneOf(MDL_NATIONALITY, 'at', 'fr', 'it'),
        noneOf(MDL_NATIONALITY, 'at'),
      ];
      expect(witnessOf(literals, MDL_NATIONALITY)).toEqual(['fr']);
      expect(verdictOf([...literals, noneOf(MDL_NATIONALITY, 'fr')], MDL_NATIONALITY)).toBe(
        'unsat'
      );
    });

    it('compares codes as integers', () => {
      expect(witnessOf([oneOf(SEX, 1, 2), noneOf(SEX, 1)], SEX)).toEqual([2]);
      expect(verdictOf([oneOf(SEX, 1), noneOf(SEX, 1)], SEX)).toBe('unsat');
      expect(verdictOf([oneOf(SEX, 1), oneOf(SEX, 2)], SEX)).toBe('unsat');
    });
  });

  describe('several values', () => {
    it('needs each "includes one of" to keep a value outside the "includes none of" values', () => {
      const literals = [
        oneOf(PID_NATIONALITIES, 'de', 'at'),
        noneOf(PID_NATIONALITIES, 'de'),
        oneOf(PID_NATIONALITIES, 'fr'),
      ];
      expect(witnessOf(literals, PID_NATIONALITIES)).toEqual(['at', 'fr']);
      expect(verdictOf([...literals, noneOf(PID_NATIONALITIES, 'at')], PID_NATIONALITIES)).toBe(
        'unsat'
      );
    });

    it('needs a value: the set without the "includes none of" values keeps one', () => {
      expect(witnessOf([noneOf(LICENCE_CLASSES, 'a', 'b', 'be')], LICENCE_CLASSES)).toEqual(['c']);
      const literals = [noneOf(LICENCE_CLASSES, 'a', 'b'), noneOf(LICENCE_CLASSES, 'be', 'c')];
      expect(verdictOf(literals, LICENCE_CLASSES)).toBe('unsat');
    });

    it('lets one value meet several "includes one of"', () => {
      const literals = [oneOf(LICENCE_CLASSES, 'be'), oneOf(LICENCE_CLASSES, 'b', 'be')];
      expect(witnessOf(literals, LICENCE_CLASSES)).toEqual(['be']);
    });
  });

  describe('a negated literal', () => {
    it.each([MDL_NATIONALITY, PID_NATIONALITIES])(
      'swaps "includes one of" and "includes none of" on $key',
      (variable) => {
        expect(verdictOf([oneOf(variable, 'de'), not(oneOf(variable, 'de'))], variable)).toBe(
          'unsat'
        );
        expect(witnessOf([not(oneOf(variable, 'de', 'at'))], variable)).toEqual(['fr']);
        expect(witnessOf([not(noneOf(variable, 'it'))], variable)).toEqual(['it']);
      }
    );
  });

  it('never takes a rule’s value outside the set for an applicant’s', () => {
    expect(verdictOf([oneOf(MDL_NATIONALITY, 'xx')], MDL_NATIONALITY)).toBe('unsat');
    expect(verdictOf([oneOf(PID_NATIONALITIES, 'xx')], PID_NATIONALITIES)).toBe('unsat');
    expect(witnessOf([oneOf(PID_NATIONALITIES, 'xx', 'fr')], PID_NATIONALITIES)).toEqual(['fr']);
  });

  it.each([false, true])(
    'answers as an enumeration of the values, for 1000 seeded sets of literals (multiple: %s)',
    (multiple) => {
      const set: EnumValue[] = ['a', 'b', 'c', 'd'];
      const variable: Variable = { key: 'test.enum', kind: 'enum', multiple, values: set };
      // Every value an applicant can have: one value, or every non-empty subset
      const applicants = multiple ? subsets(set) : set.map((value) => [value]);
      // The rules' values may name a value outside the set
      const named = [...set, 'z'];
      const ops: EnumOp[] = ['one_of', 'none_of'];
      const random = seeded(multiple ? 9 : 3);
      for (let run = 0; run < 1000; run += 1) {
        const literals = Array.from({ length: 1 + Math.floor(random() * 4) }, () => {
          const values = named.filter(() => random() < 0.4);
          return literal(
            variable.key,
            ops[Math.floor(random() * ops.length)],
            values.length > 0 ? values : [named[Math.floor(random() * named.length)]],
            random() < 0.3
          );
        });
        const met = applicants.some((values) => meetsAll(literals, values));
        const context = `run ${run}: ${JSON.stringify(literals)}`;
        expect(verdictOf(literals, variable), context).toBe(met ? 'sat' : 'unsat');
      }
    }
  );

  it('is the solver’s enum theory', () => {
    const literals = [oneOf(MDL_NATIONALITY, 'de'), oneOf(MDL_NATIONALITY, 'it')];
    expect(enumTheory.decide(literals, MDL_NATIONALITY, TODAY)).toEqual({ verdict: 'unsat' });
    expect(enumTheory.holds(oneOf(MDL_NATIONALITY, 'de'), ['de'], TODAY)).toBe(true);
  });
});

describe('enumHolds, the membership test', () => {
  it('has enum vectors to replay', () => {
    expect(ENUM_OUTCOMES.length).toBeGreaterThan(0);
  });

  it.each(ENUM_OUTCOMES)('agrees with the evaluator: $description', (vector) => {
    const asCodes = holdsCodes(vector.option_set);
    const { document_type: documentType, field, part } = vector.target;
    const test = literal(
      part === null ? `${documentType}.${field}` : `${documentType}.${field}.${part}`,
      OPS[vector.condition.operator],
      keysOf(vector.condition.values ?? [], asCodes)
    );
    const values = keysOf(deliveredItems(vector), asCodes);
    expect(values.length).toBeGreaterThan(0);
    expect(enumHolds(test, values)).toBe(vector.outcome === 'met');
    expect(enumHolds(not(test), values)).toBe(vector.outcome !== 'met');
  });
});
