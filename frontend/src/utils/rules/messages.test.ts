import { describe, expect, it } from 'vitest';

import type { Condition, RuleTarget } from '../../types/form-connections';
import { lowerFirst, orList, proposedMessage } from './messages';
import { CONTEXT, target, US1_RULES } from './testData';

function message(ruleTarget: RuleTarget | null, condition: Condition | null): string | null {
  return proposedMessage({ target: ruleTarget, condition }, CONTEXT);
}

describe('proposedMessage', () => {
  it('proposes data-model.md’s messages for US1’s rules', () => {
    expect(US1_RULES.map((rule) => proposedMessage(rule, CONTEXT))).toEqual([
      'You must be at least 21 years old.',
      'You must hold class B.',
      'You must have held class B for at least 2 years.',
    ]);
    expect(
      message(target('pid', 'address_locality'), {
        operator: 'equal_to',
        value: 'Stuttgart',
        match_case: false,
      })
    ).toBe('You must live in Stuttgart.');
  });

  it.each([
    ['greater_than', 'Your height (cm) must be greater than 180.'],
    ['less_than', 'Your height (cm) must be less than 180.'],
    ['equal_to', 'Your height (cm) must be 180.'],
    ['not_equal_to', 'Your height (cm) must not be 180.'],
  ])('matches the number condition %s', (operator, expected) => {
    expect(message(target('mdl', 'height'), { operator, value: 180 })).toBe(expected);
  });

  describe('text', () => {
    it.each([
      ['equal_to', 'Your family name must be "Müller".'],
      ['not_equal_to', 'Your family name must not be "Müller".'],
      ['contains', 'Your family name must contain "Müller".'],
      ['not_contains', 'Your family name must not contain "Müller".'],
    ])('matches %s', (operator, expected) => {
      expect(
        message(target('pid', 'family_name'), { operator, value: ' Müller ', match_case: true })
      ).toBe(expected);
    });

    it('says where someone lives, or was born', () => {
      expect(
        message(target('mdl', 'resident_city'), {
          operator: 'not_equal_to',
          value: 'Esslingen',
          match_case: false,
        })
      ).toBe('You must not live in Esslingen.');
      expect(
        message(target('pid', 'place_of_birth', 'locality'), {
          operator: 'equal_to',
          value: 'Köln',
          match_case: false,
        })
      ).toBe('You must have been born in Köln.');
      expect(
        message(target('pid', 'address_locality'), {
          operator: 'contains',
          value: 'Stutt',
          match_case: false,
        })
      ).toBe('Your city or town must contain "Stutt".');
      expect(
        message(target('pid', 'place_of_birth', 'region'), {
          operator: 'not_contains',
          value: 'Bayern',
          match_case: false,
        })
      ).toBe('The region of your place of birth must not contain "Bayern".');
    });
  });

  describe('enums', () => {
    const one = (values: (string | number)[]) => ({ operator: 'includes_one_of', values });
    const none = (values: (string | number)[]) => ({ operator: 'includes_none_of', values });

    it('names the licence classes by their code', () => {
      const classes = target('mdl', 'driving_privileges', 'classes');
      expect(message(classes, one(['B', 'BE', 'C']))).toBe(
        'You must hold one of the classes B, BE or C.'
      );
      expect(message(classes, none(['C']))).toBe('You must not hold class C.');
      expect(message(classes, none(['C', 'BE']))).toBe(
        'You must hold none of the classes C or BE.'
      );
    });

    it('names other values by their label', () => {
      expect(message(target('pid', 'nationalities'), one(['DE', 'AT']))).toBe(
        'You must be a national of Germany or Austria.'
      );
      expect(message(target('mdl', 'nationality'), none(['FR']))).toBe(
        'You must not be a national of France.'
      );
      expect(message(target('pid', 'address_country'), one(['DE']))).toBe(
        'You must live in Germany.'
      );
      expect(message(target('pid', 'place_of_birth', 'country'), none(['AT', 'FR']))).toBe(
        'You must not have been born in Austria or France.'
      );
      expect(message(target('pid', 'issuing_country'), one(['DE']))).toBe(
        'Your personal ID must have been issued in Germany.'
      );
      expect(message(target('pid', 'sex'), one([2]))).toBe('Your sex must be Female.');
      expect(message(target('mdl', 'eye_colour'), none(['blue', 'green']))).toBe(
        'Your eye colour must not be Blue or Green.'
      );
    });
  });

  describe('dates', () => {
    it.each([
      ['at_least_years_ago', 'You must be at least 18 years old.'],
      ['less_than_years_ago', 'You must be under 18 years old.'],
      ['exactly_years_ago', 'You must be exactly 18 years old.'],
    ])('words %s on the Date of birth as an age', (operator, expected) => {
      expect(message(target('mdl', 'birth_date'), { operator, years: 18 })).toBe(expected);
    });

    it('says when someone was born', () => {
      expect(message(target('pid', 'birthdate'), { operator: 'before', date: '2000-01-01' })).toBe(
        'You must have been born before 1 Jan 2000.'
      );
      expect(message(target('pid', 'birthdate'), { operator: 'on', date: '2000-01-01' })).toBe(
        'You must have been born on 1 Jan 2000.'
      );
    });

    it.each([
      ['at_least_years_ago', 1, 'You must have held class B for at least 1 year.'],
      ['less_than_years_ago', 3, 'You must have held class B for less than 3 years.'],
      ['exactly_years_ago', 2, 'You must have held class B for exactly 2 years.'],
    ])('words %s on a class’s issue date as holding it', (operator, years, expected) => {
      expect(
        message(target('mdl', 'driving_privileges', 'issue_date', 'B'), { operator, years })
      ).toBe(expected);
    });

    it('words expiry dates from now as validity', () => {
      expect(
        message(target('mdl', 'expiry_date'), {
          operator: 'at_least_from_now',
          amount: 6,
          unit: 'months',
        })
      ).toBe('Your driving licence must be valid for at least 6 months.');
      expect(
        message(target('pid', 'date_of_expiry'), {
          operator: 'less_than_from_now',
          amount: 1,
          unit: 'years',
        })
      ).toBe('Your personal ID must expire in less than 1 year.');
      expect(
        message(target('mdl', 'driving_privileges', 'expiry_date', 'C'), {
          operator: 'at_least_from_now',
          amount: 1,
          unit: 'months',
        })
      ).toBe('Your class C must be valid for at least 1 month.');
    });

    it.each([
      [{ operator: 'before', date: '2020-01-01' }, 'must be before 1 Jan 2020.'],
      [{ operator: 'after', date: '2020-01-01' }, 'must be after 1 Jan 2020.'],
      [{ operator: 'on', date: '2020-01-01' }, 'must be 1 Jan 2020.'],
      [{ operator: 'at_least_years_ago', years: 2 }, 'must be at least 2 years ago.'],
      [{ operator: 'less_than_years_ago', years: 1 }, 'must be less than 1 year ago.'],
      [{ operator: 'exactly_years_ago', years: 5 }, 'must be exactly 5 years ago.'],
      [
        { operator: 'at_least_from_now', amount: 3, unit: 'months' as const },
        'must be at least 3 months from now.',
      ],
      [
        { operator: 'less_than_from_now', amount: 2, unit: 'years' as const },
        'must be less than 2 years from now.',
      ],
    ])('matches the date condition %o', (condition, expected) => {
      expect(message(target('mdl', 'issue_date'), condition)).toBe(
        `The issue date of your driving licence ${expected}`
      );
    });

    it('names a class’s dates with the class', () => {
      expect(
        message(target('mdl', 'driving_privileges', 'expiry_date', 'B'), {
          operator: 'before',
          date: '2030-06-30',
        })
      ).toBe('The expiry date of your class B must be before 30 Jun 2030.');
    });
  });

  it.each([
    ['no target', null, { operator: 'equal_to', value: 'x', match_case: false }],
    ['no condition', target('pid', 'family_name'), null],
    [
      'an incomplete condition',
      target('pid', 'family_name'),
      { operator: 'equal_to', value: ' ', match_case: false },
    ],
    ['0 years', target('pid', 'birthdate'), { operator: 'at_least_years_ago', years: 0 }],
    [
      'a value outside the set',
      target('pid', 'nationalities'),
      { operator: 'includes_one_of', values: ['XX'] },
    ],
    ['an image', target('pid', 'picture'), { operator: 'equal_to', value: 'x' }],
    [
      'a class part without its class',
      target('mdl', 'driving_privileges', 'issue_date'),
      { operator: 'at_least_years_ago', years: 2 },
    ],
  ])('proposes none for %s', (_name, ruleTarget, condition) => {
    expect(message(ruleTarget, condition)).toBeNull();
  });
});

describe('lowerFirst', () => {
  it('lowers the first letter, except in a leading acronym', () => {
    expect(lowerFirst('Expiry date')).toBe('expiry date');
    expect(lowerFirst('Personal ID')).toBe('personal ID');
    expect(lowerFirst('UN distinguishing sign')).toBe('UN distinguishing sign');
  });
});

describe('orList', () => {
  it.each([
    [['A'], 'A'],
    [['A', 'B'], 'A or B'],
    [['A', 'B', 'C'], 'A, B or C'],
  ])('joins %o', (items, expected) => {
    expect(orList(items)).toBe(expected);
  });
});
