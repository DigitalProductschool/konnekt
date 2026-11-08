import { describe, expect, it } from 'vitest';

import { createRandom } from './random';
import {
  BIRTH_PLACE_WEIGHTS,
  BIRTH_PLACES,
  COUNTRY_WEIGHTS,
  drawNames,
  EMAIL_DOMAINS,
  EYE_COLOUR_WEIGHTS,
  FAMILY_NAMES,
  GIVEN_NAMES,
  HAIR_COLOUR_WEIGHTS,
  HOME_TOWNS,
  LICENCE_CLASS_COMBINATIONS,
  LICENCE_CLASS_WEIGHTS,
  makeAdministrativeNumber,
  makeEmail,
  makeHouseNumber,
  makeIdCardNumber,
  makeLicenceNumber,
  makePhoneNumber,
  makeSampleContext,
  MOBILE_PREFIXES,
  nameParts,
  SAMPLED_KEYS,
  sampleFor,
  SEX_WEIGHTS,
  STREETS,
} from './samples';
import type { PersonaValue } from './types';

/** The value sets of `backend/app/option_sets.py`, except the countries */
const LICENCE_CLASSES = [
  'AM',
  'A1',
  'A2',
  'A',
  'B1',
  'B',
  'BE',
  'C1',
  'C1E',
  'C',
  'CE',
  'D1',
  'D1E',
  'D',
  'DE',
  'L',
  'T',
];
const SEX = [0, 1, 2, 3, 4, 5, 6, 9];
const EYE_COLOURS = [
  'black',
  'blue',
  'brown',
  'dichromatic',
  'grey',
  'green',
  'hazel',
  'maroon',
  'pink',
  'unknown',
];
const HAIR_COLOURS = [
  'bald',
  'black',
  'blond',
  'brown',
  'grey',
  'red',
  'auburn',
  'sandy',
  'white',
  'unknown',
];
/** The country codes the pools use, each checked against `backend/app/option_sets.py` */
const COUNTRIES = ['AT', 'BA', 'DE', 'ES', 'FR', 'GR', 'HR', 'IT', 'PL', 'PT', 'RO', 'TR'];

/** Every variable key of a text or enum field or part of the catalog (`backend/app/catalog.py`) */
const CATALOG_TEXT_AND_ENUM_KEYS = [
  'pid.family_name',
  'pid.given_name',
  'pid.place_of_birth.country',
  'pid.place_of_birth.region',
  'pid.place_of_birth.locality',
  'pid.nationalities',
  'pid.address_formatted',
  'pid.address_street_address',
  'pid.address_house_number',
  'pid.address_postal_code',
  'pid.address_locality',
  'pid.address_region',
  'pid.address_country',
  'pid.personal_administrative_number',
  'pid.birth_family_name',
  'pid.birth_given_name',
  'pid.sex',
  'pid.email',
  'pid.phone_number',
  'pid.document_number',
  'pid.issuing_authority',
  'pid.issuing_country',
  'pid.issuing_jurisdiction',
  'mdl.family_name',
  'mdl.given_name',
  'mdl.issuing_country',
  'mdl.issuing_authority',
  'mdl.document_number',
  'mdl.driving_privileges.classes',
  'mdl.un_distinguishing_sign',
  'mdl.administrative_number',
  'mdl.sex',
  'mdl.eye_colour',
  'mdl.hair_colour',
  'mdl.birth_place',
  'mdl.resident_address',
  'mdl.issuing_jurisdiction',
  'mdl.nationality',
  'mdl.resident_city',
  'mdl.resident_state',
  'mdl.resident_postal_code',
  'mdl.resident_country',
  'mdl.family_name_national_character',
  'mdl.given_name_national_character',
];

const SEEDS = Array.from({ length: 200 }, (_, index) => index * 7919 + 1);

function expectDistinct(values: readonly unknown[]): void {
  expect(values.length).toBeGreaterThan(0);
  expect(new Set(values).size).toBe(values.length);
}

describe('pools', () => {
  it('are non-empty and without duplicates', () => {
    expectDistinct(GIVEN_NAMES);
    expectDistinct(FAMILY_NAMES);
    expectDistinct(HOME_TOWNS.map((town) => town.town));
    expectDistinct(HOME_TOWNS.map((town) => town.postalCode));
    expectDistinct(STREETS);
    expectDistinct(BIRTH_PLACES.map((place) => place.locality));
    expectDistinct(COUNTRY_WEIGHTS.map(([code]) => code));
    expectDistinct(LICENCE_CLASS_COMBINATIONS.map((combination) => combination.join(' ')));
    expectDistinct(SEX_WEIGHTS.map(([code]) => code));
    expectDistinct(EYE_COLOUR_WEIGHTS.map(([code]) => code));
    expectDistinct(HAIR_COLOUR_WEIGHTS.map(([code]) => code));
    expectDistinct(EMAIL_DOMAINS);
    expectDistinct(MOBILE_PREFIXES);
  });

  it('give one-word given names and trimmed family names', () => {
    for (const given of GIVEN_NAMES) {
      expect(given).toMatch(/^\S+$/);
    }
    for (const family of FAMILY_NAMES) {
      expect(family).toBe(family.trim());
      expect(family).not.toBe('');
    }
  });

  it('give towns of Baden-Württemberg with their postal codes and an authority', () => {
    for (const town of HOME_TOWNS) {
      expect(town.postalCode).toMatch(/^(6[89]|7\d|8[89])\d{3}$/);
      expect(town.authority).toMatch(/\S/);
    }
  });

  it('use only codes of their value sets', () => {
    for (const [code] of COUNTRY_WEIGHTS) {
      expect(COUNTRIES).toContain(code);
    }
    for (const place of BIRTH_PLACES) {
      expect(COUNTRIES).toContain(place.country);
    }
    for (const combination of LICENCE_CLASS_COMBINATIONS) {
      for (const code of combination) {
        expect(LICENCE_CLASSES).toContain(code);
      }
      // In the value set's order
      expect(
        [...combination].sort((a, b) => LICENCE_CLASSES.indexOf(a) - LICENCE_CLASSES.indexOf(b))
      ).toEqual(combination);
    }
    expect(LICENCE_CLASS_COMBINATIONS.map((combination) => combination.join(' '))).toEqual([
      'B',
      'B BE',
      'AM B',
      'A B',
      'B C1',
    ]);
    expect(LICENCE_CLASS_WEIGHTS).toHaveLength(LICENCE_CLASS_COMBINATIONS.length);
    expect(BIRTH_PLACE_WEIGHTS).toHaveLength(BIRTH_PLACES.length);
    for (const [code] of SEX_WEIGHTS) {
      expect(SEX).toContain(code);
    }
    for (const [code] of EYE_COLOUR_WEIGHTS) {
      expect(EYE_COLOURS).toContain(code);
    }
    for (const [code] of HAIR_COLOUR_WEIGHTS) {
      expect(HAIR_COLOURS).toContain(code);
    }
  });
});

describe('makers', () => {
  it('make values in their formats', () => {
    for (const seed of SEEDS) {
      const random = createRandom(seed);
      expect(makeIdCardNumber(random)).toMatch(/^[LMNPRTVWXY][CFGHJKLMNPRTVWXYZ0-9]{8}$/);
      expect(makeLicenceNumber(random)).toMatch(/^[A-Z]\d{3}[0-9A-Z]{5}\d[0-9A-Z]$/);
      expect(makeAdministrativeNumber(random)).toMatch(/^[1-9]\d{10}$/);
      expect(makePhoneNumber(random)).toMatch(/^\+49 1[5-7]\d \d{7,8}$/);
      expect(makeHouseNumber(random)).toMatch(/^([1-9]\d?|1[01]\d|120)[abc]?$/);
      expect(makeEmail(random, random.pick(GIVEN_NAMES), random.pick(FAMILY_NAMES))).toMatch(
        /^[a-z-]+\.[a-z-]+\d{0,2}@example\.(com|org|net)$/
      );
    }
  });

  it('make emails in ASCII from names with umlauts and other letters', () => {
    const random = createRandom(1);
    expect(makeEmail(random, 'Jürgen', 'Müller')).toMatch(/^juergen\.mueller\d*@/);
    expect(makeEmail(random, 'Elif', 'Yılmaz')).toMatch(/^elif\.yilmaz\d*@/);
    expect(makeEmail(random, 'Emre', 'Şahin')).toMatch(/^emre\.sahin\d*@/);
    expect(makeEmail(random, 'Zeynep', 'Öztürk')).toMatch(/^zeynep\.oeztuerk\d*@/);
  });

  it('give equal values for equal seeds', () => {
    expect(makeLicenceNumber(createRandom(5))).toBe(makeLicenceNumber(createRandom(5)));
  });
});

describe('names', () => {
  it('split a name at its first space', () => {
    expect(nameParts('Mia Schulz')).toEqual({ given: 'Mia', family: 'Schulz' });
    expect(nameParts(' Anna von Berg ')).toEqual({ given: 'Anna', family: 'von Berg' });
    expect(nameParts('Yusuf')).toEqual({ given: 'Yusuf', family: '' });
  });

  it('draws different names with different given and family names', () => {
    for (const seed of SEEDS) {
      const names = drawNames(createRandom(seed), 3);
      expect(names).toHaveLength(3);
      expectDistinct(names.map((name) => nameParts(name).given));
      expectDistinct(names.map((name) => nameParts(name).family));
      for (const name of names) {
        const { given, family } = nameParts(name);
        expect(GIVEN_NAMES).toContain(given);
        expect(FAMILY_NAMES).toContain(family);
      }
    }
  });

  it('avoids the given and family names of taken names', () => {
    for (const seed of SEEDS) {
      const taken = ['Mia Schulz', 'Yusuf Demir'];
      const [name] = drawNames(createRandom(seed), 1, taken);
      const { given, family } = nameParts(name);
      expect(['Mia', 'Yusuf']).not.toContain(given);
      expect(['Schulz', 'Demir']).not.toContain(family);
    }
  });

  it('throws when the pools are too small', () => {
    expect(() => drawNames(createRandom(1), GIVEN_NAMES.length + 1)).toThrow(RangeError);
  });

  it('draws equal names for equal seeds and varies across seeds', () => {
    expect(drawNames(createRandom(3), 3)).toEqual(drawNames(createRandom(3), 3));
    const all = new Set(SEEDS.flatMap((seed) => drawNames(createRandom(seed), 3)));
    expect(all.size).toBeGreaterThan(100);
  });
});

describe('sampleFor', () => {
  it('covers every text and enum field of the catalog', () => {
    expect([...SAMPLED_KEYS].sort()).toEqual([...CATALOG_TEXT_AND_ENUM_KEYS].sort());
  });

  it('gives a value for every sampled key, and undefined for others', () => {
    for (const seed of SEEDS) {
      const random = createRandom(seed);
      const context = makeSampleContext(random, 'Mia Schulz');
      for (const key of SAMPLED_KEYS) {
        const value = sampleFor(key, random, context);
        expect(value, key).not.toBeUndefined();
        expect(value, key).not.toBeNull();
        expect(value, key).not.toBe('');
        expect(value, key).not.toEqual([]);
      }
      expect(sampleFor('pid.birthdate', random, context)).toBeUndefined();
      expect(sampleFor('mdl.height', random, context)).toBeUndefined();
      expect(sampleFor('mdl.driving_privileges.issue_date#B', random, context)).toBeUndefined();
      expect(sampleFor('toString', random, context)).toBeUndefined();
    }
  });

  it('keeps one persona’s name, town, postal code and authority together', () => {
    const random = createRandom(11);
    const context = makeSampleContext(random, 'Mia Schulz');
    const town = HOME_TOWNS.find((each) => each.town === context.home.town);
    expect(town).toBeDefined();
    expect(sampleFor('pid.given_name', random, context)).toBe('Mia');
    expect(sampleFor('mdl.family_name', random, context)).toBe('Schulz');
    expect(sampleFor('pid.address_locality', random, context)).toBe(town?.town);
    expect(sampleFor('mdl.resident_city', random, context)).toBe(town?.town);
    expect(sampleFor('pid.address_postal_code', random, context)).toBe(town?.postalCode);
    expect(sampleFor('mdl.resident_postal_code', random, context)).toBe(town?.postalCode);
    expect(sampleFor('pid.issuing_authority', random, context)).toBe(town?.authority);
    expect(sampleFor('pid.address_region', random, context)).toBe('Baden-Württemberg');
    expect(sampleFor('pid.address_country', random, context)).toBe('DE');
    expect(sampleFor('pid.address_formatted', random, context)).toBe(
      `${context.street} ${context.houseNumber}, ${town?.postalCode} ${town?.town}`
    );
    expect(sampleFor('pid.place_of_birth.country', random, context)).toBe(
      context.birthPlace.country
    );
    expect(sampleFor('pid.issuing_jurisdiction', random, context)).toBe('DE-BW');
    expect(sampleFor('mdl.un_distinguishing_sign', random, context)).toBe('D');
  });

  it('gives enum codes of their value sets, lists where the field has several', () => {
    for (const seed of SEEDS) {
      const random = createRandom(seed);
      const context = makeSampleContext(random, 'Anna Keller');
      const nationalities = sampleFor('pid.nationalities', random, context);
      expect(Array.isArray(nationalities)).toBe(true);
      expect(new Set(nationalities as string[]).size).toBe((nationalities as string[]).length);
      for (const code of nationalities as string[]) {
        expect(COUNTRIES).toContain(code);
      }
      expect(COUNTRIES).toContain(sampleFor('mdl.nationality', random, context));
      const classes = sampleFor('mdl.driving_privileges.classes', random, context);
      expect(LICENCE_CLASS_COMBINATIONS).toContainEqual(classes);
      expect(SEX).toContain(sampleFor('pid.sex', random, context));
      expect(EYE_COLOURS).toContain(sampleFor('mdl.eye_colour', random, context));
      expect(HAIR_COLOURS).toContain(sampleFor('mdl.hair_colour', random, context));
    }
  });

  it('weights countries towards Germany', () => {
    const random = createRandom(99);
    const context = makeSampleContext(random, 'Anna Keller');
    const draws: (PersonaValue | undefined)[] = Array.from({ length: 1000 }, () =>
      sampleFor('mdl.nationality', random, context)
    );
    const germans = draws.filter((code) => code === 'DE').length;
    expect(germans).toBeGreaterThan(600);
    expect(germans).toBeLessThan(1000);
  });

  it('uses only the given codes', () => {
    for (const seed of SEEDS) {
      const random = createRandom(seed);
      const context = makeSampleContext(random, 'Yusuf Demir');
      expect(['AT', 'FR']).toContain(sampleFor('mdl.nationality', random, context, ['AT', 'FR']));
      expect(['AT', 'FR']).toContain(
        sampleFor('pid.address_country', random, context, ['AT', 'FR'])
      );
      expect(['QQ']).toContain(sampleFor('pid.issuing_country', random, context, ['QQ']));
      for (const code of sampleFor('pid.nationalities', random, context, [
        'DE',
        'AT',
      ]) as string[]) {
        expect(['DE', 'AT']).toContain(code);
      }
      const classes = sampleFor('mdl.driving_privileges.classes', random, context, [
        'A',
        'B',
        'BE',
        'C',
      ]);
      expect([['B'], ['B', 'BE'], ['A', 'B']]).toContainEqual(classes);
      expect(sampleFor('mdl.driving_privileges.classes', random, context, ['C'])).toEqual(['C']);
      expect([0, 1, 2]).toContain(sampleFor('mdl.sex', random, context, [0, 1, 2]));
      expect(sampleFor('mdl.sex', random, context, [])).toBeNull();
      expect(sampleFor('pid.nationalities', random, context, [])).toEqual([]);
      expect(sampleFor('mdl.driving_privileges.classes', random, context, [])).toEqual([]);
    }
  });
});
