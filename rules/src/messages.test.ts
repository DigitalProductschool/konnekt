import type { Condition, RuleTarget } from '@connection-portal/api-types/form-connections';
import { describe, expect, it } from 'vitest';

import { lowerFirst, orList, proposedMessage } from './messages';
import { CONTEXT, CONTEXT_DE, MDL, MDL_DE, PID_DE, target, US1_RULES } from './testData';
import type { RuleContext, RuleDocument } from './types';

function message(ruleTarget: RuleTarget | null, condition: Condition | null): string | null {
  return proposedMessage({ target: ruleTarget, condition }, CONTEXT);
}

/** `message()` with the German context (spec 009). */
function germanMessage(ruleTarget: RuleTarget | null, condition: Condition | null): string | null {
  return proposedMessage({ target: ruleTarget, condition }, CONTEXT_DE);
}

/** A document with one field's label changed, for the glossary's sentences. */
function relabelled(document: RuleDocument, key: string, label: string): RuleDocument {
  return {
    ...document,
    fields: document.fields.map((entry) => (entry.key === key ? { ...entry, label } : entry)),
  };
}

describe('proposedMessage', () => {
  it('proposes the design’s messages for US1’s rules (spec 008 C3)', () => {
    expect(US1_RULES.map((rule) => proposedMessage(rule, CONTEXT))).toEqual([
      'You need to be at least 21 years old.',
      'You need a class B licence.',
      'You need to have held a class B driving licence for at least 2 years.',
    ]);
    expect(
      message(target('pid', 'address_locality'), {
        operator: 'equal_to',
        value: 'Stuttgart',
        match_case: false,
      })
    ).toBe('You need to live in Stuttgart.');
  });

  it('proposes US1’s messages in German (glossary G§3)', () => {
    expect(US1_RULES.map((rule) => proposedMessage(rule, CONTEXT_DE))).toEqual([
      'Sie müssen mindestens 21 Jahre alt sein.',
      'Sie brauchen einen Führerschein der Klasse B.',
      'Sie müssen seit mindestens 2 Jahren einen Führerschein der Klasse B besitzen.',
    ]);
    expect(
      germanMessage(target('pid', 'address_locality'), {
        operator: 'equal_to',
        value: 'Stuttgart',
        match_case: false,
      })
    ).toBe('Sie müssen in Stuttgart wohnen.');
  });

  it('proposes in English without a language (the MCP server’s context)', () => {
    const { language: _language, ...withoutLanguage } = CONTEXT_DE;
    expect(proposedMessage(US1_RULES[0], withoutLanguage)).toBe(
      'You need to be at least 21 years old.'
    );
  });

  it('words the glossary’s sentences word for word (G§3)', () => {
    const height = { operator: 'greater_than', value: 150 };
    const english: RuleContext = { ...CONTEXT, documents: [relabelled(MDL, 'height', 'Height')] };
    const german: RuleContext = {
      ...CONTEXT_DE,
      documents: [relabelled(MDL_DE, 'height', 'Körpergröße')],
    };
    expect(proposedMessage({ target: target('mdl', 'height'), condition: height }, english)).toBe(
      'Your height must be greater than 150.'
    );
    expect(proposedMessage({ target: target('mdl', 'height'), condition: height }, german)).toBe(
      'Ihre Körpergröße muss größer als 150 sein.'
    );
    const classes = { operator: 'includes_one_of', values: ['B', 'BE'] };
    expect(germanMessage(target('mdl', 'driving_privileges', 'classes'), classes)).toBe(
      'Sie brauchen einen Führerschein der Klasse B oder BE.'
    );
    expect(
      germanMessage(target('pid', 'date_of_expiry'), {
        operator: 'at_least_from_now',
        amount: 6,
        unit: 'months',
      })
    ).toBe('Sie brauchen einen Personalausweis, der noch mindestens 6 Monate gültig ist.');
  });

  it.each([
    ['greater_than', 'Your height (cm) must be greater than 180.'],
    ['less_than', 'Your height (cm) must be less than 180.'],
    ['equal_to', 'Your height (cm) must be 180.'],
    ['not_equal_to', 'Your height (cm) must not be 180.'],
  ])('matches the number condition %s', (operator, expected) => {
    expect(message(target('mdl', 'height'), { operator, value: 180 })).toBe(expected);
  });

  it.each([
    ['greater_than', 'Ihre Körpergröße (cm) muss größer als 180 sein.'],
    ['less_than', 'Ihre Körpergröße (cm) muss kleiner als 180 sein.'],
    ['equal_to', 'Ihre Körpergröße (cm) muss 180 sein.'],
    ['not_equal_to', 'Ihre Körpergröße (cm) darf nicht 180 sein.'],
  ])('matches the number condition %s in German', (operator, expected) => {
    expect(germanMessage(target('mdl', 'height'), { operator, value: 180 })).toBe(expected);
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
      ).toBe('You need to be born in Köln.');
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

    it.each([
      ['equal_to', 'Ihr Familienname muss „Müller“ sein.'],
      ['not_equal_to', 'Ihr Familienname darf nicht „Müller“ sein.'],
      ['contains', 'Ihr Familienname muss „Müller“ enthalten.'],
      ['not_contains', 'Ihr Familienname darf „Müller“ nicht enthalten.'],
    ])('matches %s in German, in German quotes', (operator, expected) => {
      expect(
        germanMessage(target('pid', 'family_name'), {
          operator,
          value: ' Müller ',
          match_case: true,
        })
      ).toBe(expected);
    });

    it('says where someone lives, or was born, in German', () => {
      expect(
        germanMessage(target('mdl', 'resident_city'), {
          operator: 'not_equal_to',
          value: 'Esslingen',
          match_case: false,
        })
      ).toBe('Sie dürfen nicht in Esslingen wohnen.');
      expect(
        germanMessage(target('pid', 'place_of_birth', 'locality'), {
          operator: 'equal_to',
          value: 'Köln',
          match_case: false,
        })
      ).toBe('Sie müssen in Köln geboren sein.');
      expect(
        germanMessage(target('pid', 'place_of_birth', 'locality'), {
          operator: 'not_equal_to',
          value: 'Köln',
          match_case: false,
        })
      ).toBe('Sie dürfen nicht in Köln geboren sein.');
      expect(
        germanMessage(target('pid', 'place_of_birth', 'region'), {
          operator: 'not_contains',
          value: 'Bayern',
          match_case: false,
        })
      ).toBe('Die Region Ihres Geburtsorts darf „Bayern“ nicht enthalten.');
    });

    it('names a field without a known gender in German as „das Feld“', () => {
      const authority = {
        ...PID_DE.fields[0],
        key: 'issuing_authority',
        label: 'Ausstellende Behörde',
      };
      const context: RuleContext = {
        ...CONTEXT_DE,
        documents: [{ ...PID_DE, fields: [...PID_DE.fields, authority] }],
      };
      expect(
        proposedMessage(
          {
            target: target('pid', 'issuing_authority'),
            condition: { operator: 'equal_to', value: 'Stuttgart', match_case: false },
          },
          context
        )
      ).toBe('Das Feld „Ausstellende Behörde“ muss „Stuttgart“ sein.');
    });
  });

  describe('enums', () => {
    const one = (values: (string | number)[]) => ({ operator: 'includes_one_of', values });
    const none = (values: (string | number)[]) => ({ operator: 'includes_none_of', values });

    it('names the licence classes by their code', () => {
      const classes = target('mdl', 'driving_privileges', 'classes');
      expect(message(classes, one(['C']))).toBe('You need a class C licence.');
      expect(message(classes, one(['B', 'BE']))).toBe('You need a class B or BE licence.');
      expect(message(classes, one(['B', 'BE', 'C']))).toBe('You need a class B, BE or C licence.');
      expect(message(classes, none(['C']))).toBe('You must not hold a class C licence.');
      expect(message(classes, none(['C', 'BE']))).toBe(
        'You must not hold a class C or BE licence.'
      );
    });

    it('names the licence classes by their code in German', () => {
      const classes = target('mdl', 'driving_privileges', 'classes');
      expect(germanMessage(classes, one(['C']))).toBe(
        'Sie brauchen einen Führerschein der Klasse C.'
      );
      expect(germanMessage(classes, one(['B', 'BE', 'C']))).toBe(
        'Sie brauchen einen Führerschein der Klasse B, BE oder C.'
      );
      expect(germanMessage(classes, none(['C']))).toBe(
        'Sie dürfen keinen Führerschein der Klasse C besitzen.'
      );
      expect(germanMessage(classes, none(['C', 'BE']))).toBe(
        'Sie dürfen keinen Führerschein der Klasse C oder BE besitzen.'
      );
    });

    it('names other values by their label', () => {
      expect(message(target('pid', 'nationalities'), one(['DE', 'AT']))).toBe(
        'You need the nationality of Germany or Austria.'
      );
      expect(message(target('mdl', 'nationality'), none(['FR']))).toBe(
        'You must not be a national of France.'
      );
      expect(message(target('pid', 'address_country'), one(['DE']))).toBe(
        'You need to live in Germany.'
      );
      expect(message(target('pid', 'place_of_birth', 'country'), none(['AT', 'FR']))).toBe(
        'You must not have been born in Austria or France.'
      );
      expect(message(target('pid', 'issuing_country'), one(['DE']))).toBe(
        'You need a personal ID issued in Germany.'
      );
      expect(message(target('pid', 'issuing_country'), none(['FR']))).toBe(
        'Your personal ID must not have been issued in France.'
      );
      expect(message(target('pid', 'sex'), one([2]))).toBe('Your sex must be Female.');
      expect(message(target('mdl', 'eye_colour'), none(['blue', 'green']))).toBe(
        'Your eye colour must not be Blue or Green.'
      );
    });

    it('names other values by their German label', () => {
      expect(germanMessage(target('pid', 'nationalities'), one(['DE', 'AT']))).toBe(
        'Sie brauchen die Staatsangehörigkeit von Deutschland oder Österreich.'
      );
      expect(germanMessage(target('mdl', 'nationality'), none(['FR']))).toBe(
        'Sie dürfen nicht die Staatsangehörigkeit von Frankreich besitzen.'
      );
      expect(germanMessage(target('pid', 'address_country'), one(['DE']))).toBe(
        'Sie müssen in Deutschland wohnen.'
      );
      expect(germanMessage(target('pid', 'address_country'), none(['DE']))).toBe(
        'Sie dürfen nicht in Deutschland wohnen.'
      );
      expect(germanMessage(target('pid', 'place_of_birth', 'country'), one(['AT']))).toBe(
        'Sie müssen in Österreich geboren sein.'
      );
      expect(germanMessage(target('pid', 'place_of_birth', 'country'), none(['AT', 'FR']))).toBe(
        'Sie dürfen nicht in Österreich oder Frankreich geboren sein.'
      );
      expect(germanMessage(target('pid', 'issuing_country'), one(['DE']))).toBe(
        'Sie brauchen einen Personalausweis, der in Deutschland ausgestellt wurde.'
      );
      expect(germanMessage(target('pid', 'issuing_country'), none(['FR']))).toBe(
        'Ihr Personalausweis darf nicht in Frankreich ausgestellt worden sein.'
      );
      expect(germanMessage(target('pid', 'sex'), one([2]))).toBe(
        'Ihr Geschlecht muss Weiblich sein.'
      );
      expect(germanMessage(target('mdl', 'eye_colour'), none(['blue', 'green']))).toBe(
        'Ihre Augenfarbe darf nicht Blau oder Grün sein.'
      );
    });
  });

  describe('dates', () => {
    it.each([
      ['at_least_years_ago', 'You need to be at least 18 years old.'],
      ['less_than_years_ago', 'You need to be under 18 years old.'],
      ['exactly_years_ago', 'You need to be exactly 18 years old.'],
    ])('words %s on the Date of birth as an age', (operator, expected) => {
      expect(message(target('mdl', 'birth_date'), { operator, years: 18 })).toBe(expected);
    });

    it.each([
      ['at_least_years_ago', 18, 'Sie müssen mindestens 18 Jahre alt sein.'],
      ['at_least_years_ago', 1, 'Sie müssen mindestens 1 Jahr alt sein.'],
      ['less_than_years_ago', 18, 'Sie müssen jünger als 18 Jahre sein.'],
      ['exactly_years_ago', 18, 'Sie müssen genau 18 Jahre alt sein.'],
    ])('words %s (%i) on the Date of birth as an age in German', (operator, years, expected) => {
      expect(germanMessage(target('mdl', 'birth_date'), { operator, years })).toBe(expected);
    });

    it('says when someone was born', () => {
      expect(message(target('pid', 'birthdate'), { operator: 'before', date: '2000-01-01' })).toBe(
        'You need to be born before 01.01.2000.'
      );
      expect(message(target('pid', 'birthdate'), { operator: 'on', date: '2000-01-01' })).toBe(
        'You need to be born on 01.01.2000.'
      );
      expect(message(target('pid', 'birthdate'), { operator: 'after', date: '2010-01-01' })).toBe(
        'You need to be born after 01.01.2010.'
      );
    });

    it('says when someone was born in German', () => {
      const birthdate = target('pid', 'birthdate');
      expect(germanMessage(birthdate, { operator: 'before', date: '2000-01-01' })).toBe(
        'Sie müssen vor dem 01.01.2000 geboren sein.'
      );
      expect(germanMessage(birthdate, { operator: 'on', date: '2000-01-01' })).toBe(
        'Sie müssen am 01.01.2000 geboren sein.'
      );
      expect(germanMessage(birthdate, { operator: 'after', date: '2010-01-01' })).toBe(
        'Sie müssen nach dem 01.01.2010 geboren sein.'
      );
    });

    it.each([
      [
        'at_least_years_ago',
        1,
        'You need to have held a class B driving licence for at least 1 year.',
      ],
      [
        'at_least_years_ago',
        2,
        'You need to have held a class B driving licence for at least 2 years.',
      ],
      [
        'less_than_years_ago',
        3,
        'You need to have held a class B driving licence for less than 3 years.',
      ],
      [
        'exactly_years_ago',
        2,
        'You need to have held a class B driving licence for exactly 2 years.',
      ],
    ])('words %s on a class’s issue date as holding it', (operator, years, expected) => {
      expect(
        message(target('mdl', 'driving_privileges', 'issue_date', 'B'), { operator, years })
      ).toBe(expected);
    });

    it.each([
      [
        'at_least_years_ago',
        1,
        'Sie müssen seit mindestens 1 Jahr einen Führerschein der Klasse B besitzen.',
      ],
      [
        'at_least_years_ago',
        2,
        'Sie müssen seit mindestens 2 Jahren einen Führerschein der Klasse B besitzen.',
      ],
      [
        'less_than_years_ago',
        3,
        'Sie müssen seit weniger als 3 Jahren einen Führerschein der Klasse B besitzen.',
      ],
      [
        'exactly_years_ago',
        2,
        'Sie müssen seit genau 2 Jahren einen Führerschein der Klasse B besitzen.',
      ],
    ])(
      'words %s (%i) on a class’s issue date as holding it in German',
      (operator, years, expected) => {
        expect(
          germanMessage(target('mdl', 'driving_privileges', 'issue_date', 'B'), { operator, years })
        ).toBe(expected);
      }
    );

    it('words expiry dates from now as validity', () => {
      expect(
        message(target('mdl', 'expiry_date'), {
          operator: 'at_least_from_now',
          amount: 6,
          unit: 'months',
        })
      ).toBe('You need a driving licence that’s valid for at least 6 more months.');
      expect(
        message(target('pid', 'date_of_expiry'), {
          operator: 'less_than_from_now',
          amount: 1,
          unit: 'years',
        })
      ).toBe('You need a personal ID that expires in less than 1 year.');
      expect(
        message(target('mdl', 'driving_privileges', 'expiry_date', 'C'), {
          operator: 'at_least_from_now',
          amount: 1,
          unit: 'months',
        })
      ).toBe('You need a class C licence that’s valid for at least 1 more month.');
      expect(
        message(target('mdl', 'expiry_date'), {
          operator: 'at_least_from_now',
          amount: 12,
          unit: 'months',
        })
      ).toBe('You need a driving licence that’s valid for at least 12 more months.');
    });

    it('words expiry dates from now as validity in German', () => {
      expect(
        germanMessage(target('mdl', 'expiry_date'), {
          operator: 'at_least_from_now',
          amount: 6,
          unit: 'months',
        })
      ).toBe('Sie brauchen einen Führerschein, der noch mindestens 6 Monate gültig ist.');
      expect(
        germanMessage(target('pid', 'date_of_expiry'), {
          operator: 'less_than_from_now',
          amount: 1,
          unit: 'years',
        })
      ).toBe('Sie brauchen einen Personalausweis, der in weniger als 1 Jahr abläuft.');
      expect(
        germanMessage(target('pid', 'date_of_expiry'), {
          operator: 'less_than_from_now',
          amount: 3,
          unit: 'months',
        })
      ).toBe('Sie brauchen einen Personalausweis, der in weniger als 3 Monaten abläuft.');
      expect(
        germanMessage(target('mdl', 'driving_privileges', 'expiry_date', 'C'), {
          operator: 'at_least_from_now',
          amount: 1,
          unit: 'months',
        })
      ).toBe(
        'Sie brauchen einen Führerschein der Klasse C, der noch mindestens 1 Monat gültig ist.'
      );
      expect(
        germanMessage(target('mdl', 'expiry_date'), {
          operator: 'at_least_from_now',
          amount: 12,
          unit: 'months',
        })
      ).toBe('Sie brauchen einen Führerschein, der noch mindestens 12 Monate gültig ist.');
    });

    it.each([
      [{ operator: 'before', date: '2020-01-01' }, 'must be before 01.01.2020.'],
      [{ operator: 'after', date: '2020-01-01' }, 'must be after 01.01.2020.'],
      [{ operator: 'on', date: '2020-01-01' }, 'must be 01.01.2020.'],
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

    it.each([
      [{ operator: 'before', date: '2020-01-01' }, 'muss vor dem 01.01.2020 liegen.'],
      [{ operator: 'after', date: '2020-01-01' }, 'muss nach dem 01.01.2020 liegen.'],
      [{ operator: 'on', date: '2020-01-01' }, 'muss der 01.01.2020 sein.'],
      [{ operator: 'at_least_years_ago', years: 2 }, 'muss mindestens 2 Jahre zurückliegen.'],
      [{ operator: 'less_than_years_ago', years: 1 }, 'muss weniger als 1 Jahr zurückliegen.'],
      [{ operator: 'exactly_years_ago', years: 5 }, 'muss genau 5 Jahre zurückliegen.'],
      [
        { operator: 'at_least_from_now', amount: 3, unit: 'months' as const },
        'muss mindestens 3 Monate in der Zukunft liegen.',
      ],
      [
        { operator: 'less_than_from_now', amount: 2, unit: 'years' as const },
        'muss weniger als 2 Jahre in der Zukunft liegen.',
      ],
    ])('matches the date condition %o in German', (condition, expected) => {
      expect(germanMessage(target('mdl', 'issue_date'), condition)).toBe(
        `Das Ausstellungsdatum Ihres Führerscheins ${expected}`
      );
    });

    it('names a class’s dates with the class', () => {
      expect(
        message(target('mdl', 'driving_privileges', 'expiry_date', 'B'), {
          operator: 'before',
          date: '2030-06-30',
        })
      ).toBe('The expiry date of your class B must be before 30.06.2030.');
      expect(
        germanMessage(target('mdl', 'driving_privileges', 'expiry_date', 'B'), {
          operator: 'before',
          date: '2030-06-30',
        })
      ).toBe('Das Ablaufdatum Ihrer Klasse B muss vor dem 30.06.2030 liegen.');
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
    expect(germanMessage(ruleTarget, condition)).toBeNull();
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

  it.each([
    [['A'], 'A'],
    [['A', 'B'], 'A oder B'],
    [['A', 'B', 'C'], 'A, B oder C'],
  ])('joins %o in German', (items, expected) => {
    expect(orList(items, 'de')).toBe(expected);
  });
});

describe('date of birth in messages (B7)', () => {
  it('keeps the catalog’s "date of birth", without the rules’ "(Age)"', () => {
    const text = message(target('pid', 'birthdate'), {
      operator: 'at_least_from_now',
      amount: 1,
      unit: 'years',
    });
    expect(text).toContain('date of birth of your personal ID');
    expect(text?.toLowerCase()).not.toContain('(age)');
  });

  it('keeps the German catalog’s "Geburtsdatum", without "(Alter)"', () => {
    expect(
      germanMessage(target('pid', 'birthdate'), {
        operator: 'at_least_from_now',
        amount: 1,
        unit: 'years',
      })
    ).toBe(
      'Das Geburtsdatum Ihres Personalausweises muss mindestens 1 Jahr in der Zukunft liegen.'
    );
  });
});
