import type { Condition, RuleTarget } from '@connection-portal/api-types/form-connections';
import { describe, expect, it } from 'vitest';

import { resolveTarget } from './conditions';
import {
  dataOfResolved,
  optionLabel,
  ruleFieldLabel,
  statementOf,
  statementPartsOf,
  subjectOf,
  symbolOf,
} from './statements';
import { CONTEXT, MDL, OPTION_SETS, PID, target, US1_RULES } from './testData';

function statement(ruleTarget: RuleTarget, condition: Condition): string | undefined {
  return statementOf({ target: ruleTarget, condition }, CONTEXT)?.text;
}

describe('statementOf', () => {
  it('reads US1’s rules in FR-005’s words (F1, F5, F32)', () => {
    expect(US1_RULES.map((rule) => statementOf(rule, CONTEXT)?.text)).toEqual([
      'Personal ID · Date of birth (Age) is at least 21 years old',
      'Driving licence · Licence classes includes one of B',
      'Driving licence · Licence class B – Issue date is at least 2 years ago',
    ]);
  });

  it('splits a statement into its subject, its predicate and the design’s chip', () => {
    expect(statementOf(US1_RULES[0], CONTEXT)).toEqual({
      subject: 'Personal ID · Date of birth (Age)',
      predicate: 'is at least 21 years old',
      symbol: '≥',
      text: 'Personal ID · Date of birth (Age) is at least 21 years old',
    });
  });

  describe('dates', () => {
    it.each([
      ['at_least_years_ago', 18, 'is at least 18 years old'],
      ['less_than_years_ago', 66, 'is less than 66 years old'],
      ['exactly_years_ago', 1, 'is exactly 1 year old'],
    ])('words %s on a Date of birth as an age', (operator, years, predicate) => {
      expect(statement(target('pid', 'birthdate'), { operator, years })).toBe(
        `Personal ID · Date of birth (Age) ${predicate}`
      );
      expect(statement(target('mdl', 'birth_date'), { operator, years })).toBe(
        `Driving licence · Date of birth (Age) ${predicate}`
      );
    });

    it.each([
      ['at_least_years_ago', 2, 'is at least 2 years ago'],
      ['less_than_years_ago', 1, 'is less than 1 year ago'],
      ['exactly_years_ago', 3, 'is exactly 3 years ago'],
    ])('words %s on every other date as years ago', (operator, years, predicate) => {
      expect(statement(target('pid', 'date_of_issuance'), { operator, years })).toBe(
        `Personal ID · Issue date ${predicate}`
      );
    });

    it('counts from now in years or months, without "left" (F2)', () => {
      const expiry = target('mdl', 'expiry_date');
      expect(statement(expiry, { operator: 'at_least_from_now', amount: 6, unit: 'months' })).toBe(
        'Driving licence · Expiry date is at least 6 months from now'
      );
      expect(statement(expiry, { operator: 'less_than_from_now', amount: 1, unit: 'years' })).toBe(
        'Driving licence · Expiry date is less than 1 year from now'
      );
      expect(statement(expiry, { operator: 'at_least_from_now', amount: 1, unit: 'months' })).toBe(
        'Driving licence · Expiry date is at least 1 month from now'
      );
    });

    it('writes fixed dates in the design’s format', () => {
      const issued = target('pid', 'date_of_issuance');
      expect(statement(issued, { operator: 'before', date: '2020-01-01' })).toBe(
        'Personal ID · Issue date is before 01.01.2020'
      );
      expect(statement(issued, { operator: 'after', date: '2020-01-01' })).toBe(
        'Personal ID · Issue date is after 01.01.2020'
      );
      expect(statement(issued, { operator: 'on', date: '2005-10-23' })).toBe(
        'Personal ID · Issue date is 23.10.2005'
      );
    });

    it('reads a class’s expiry date with the class', () => {
      expect(
        statement(target('mdl', 'driving_privileges', 'expiry_date', 'CE'), {
          operator: 'at_least_from_now',
          amount: 2,
          unit: 'years',
        })
      ).toBe('Driving licence · Licence class CE – Expiry date is at least 2 years from now');
    });
  });

  it.each([
    ['greater_than', 180, 'is greater than 180'],
    ['less_than', 150, 'is less than 150'],
    ['equal_to', 175.5, 'is equal to 175.5'],
    ['not_equal_to', 0, 'is not equal to 0'],
  ])('reads the number condition %s', (operator, value, predicate) => {
    expect(statement(target('mdl', 'height'), { operator, value })).toBe(
      `Driving licence · Height (cm) ${predicate}`
    );
  });

  it.each([
    ['equal_to', false, 'is equal to "Stuttgart", ignoring letter case'],
    ['not_equal_to', true, 'is not equal to "Stuttgart", matching letter case'],
    ['contains', false, 'contains "Stuttgart", ignoring letter case'],
    ['not_contains', true, 'doesn’t contain "Stuttgart", matching letter case'],
  ])('reads the text condition %s with its letter case (F7)', (operator, matchCase, predicate) => {
    expect(
      statement(target('pid', 'address_locality'), {
        operator,
        value: ' Stuttgart ',
        match_case: matchCase,
      })
    ).toBe(`Personal ID · City or town ${predicate}`);
  });

  it('reads enum values by their label (F8)', () => {
    const nationality = target('pid', 'nationalities');
    expect(statement(nationality, { operator: 'includes_one_of', values: ['DE'] })).toBe(
      'Personal ID · Nationality includes one of Germany'
    );
    expect(statement(nationality, { operator: 'includes_none_of', values: ['DE', 'AT'] })).toBe(
      'Personal ID · Nationality includes none of Germany, Austria'
    );
    expect(statement(target('pid', 'sex'), { operator: 'includes_one_of', values: [2, 0] })).toBe(
      'Personal ID · Sex includes one of Female, Not known'
    );
  });

  it('reads the licence classes by their code only (F32)', () => {
    expect(
      statement(target('mdl', 'driving_privileges', 'classes'), {
        operator: 'includes_none_of',
        values: ['B', 'BE'],
      })
    ).toBe('Driving licence · Licence classes includes none of B, BE');
  });

  it('names the place of birth’s parts', () => {
    expect(
      statement(target('pid', 'place_of_birth', 'country'), {
        operator: 'includes_one_of',
        values: ['AT'],
      })
    ).toBe('Personal ID · Place of birth – Country includes one of Austria');
    expect(
      statement(target('pid', 'place_of_birth', 'locality'), {
        operator: 'contains',
        value: 'Stutt',
        match_case: false,
      })
    ).toBe('Personal ID · Place of birth – City or town contains "Stutt", ignoring letter case');
  });

  it.each([
    ['no target', null, { operator: 'equal_to', value: 'x', match_case: false }],
    ['no condition', target('pid', 'address_locality'), null],
    [
      'an incomplete condition',
      target('pid', 'birthdate'),
      { operator: 'at_least_years_ago', years: 0 },
    ],
    ['an image', target('pid', 'picture'), { operator: 'equal_to', value: 'x' }],
    [
      'a class part without its class',
      target('mdl', 'driving_privileges', 'issue_date'),
      { operator: 'at_least_years_ago', years: 2 },
    ],
    ['another kind’s operator', target('mdl', 'height'), { operator: 'contains', value: 'x' }],
  ])('is null for %s', (_name, ruleTarget, condition) => {
    expect(statementOf({ target: ruleTarget, condition }, CONTEXT)).toBeNull();
  });

  it('is null when the documents don’t have the field', () => {
    expect(
      statementOf(US1_RULES[0], { documents: [{ ...PID, fields: [] }], optionSets: OPTION_SETS })
    ).toBeNull();
  });
});

describe('subjectOf', () => {
  it('names the document, the field and the part', () => {
    expect(subjectOf(target('pid', 'place_of_birth', 'region'), CONTEXT.documents)).toBe(
      'Personal ID · Place of birth – Region'
    );
    expect(subjectOf(target('mdl', 'driving_privileges', 'classes'), CONTEXT.documents)).toBe(
      'Driving licence · Licence classes'
    );
    expect(subjectOf(null, CONTEXT.documents)).toBeNull();
  });
});

describe('optionLabel', () => {
  it('reads a value outside the set as it is', () => {
    expect(optionLabel(OPTION_SETS, 'countries', 'XX')).toBe('XX');
    expect(optionLabel([], 'countries', 'DE')).toBe('DE');
  });
});

describe('symbolOf', () => {
  it.each([
    ['at_least_years_ago', 'date', '≥'],
    ['at_least_from_now', 'date', '≥'],
    ['less_than_years_ago', 'date', '<'],
    ['less_than_from_now', 'date', '<'],
    ['exactly_years_ago', 'date', '='],
    ['before', 'date', null],
    ['on', 'date', null],
    ['greater_than', 'number', '>'],
    ['less_than', 'number', '<'],
    ['equal_to', 'number', '='],
    ['not_equal_to', 'number', '≠'],
    ['equal_to', 'text', null],
    ['not_equal_to', 'text', null],
    ['includes_one_of', 'enum', null],
    ['greater_than', null, null],
  ] as const)('gives %s (%s) the chip %s', (operator, kind, symbol) => {
    expect(symbolOf(operator, kind)).toBe(symbol);
  });
});

describe('statementPartsOf', () => {
  /** The parts joined as `statementOf` writes them. */
  function joined(ruleTarget: RuleTarget, condition: Condition): string | null {
    const parts = statementPartsOf({ target: ruleTarget, condition }, CONTEXT);
    if (!parts?.predicate) {
      return null;
    }
    const { words, values, tail } = parts.predicate;
    const predicate = `${words} ${values.join(', ')}${tail ? `, ${tail}` : ''}`;
    return `${parts.document} · ${parts.data} ${predicate}`;
  }

  it('splits US1’s rules into the document, the data, the words and the chips', () => {
    expect(US1_RULES.map((rule) => statementPartsOf(rule, CONTEXT))).toEqual([
      {
        document: 'Personal ID',
        documentType: 'pid',
        data: 'Date of birth (Age)',
        predicate: { symbol: '≥', words: 'is at least', values: ['21 years old'], tail: null },
      },
      {
        document: 'Driving licence',
        documentType: 'mdl',
        data: 'Licence classes',
        predicate: { symbol: null, words: 'includes one of', values: ['B'], tail: null },
      },
      {
        document: 'Driving licence',
        documentType: 'mdl',
        data: 'Licence class B – Issue date',
        predicate: { symbol: '≥', words: 'is at least', values: ['2 years ago'], tail: null },
      },
    ]);
  });

  it.each<[RuleTarget, Condition]>([
    [target('mdl', 'height'), { operator: 'greater_than', value: 180 }],
    [
      target('pid', 'address_locality'),
      { operator: 'not_contains', value: ' Stuttgart ', match_case: true },
    ],
    [target('pid', 'nationalities'), { operator: 'includes_none_of', values: ['DE', 'AT'] }],
    [target('pid', 'sex'), { operator: 'includes_one_of', values: [2, 0] }],
    [target('pid', 'place_of_birth', 'locality'), { operator: 'equal_to', value: 'Ulm' }],
    [target('mdl', 'expiry_date'), { operator: 'before', date: '2020-01-01' }],
    [target('mdl', 'expiry_date'), { operator: 'at_least_from_now', amount: 6, unit: 'months' }],
    [target('mdl', 'birth_date'), { operator: 'exactly_years_ago', years: 1 }],
    [target('pid', 'date_of_issuance'), { operator: 'less_than_years_ago', years: 3 }],
  ])('joins into the same words as statementOf: %j %j', (ruleTarget, condition) => {
    expect(joined(ruleTarget, condition)).toBe(
      statementOf({ target: ruleTarget, condition }, CONTEXT)?.text
    );
  });

  it('gives each enum value a chip of its own, by label', () => {
    expect(
      statementPartsOf(
        {
          target: target('pid', 'nationalities'),
          condition: { operator: 'includes_one_of', values: ['DE', 'AT'] },
        },
        CONTEXT
      )?.predicate?.values
    ).toEqual(['Germany', 'Austria']);
  });

  it('keeps a text value in quotes, with the letter case after it (F7)', () => {
    expect(
      statementPartsOf(
        {
          target: target('pid', 'address_locality'),
          condition: { operator: 'equal_to', value: ' Stuttgart ', match_case: false },
        },
        CONTEXT
      )?.predicate
    ).toEqual({
      symbol: null,
      words: 'is equal to',
      values: ['"Stuttgart"'],
      tail: 'ignoring letter case',
    });
  });

  it('reads an incomplete rule as far as it goes', () => {
    expect(
      statementPartsOf({ target: target('pid', 'birthdate'), condition: null }, CONTEXT)
    ).toEqual({
      document: 'Personal ID',
      documentType: 'pid',
      data: 'Date of birth (Age)',
      predicate: null,
    });
    expect(
      statementPartsOf(
        {
          target: target('mdl', 'driving_privileges', 'issue_date'),
          condition: { operator: 'at_least_years_ago', years: 2 },
        },
        CONTEXT
      )?.predicate
    ).toBeNull();
    expect(statementPartsOf({ target: null, condition: null }, CONTEXT)).toBeNull();
  });
});

describe('dataOfResolved', () => {
  it('names the field, and the part unless it is named like the field', () => {
    const data = (ruleTarget: RuleTarget) => {
      const resolved = resolveTarget(ruleTarget, CONTEXT.documents);
      return resolved && dataOfResolved(resolved);
    };
    expect(data(target('pid', 'birthdate'))).toBe('Date of birth (Age)');
    expect(data(target('pid', 'place_of_birth', 'country'))).toBe('Place of birth – Country');
    expect(data(target('mdl', 'driving_privileges', 'classes'))).toBe('Licence classes');
    expect(data(target('mdl', 'driving_privileges', 'expiry_date', 'C1E'))).toBe(
      'Licence class C1E – Expiry date'
    );
  });
});

describe('ruleFieldLabel', () => {
  const fieldOf = (document: typeof PID, key: string) => {
    const found = document.fields.find((entry) => entry.key === key);
    if (!found) {
      throw new Error(`${document.key}.${key} isn't in the test catalog`);
    }
    return found;
  };

  it('names the date of birth as an age in the rules only (B7)', () => {
    expect(ruleFieldLabel(fieldOf(PID, 'birthdate'))).toBe('Date of birth (Age)');
    expect(ruleFieldLabel(fieldOf(MDL, 'birth_date'))).toBe('Date of birth (Age)');
  });

  it('keeps the catalog’s label for every other field', () => {
    expect(ruleFieldLabel(fieldOf(PID, 'date_of_expiry'))).toBe(
      fieldOf(PID, 'date_of_expiry').label
    );
    expect(ruleFieldLabel(fieldOf(PID, 'place_of_birth'))).toBe('Place of birth');
  });
});
