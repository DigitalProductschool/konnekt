import { describe, expect, it } from 'vitest';

import type {
  BranchInput,
  Combinator,
  Condition,
  GroupItem,
  Mark,
  RuleItem,
  RuleTarget,
  RuleTreeItem,
} from '../../types/form-connections';
import { dayNumber, parseDayNumber } from './checks/calendar';
import vectors from './checks/fixtures/evaluator-vectors.json';
import { OPERATORS } from './constants';
import {
  type Applicant,
  type BranchEvaluation,
  dateHolds,
  enumHolds,
  evaluateBranch,
  type EvaluatedBranch,
  type EvaluatedItem,
  kindOf,
  numberHolds,
  type Outcome,
  ruleOutcome,
  textHolds,
} from './evaluation';
import { CONTEXT, rule, target, US1_RULES } from './testData';
import type { ConditionKind } from './types';

/** A `rule_outcomes` vector: `evaluate_branch()` on a main branch of that one rule */
interface RuleOutcomeVector {
  condition: Condition;
  description: string;
  kind: ConditionKind;
  option_set: string | null;
  outcome: Outcome;
  target: RuleTarget;
  today: string;
  value: unknown;
}

const OUTCOMES = vectors.rule_outcomes as RuleOutcomeVector[];

/** A `branch_evaluations` vector: `evaluate_branch()` on a whole branch, without names */
interface BranchEvaluationVector {
  branch: { items: RuleTreeItem[]; operator: Combinator; origin: BranchInput['origin'] };
  documents: { document_type: string; fields: { key: string; value: unknown }[] }[];
  messages: { id: string; message: string }[];
  met: boolean;
  name: string;
  results: { group: string | null; id: string; outcome: Outcome }[];
  shared_on: string;
}

const BRANCH_EVALUATIONS = vectors.branch_evaluations as BranchEvaluationVector[];

/** The day of sharing of backend/tests/unit/test_evaluation.py, whose cases these mirror */
const SHARED_ON = dayNumber('2026-10-23');

// Characters the cases need, written as code points
const TAB = String.fromCodePoint(0x09);
const NEXT_LINE = String.fromCodePoint(0x85);
const IDEOGRAPHIC_SPACE = String.fromCodePoint(0x3000);
const BYTE_ORDER_MARK = String.fromCodePoint(0xfeff);
const KOELN = `K${String.fromCodePoint(0xf6)}ln`;
const KOELN_CAPITALS = `K${String.fromCodePoint(0xd6)}LN`;
const KOELN_DECOMPOSED = `Ko${String.fromCodePoint(0x308)}ln`;
const BADEN_WUERTTEMBERG = `Baden-W${String.fromCodePoint(0xfc)}rttemberg`;
const SUPERSCRIPT_TWO = String.fromCodePoint(0xb2);
const E_ACUTE = String.fromCodePoint(0xc9);
const E_COMBINING_ACUTE = `E${String.fromCodePoint(0x301)}`;

/** A text with its ASCII digits written as Arabic-Indic digits */
function arabicIndic(text: string): string {
  return Array.from(text, (character) =>
    /[0-9]/.test(character) ? String.fromCodePoint(0x660 + Number(character)) : character
  ).join('');
}

/** Digits of the mathematical bold and monospace sets */
const MATHEMATICAL_BOLD_TWO = String.fromCodePoint(0x1d7d0);
const MATHEMATICAL_MONOSPACE_SEVEN = String.fromCodePoint(0x1d7fd);

// Targets
const HEIGHT = target('mdl', 'height');
const LOCALITY = target('pid', 'address_locality');
const NATIONALITIES = target('pid', 'nationalities');
const SEX = target('pid', 'sex');
const EYE_COLOUR = target('mdl', 'eye_colour');
const BIRTHDATE = target('pid', 'birthdate');
const MDL_BIRTH_DATE = target('mdl', 'birth_date');
const EXPIRY_DATE = target('mdl', 'expiry_date');
const CLASSES = target('mdl', 'driving_privileges', 'classes');

function placeOfBirth(part: string): RuleTarget {
  return target('pid', 'place_of_birth', part);
}

function classDate(part: 'issue_date' | 'expiry_date', licenceClass: string): RuleTarget {
  return target('mdl', 'driving_privileges', part, licenceClass);
}

/** The place of birth and the licence classes of test_evaluation.py */
const PLACE_OF_BIRTH = { country: 'DE', region: BADEN_WUERTTEMBERG, locality: 'Stuttgart' };
const PRIVILEGES = [
  { vehicle_category_code: 'AM', issue_date: '2015-06-01' },
  { vehicle_category_code: 'B', issue_date: '2019-03-01', expiry_date: '2034-03-01' },
  // Held, though its own expiry date has passed
  { vehicle_category_code: 'C1', issue_date: '2010-05-01', expiry_date: '2020-01-01' },
];

/** A case of one rule on one field's value, checked against Python's evaluator */
interface Case {
  name: string;
  target: RuleTarget;
  condition: Condition;
  value: unknown;
  outcome: Outcome;
}

function at(ruleTarget: RuleTarget, condition: Condition) {
  return (name: string, value: unknown, outcome: Outcome): Case => ({
    name,
    target: ruleTarget,
    condition,
    value,
    outcome,
  });
}

/** An applicant whose documents give one field */
function applicantWith(ruleTarget: RuleTarget, value: unknown): Applicant {
  return { [ruleTarget.document_type]: { [ruleTarget.field]: value } };
}

/** `_outcome()` of test_evaluation.py: the outcome of one rule on one field's value */
function outcomeOf(
  ruleTarget: RuleTarget,
  condition: Condition,
  value: unknown,
  day = SHARED_ON
): Outcome {
  return ruleOutcome(
    rule(1, ruleTarget, condition),
    applicantWith(ruleTarget, value),
    day,
    CONTEXT
  );
}

function branch(
  items: RuleTreeItem[],
  operator: Combinator = 'and',
  origin: EvaluatedBranch['origin'] = 'main'
): EvaluatedBranch {
  return { origin, operator, items };
}

function based(items: RuleTreeItem[], operator: Combinator = 'and'): EvaluatedBranch {
  return branch(items, operator, 'based');
}

function group(number: number, operator: Combinator, ...items: RuleTreeItem[]): GroupItem {
  return {
    type: 'group',
    id: `group-${number}`,
    name: `Group ${number}`,
    mark: null,
    operator,
    message: null,
    items,
  };
}

function marked<T extends RuleTreeItem>(item: T, mark: Mark): T {
  return { ...item, mark };
}

/**
 * `_results()` read off the evaluated items: depth first, each group before its members, each
 * item with the group that contains it
 */
function resultsOf(level: readonly EvaluatedItem[]): EvaluatedItem[] {
  return level.flatMap((entry) => [entry, ...resultsOf(entry.members)]);
}

/** `_reported()` of test_evaluation.py: each result's id, containing group and outcome */
function reported(evaluation: BranchEvaluation): [string, string | null, Outcome][] {
  return resultsOf(evaluation.items).map((entry) => [entry.item.id, entry.group, entry.outcome]);
}

/** The `Applicant` of a vector's delivered documents, as `_DocumentValues` reads them */
function applicantOfDocuments(documents: BranchEvaluationVector['documents']): Applicant {
  const applicant: Record<string, Record<string, unknown>> = {};
  for (const document of documents) {
    applicant[document.document_type] ??= {};
    for (const field of document.fields) {
      applicant[document.document_type][field.key] = field.value;
    }
  }
  return applicant;
}

function outcomes(evaluation: BranchEvaluation): Outcome[] {
  return evaluation.items.map((entry) => entry.outcome);
}

describe('the rule-outcome vectors', () => {
  it('has every vector of the fixture', () => {
    expect(OUTCOMES).toHaveLength(129);
  });

  it('meets and fails every operator of every kind, and leaves each kind not checked', () => {
    for (const [kind, definitions] of Object.entries(OPERATORS)) {
      const ofKind = OUTCOMES.filter((vector) => vector.kind === kind);
      expect(ofKind.some((vector) => vector.outcome === 'not_checked')).toBe(true);
      for (const { operator } of definitions) {
        const found = new Set(
          ofKind
            .filter((vector) => vector.condition.operator === operator)
            .map((vector) => vector.outcome)
        );
        expect([kind, operator, found.has('met'), found.has('not_met')]).toEqual([
          kind,
          operator,
          true,
          true,
        ]);
      }
    }
  });

  it.each(OUTCOMES)('$kind: $description', (vector) => {
    const applicant = applicantWith(vector.target, vector.value);
    const day = dayNumber(vector.today);
    const item: RuleItem = rule(1, vector.target, vector.condition, 'Not met.');

    expect(kindOf(vector.target, CONTEXT)).toEqual({
      kind: vector.kind,
      optionSet: vector.option_set,
    });
    expect(ruleOutcome(item, applicant, day, CONTEXT)).toBe(vector.outcome);
    // As the fixture's generator evaluates it: a main branch of that one rule
    const evaluation = evaluateBranch(branch([item]), applicant, day, CONTEXT);
    expect(outcomes(evaluation)).toEqual([vector.outcome]);
    expect(evaluation.met).toBe(vector.outcome === 'met');
  });
});

describe('the whole-branch vectors', () => {
  it('has every vector of the fixture', () => {
    expect(BRANCH_EVALUATIONS).toHaveLength(22);
  });

  it('covers met and unmet branches, every origin, and every outcome', () => {
    expect(new Set(BRANCH_EVALUATIONS.map((vector) => vector.met))).toEqual(new Set([true, false]));
    expect(new Set(BRANCH_EVALUATIONS.map((vector) => vector.branch.origin))).toEqual(
      new Set(['main', 'based', 'empty'])
    );
    expect(
      new Set(BRANCH_EVALUATIONS.flatMap((vector) => vector.results.map((each) => each.outcome)))
    ).toEqual(new Set(['met', 'not_met', 'not_checked']));
  });

  it.each(BRANCH_EVALUATIONS)('$name', (vector) => {
    const sharedOn = parseDayNumber(vector.shared_on);
    if (sharedOn === null) {
      throw new Error(`Not a day: ${vector.shared_on}`);
    }

    const evaluation = evaluateBranch(
      vector.branch,
      applicantOfDocuments(vector.documents),
      sharedOn,
      CONTEXT
    );

    expect(evaluation.met).toBe(vector.met);
    expect(
      resultsOf(evaluation.items).map((entry) => ({
        id: entry.item.id,
        group: entry.group,
        outcome: entry.outcome,
      }))
    ).toEqual(vector.results);
    expect(evaluation.messages).toEqual(vector.messages);
  });
});

// Each kind's cases beyond the vectors. Every expected outcome is the one Python's evaluator gives
// for the same rule, value and day (backend/tests/unit/test_evaluation.py has most of them)

const NUMBER_CASES: Case[] = [
  ...[true, false, '180', [180], { cm: 180 }].map((height) =>
    at(HEIGHT, { operator: 'greater_than', value: 0 })(
      `${JSON.stringify(height)} isn't a JSON number`,
      height,
      'not_checked'
    )
  ),
  at(HEIGHT, { operator: 'equal_to', value: 180 })('equal', 180, 'met'),
  at(HEIGHT, { operator: 'less_than', value: 0.5 })('0 is less than 0.5', 0, 'met'),
];

const TEXT_CASES: Case[] = [
  ...['', '   ', 70173, ['Stuttgart'], true].map((city) =>
    at(LOCALITY, { operator: 'not_equal_to', value: 'Stuttgart', match_case: false })(
      `${JSON.stringify(city)} is empty or no text`,
      city,
      'not_checked'
    )
  ),
  at(LOCALITY, { operator: 'contains', value: 'Stuttgart', match_case: false })(
    'contains',
    'Stuttgart-Vaihingen',
    'met'
  ),
  at(LOCALITY, { operator: 'equal_to', value: 'Stuttgart', match_case: false })(
    'not equal to a longer text',
    'Stuttgart-Vaihingen',
    'not_met'
  ),
  at(LOCALITY, { operator: 'not_contains', value: 'Stuttgart', match_case: false })(
    "doesn't contain",
    'Stuttgart-Vaihingen',
    'not_met'
  ),
  at(LOCALITY, { operator: 'equal_to', value: KOELN, match_case: true })(
    'a composed letter equals a decomposed one, respecting case',
    KOELN_DECOMPOSED,
    'met'
  ),
  at(LOCALITY, { operator: 'equal_to', value: KOELN_DECOMPOSED, match_case: false })(
    'a decomposed letter equals a composed one, ignoring case',
    KOELN,
    'met'
  ),
  at(LOCALITY, { operator: 'equal_to', value: KOELN, match_case: false })(
    'capitals with an umlaut, ignoring case',
    KOELN_CAPITALS,
    'met'
  ),
  at(LOCALITY, { operator: 'equal_to', value: KOELN, match_case: true })(
    'capitals with an umlaut, respecting case',
    KOELN_CAPITALS,
    'not_met'
  ),
  at(LOCALITY, { operator: 'equal_to', value: `  Stuttgart${TAB}`, match_case: true })(
    "the rule's text is trimmed",
    'Stuttgart',
    'met'
  ),
];

const ENUM_CASES: Case[] = [
  ...[[], [''], ['  '], [{ code: 'DE' }], [true]].flatMap((nationalities) =>
    (['includes_one_of', 'includes_none_of'] as const).map((operator) =>
      at(NATIONALITIES, { operator, values: ['DE'] })(
        `${JSON.stringify(nationalities)} can't be read, ${operator}`,
        nationalities,
        'not_checked'
      )
    )
  ),
  at(NATIONALITIES, { operator: 'includes_one_of', values: ['DE'] })(
    'a value outside the set is none of the values',
    ['XX'],
    'not_met'
  ),
  at(NATIONALITIES, { operator: 'includes_none_of', values: ['DE'] })(
    'a value outside the set is excluded by none',
    ['XX'],
    'met'
  ),
  at(NATIONALITIES, { operator: 'includes_one_of', values: ['DE'] })(
    'a list with a value that can be read and one that can not',
    [1, 'de'],
    'met'
  ),
  ...[true, 'female', 1.5].map((sex) =>
    at(SEX, { operator: 'includes_one_of', values: [1] })(
      `the code ${JSON.stringify(sex)} can't be read`,
      sex,
      'not_checked'
    )
  ),
  at(SEX, { operator: 'includes_one_of', values: [2] })('a code as a float', 2.0, 'met'),
  at(SEX, { operator: 'includes_one_of', values: [1, 2] })('a code outside the set', 7, 'not_met'),
  at(SEX, { operator: 'includes_one_of', values: ['1'] })("the rule's code as a text", 1, 'met'),
  at(SEX, { operator: 'includes_one_of', values: [1] })('a code with a leading zero', '01', 'met'),
  at(SEX, { operator: 'includes_one_of', values: [1] })('a decimal text', '1.0', 'not_checked'),
  at(SEX, { operator: 'includes_one_of', values: [1] })('a signed text', '+1', 'not_checked'),
  at(SEX, { operator: 'includes_one_of', values: [1] })(
    'an Arabic-Indic digit',
    arabicIndic('1'),
    'met'
  ),
  at(SEX, { operator: 'includes_one_of', values: [12] })(
    'digits of two scripts',
    `1${arabicIndic('2')}`,
    'met'
  ),
  at(SEX, { operator: 'includes_one_of', values: [2] })(
    'a mathematical bold digit',
    MATHEMATICAL_BOLD_TWO,
    'met'
  ),
  at(SEX, { operator: 'includes_one_of', values: [7] })(
    'a mathematical monospace digit, the last of five adjacent sets',
    MATHEMATICAL_MONOSPACE_SEVEN,
    'met'
  ),
  at(SEX, { operator: 'includes_one_of', values: [2] })(
    "a superscript digit isn't a decimal digit",
    SUPERSCRIPT_TWO,
    'not_checked'
  ),
  at(SEX, { operator: 'includes_one_of', values: [2] })(
    "a code with Python's whitespace",
    `${IDEOGRAPHIC_SPACE}2${NEXT_LINE}`,
    'met'
  ),
  at(SEX, { operator: 'includes_one_of', values: [2] })(
    'a code after a byte order mark',
    `${BYTE_ORDER_MARK}2`,
    'not_checked'
  ),
  at(EYE_COLOUR, { operator: 'includes_one_of', values: ['blue', 'green'] })(
    'a colour with a capital',
    'Blue',
    'met'
  ),
  at(EYE_COLOUR, { operator: 'includes_one_of', values: ['blue', 'green'] })(
    'another colour',
    'brown',
    'not_met'
  ),
  at(EYE_COLOUR, { operator: 'includes_one_of', values: ['blue'] })(
    'a number in a set of texts',
    2,
    'not_checked'
  ),
];

const AGE_21: Condition = { operator: 'at_least_years_ago', years: 21 };

const DATE_CASES: Case[] = [
  ...[
    '1984',
    '1984-01',
    '26.01.1984',
    '19840126',
    '1984-02-30',
    '0000-01-01',
    19840126,
    '',
    ['1984-01-26'],
    arabicIndic('1984-01-26'),
    '1984-01-26T',
  ].map((birthdate) =>
    at(BIRTHDATE, AGE_21)(`${JSON.stringify(birthdate)} can't be read`, birthdate, 'not_checked')
  ),
  at(BIRTHDATE, AGE_21)("a date with Python's whitespace", `${NEXT_LINE}1984-01-26 `, 'met'),
  at(BIRTHDATE, AGE_21)(
    'a date after a byte order mark',
    `${BYTE_ORDER_MARK}1984-01-26`,
    'not_checked'
  ),
  at(EXPIRY_DATE, { operator: 'on', date: ` 2030-01-01${TAB}` })(
    "the rule's date is trimmed",
    '2030-01-01',
    'met'
  ),
  at(EXPIRY_DATE, { operator: 'exactly_years_ago', years: 2 })(
    'exactly, on the last day',
    '2023-10-24',
    'met'
  ),
  at(EXPIRY_DATE, { operator: 'exactly_years_ago', years: 2 })(
    'exactly, a day too early',
    '2023-10-23',
    'not_met'
  ),
  at(EXPIRY_DATE, { operator: 'at_least_from_now', amount: 6, unit: 'months' })(
    'six months from now',
    '2027-04-23',
    'met'
  ),
  at(EXPIRY_DATE, { operator: 'at_least_from_now', amount: 6, unit: 'months' })(
    'a day short of six months',
    '2027-04-22',
    'not_met'
  ),
  at(EXPIRY_DATE, { operator: 'less_than_from_now', amount: 1, unit: 'years' })(
    'less than a year from now',
    '2027-10-22',
    'met'
  ),
  at(EXPIRY_DATE, { operator: 'less_than_from_now', amount: 1, unit: 'years' })(
    'a year from now',
    '2027-10-23',
    'not_met'
  ),
  at(MDL_BIRTH_DATE, { operator: 'exactly_years_ago', years: 21 })('21 today', '2005-10-23', 'met'),
  at(MDL_BIRTH_DATE, { operator: 'exactly_years_ago', years: 21 })(
    '22 today',
    '2004-10-23',
    'not_met'
  ),
];

const LOCALITY_IS_STUTTGART: Condition = {
  operator: 'equal_to',
  value: 'Stuttgart',
  match_case: false,
};

const PLACE_OF_BIRTH_CASES: Case[] = [
  at(placeOfBirth('country'), { operator: 'includes_one_of', values: ['DE'] })(
    'the country',
    PLACE_OF_BIRTH,
    'met'
  ),
  at(placeOfBirth('region'), {
    operator: 'equal_to',
    value: BADEN_WUERTTEMBERG.toLowerCase(),
    match_case: false,
  })('the region', PLACE_OF_BIRTH, 'met'),
  at(placeOfBirth('locality'), { operator: 'contains', value: 'stutt', match_case: true })(
    'the locality, respecting case',
    PLACE_OF_BIRTH,
    'not_met'
  ),
  ...[{ country: 'DE' }, { locality: null }, 'Stuttgart', [{ locality: 'Stuttgart' }]].map(
    (place) =>
      at(placeOfBirth('locality'), LOCALITY_IS_STUTTGART)(
        `${JSON.stringify(place)} has no locality`,
        place,
        'not_checked'
      )
  ),
];

const ISSUED_2_YEARS_AGO: Condition = { operator: 'at_least_years_ago', years: 2 };

const LICENCE_CLASS_CASES: Case[] = [
  at(CLASSES, { operator: 'includes_one_of', values: ['C1'] })(
    'a class is held whatever its own expiry date',
    PRIVILEGES,
    'met'
  ),
  at(CLASSES, { operator: 'includes_one_of', values: ['BE', 'B'] })(
    'one of two classes',
    PRIVILEGES,
    'met'
  ),
  at(CLASSES, { operator: 'includes_none_of', values: ['B'] })(
    'an excluded class held',
    PRIVILEGES,
    'not_met'
  ),
  at(CLASSES, { operator: 'includes_one_of', values: ['B'] })(
    "holding BE isn't holding B",
    [{ vehicle_category_code: 'BE' }],
    'not_met'
  ),
  at(classDate('issue_date', 'B'), ISSUED_2_YEARS_AGO)('held for 2 years', PRIVILEGES, 'met'),
  at(classDate('issue_date', 'B'), { operator: 'at_least_years_ago', years: 8 })(
    'not held for 8 years',
    PRIVILEGES,
    'not_met'
  ),
  at(classDate('expiry_date', 'C1'), {
    operator: 'at_least_from_now',
    amount: 1,
    unit: 'months',
  })('an expired class', PRIVILEGES, 'not_met'),
  at(classDate('expiry_date', 'AM'), {
    operator: 'at_least_from_now',
    amount: 6,
    unit: 'months',
  })(
    "a held class without its own expiry date, the licence's isn't read",
    PRIVILEGES,
    'not_checked'
  ),
  at(classDate('issue_date', 'C'), { operator: 'less_than_years_ago', years: 2 })(
    'a class not held, less than',
    PRIVILEGES,
    'not_met'
  ),
  at(classDate('expiry_date', 'C'), {
    operator: 'less_than_from_now',
    amount: 6,
    unit: 'months',
  })('a class not held, expiry date', PRIVILEGES, 'not_met'),
  at(classDate('issue_date', 'B'), ISSUED_2_YEARS_AGO)(
    'a class code in lower case',
    [{ vehicle_category_code: 'b', issue_date: '2019-03-01' }],
    'met'
  ),
  at(classDate('issue_date', 'B'), ISSUED_2_YEARS_AGO)(
    "a class code with Python's whitespace",
    [{ vehicle_category_code: ` b${NEXT_LINE}`, issue_date: '2019-01-01' }],
    'met'
  ),
  at(classDate('issue_date', 'B'), ISSUED_2_YEARS_AGO)(
    "a class listed twice: the first entry's date",
    [
      { vehicle_category_code: 'B', issue_date: '2025-01-01' },
      { vehicle_category_code: 'B', issue_date: '2019-01-01' },
    ],
    'not_met'
  ),
  // A class's code is matched without NFC, while the classes held compare in NFC
  at(classDate('issue_date', E_ACUTE), ISSUED_2_YEARS_AGO)(
    'a decomposed class code is another class for its dates',
    [{ vehicle_category_code: E_COMBINING_ACUTE, issue_date: '2019-01-01' }],
    'not_met'
  ),
  at(CLASSES, { operator: 'includes_one_of', values: [E_ACUTE] })(
    'a decomposed class code is the same class among those held',
    [{ vehicle_category_code: E_COMBINING_ACUTE, issue_date: '2019-01-01' }],
    'met'
  ),
  ...[
    [],
    [{}, {}],
    [{ vehicle_category_code: '' }],
    [{ vehicle_category_code: '  ' }],
    [{ vehicle_category_code: 1 }],
    'B',
    { vehicle_category_code: 'B' },
  ].flatMap((privileges) => [
    at(CLASSES, { operator: 'includes_one_of', values: ['B'] })(
      `the classes of ${JSON.stringify(privileges)} can't be read`,
      privileges,
      'not_checked'
    ),
    at(classDate('issue_date', 'B'), ISSUED_2_YEARS_AGO)(
      `a class's date in ${JSON.stringify(privileges)} can't be read`,
      privileges,
      'not_checked'
    ),
  ]),
];

/** What the save's checks refuse, which Python's evaluator raises on */
const REFUSED: [string, RuleTarget, Condition, unknown][] = [
  ['a number rule with a text', HEIGHT, { operator: 'greater_than', value: '170' }, 180],
  ['a number rule without a number', HEIGHT, { operator: 'greater_than' }, 180],
  ['an unknown number operator', HEIGHT, { operator: 'at_least', value: 170 }, 180],
  ['a text rule without a text', LOCALITY, { operator: 'equal_to', match_case: false }, 'Ulm'],
  ['a text rule with a blank text', LOCALITY, { operator: 'equal_to', value: '   ' }, 'Ulm'],
  ['an unknown text operator', LOCALITY, { operator: 'starts_with', value: 'U' }, 'Ulm'],
  ['an enum rule without values', SEX, { operator: 'includes_one_of', values: [] }, 1],
  ['an enum rule without a code', SEX, { operator: 'includes_one_of', values: ['x'] }, 1],
  ['an unknown enum operator', SEX, { operator: 'includes_some_of', values: [1] }, 1],
  ['a date rule without a date', EXPIRY_DATE, { operator: 'before' }, '2030-01-01'],
  [
    'a date rule with a date the calendar lacks',
    EXPIRY_DATE,
    { operator: 'before', date: '2030-02-30' },
    '2030-01-01',
  ],
  ['0 years', EXPIRY_DATE, { operator: 'at_least_years_ago', years: 0 }, '2030-01-01'],
  ['1.5 years', EXPIRY_DATE, { operator: 'at_least_years_ago', years: 1.5 }, '2030-01-01'],
  ['no unit', EXPIRY_DATE, { operator: 'at_least_from_now', amount: 2 }, '2030-01-01'],
  ['an unknown date operator', EXPIRY_DATE, { operator: 'within', years: 2 }, '2030-01-01'],
  ['an image', target('pid', 'picture'), { operator: 'equal_to', value: 'x' }, 'x'],
  [
    'a field the catalog lacks',
    target('pid', 'unknown'),
    { operator: 'equal_to', value: 'x' },
    'x',
  ],
  [
    'a part of a field without parts',
    target('pid', 'birthdate', 'issue_date'),
    ISSUED_2_YEARS_AGO,
    '2000-01-01',
  ],
  [
    'a licence class on a field without parts',
    target('pid', 'birthdate', null, 'B'),
    ISSUED_2_YEARS_AGO,
    '2000-01-01',
  ],
  [
    "a class's date without the class",
    target('mdl', 'driving_privileges', 'issue_date'),
    ISSUED_2_YEARS_AGO,
    PRIVILEGES,
  ],
  [
    'a part the field lacks',
    target('mdl', 'driving_privileges', 'birth_date'),
    ISSUED_2_YEARS_AGO,
    PRIVILEGES,
  ],
];

describe('ruleOutcome, beyond the vectors', () => {
  describe.each([
    ['numbers', NUMBER_CASES],
    ['text', TEXT_CASES],
    ['enums', ENUM_CASES],
    ['dates', DATE_CASES],
    ['the place of birth', PLACE_OF_BIRTH_CASES],
    ['the licence classes', LICENCE_CLASS_CASES],
  ])('%s', (_kind, cases) => {
    it.each(cases)('$name: $outcome', ({ target: ruleTarget, condition, value, outcome }) => {
      expect(outcomeOf(ruleTarget, condition, value)).toBe(outcome);
    });
  });

  it('reads a missing document, a missing field and null as missing', () => {
    const item = rule(1, BIRTHDATE, AGE_21);

    const missing: Applicant[] = [
      { pid: { family_name: 'Mustermann' } },
      { mdl: { birth_date: '1984-01-26' } },
      { pid: { birthdate: null } },
      {},
    ];

    for (const documents of missing) {
      expect(ruleOutcome(item, documents, SHARED_ON, CONTEXT)).toBe('not_checked');
    }
  });

  it.each(REFUSED)('throws for %s, as Python raises', (_name, ruleTarget, condition, value) => {
    expect(() => outcomeOf(ruleTarget, condition, value)).toThrow(Error);
  });

  it('throws for a rule without a target or a condition', () => {
    const applicant = { pid: { birthdate: '1984-01-26' } };

    expect(() =>
      ruleOutcome({ ...rule(1, BIRTHDATE, AGE_21), target: null }, applicant, SHARED_ON, CONTEXT)
    ).toThrow('A saved rule has no target or no condition');
    expect(() =>
      ruleOutcome({ ...rule(1, BIRTHDATE, AGE_21), condition: null }, applicant, SHARED_ON, CONTEXT)
    ).toThrow('A saved rule has no target or no condition');
  });

  it('checks the value before the condition, and whether the class is held', () => {
    // Python returns these before it reads the condition, which it would raise on
    expect(outcomeOf(HEIGHT, { operator: 'at_least', value: 170 }, null)).toBe('not_checked');
    expect(outcomeOf(HEIGHT, { operator: 'greater_than', value: '170' }, '180')).toBe(
      'not_checked'
    );
    expect(outcomeOf(SEX, { operator: 'includes_one_of', values: [] }, [])).toBe('not_checked');
    expect(
      outcomeOf(classDate('issue_date', 'C'), { operator: 'within', years: 2 }, PRIVILEGES)
    ).toBe('not_met');
  });

  it('throws for a date-time, which it does not port', () => {
    expect(() => outcomeOf(BIRTHDATE, AGE_21, '1984-01-26T10:00:00+01:00')).toThrow(
      'The evaluator reads no date-times'
    );
  });

  it('throws unless the day of sharing is a day number', () => {
    expect(() => outcomeOf(BIRTHDATE, AGE_21, '1984-01-26', 0)).toThrow(RangeError);
    expect(() => outcomeOf(BIRTHDATE, AGE_21, '1984-01-26', 1.5)).toThrow(RangeError);
  });
});

describe('the comparisons', () => {
  it('answer null for a value they cannot read, and whether it holds otherwise', () => {
    expect(numberHolds({ operator: 'greater_than', value: 20.5 }, 21)).toBe(true);
    expect(numberHolds({ operator: 'greater_than', value: 20.5 }, '21')).toBeNull();
    expect(textHolds({ operator: 'contains', value: 'gart' }, 'STUTTGART')).toBe(true);
    expect(textHolds({ operator: 'contains', value: 'gart' }, ' ')).toBeNull();
    expect(
      enumHolds({ operator: 'includes_one_of', values: [1] }, '1', 'sex', CONTEXT.optionSets)
    ).toBe(true);
    expect(
      enumHolds({ operator: 'includes_one_of', values: [1] }, [], 'sex', CONTEXT.optionSets)
    ).toBeNull();
    expect(() =>
      enumHolds({ operator: 'includes_one_of', values: [1] }, 1, 'unknown', CONTEXT.optionSets)
    ).toThrow('An enum rule names no known value set');
    expect(dateHolds(AGE_21, '2005-10-23', SHARED_ON)).toBe(true);
    expect(dateHolds(AGE_21, '2005-10-24', SHARED_ON)).toBe(false);
    expect(dateHolds(AGE_21, '2005', SHARED_ON)).toBeNull();
  });
});

// The levels: AND, OR, groups and based branches, as backend/tests/unit/test_evaluation.py

const [AT_LEAST_21_US1, HOLDS_B, B_FOR_2_YEARS] = US1_RULES;

/** Someone born on `birthdate` who lives in `city` and has held class B since `bSince` */
function applicant(birthdate: string, city: string, bSince: string | null): Applicant {
  const privilege = bSince
    ? { vehicle_category_code: 'B', issue_date: bSince }
    : { vehicle_category_code: 'AM', issue_date: '2020-01-01' };
  return {
    pid: { birthdate, address_locality: city },
    mdl: { driving_privileges: [privilege] },
  };
}

// On SHARED_ON, 23 Oct 2026
const AGED_25 = '2001-01-01';
const AGED_20 = '2006-06-30';
const AGED_18 = '2008-06-30';
const B_FOR_5 = '2021-09-01';
const B_FOR_3 = '2023-09-01';
const B_FOR_1 = '2025-09-01';

// User story 2: lives in Stuttgart AND (at least 21 OR (at least 19 AND has held class B for at
// least 3 years))
const LIVES_IN_STUTTGART = rule(1, LOCALITY, LOCALITY_IS_STUTTGART);
const AT_LEAST_21 = rule(2, BIRTHDATE, AGE_21);
const AT_LEAST_19 = rule(3, BIRTHDATE, { operator: 'at_least_years_ago', years: 19 });
const B_FOR_3_YEARS = rule(4, classDate('issue_date', 'B'), {
  operator: 'at_least_years_ago',
  years: 3,
});
const USER_STORY_2 = branch([
  LIVES_IN_STUTTGART,
  group(1, 'or', AT_LEAST_21, group(2, 'and', AT_LEAST_19, B_FOR_3_YEARS)),
]);

const AGED_20_B_FOR_1 = applicant(AGED_20, 'Stuttgart', B_FOR_1);

function evaluate(evaluated: EvaluatedBranch, documents: Applicant): BranchEvaluation {
  return evaluateBranch(evaluated, documents, SHARED_ON, CONTEXT);
}

describe('evaluateBranch', () => {
  it('meets the three rules of a 25-year-old who has held B for 5 years', () => {
    const evaluation = evaluate(branch(US1_RULES), applicant(AGED_25, 'Stuttgart', B_FOR_5));

    expect(evaluation.met).toBe(true);
    expect(reported(evaluation)).toEqual([
      ['rule-1', null, 'met'],
      ['rule-2', null, 'met'],
      ['rule-3', null, 'met'],
    ]);
  });

  it("doesn't meet them for a 20-year-old who has held B for 1 year", () => {
    const evaluation = evaluate(branch(US1_RULES), AGED_20_B_FOR_1);

    expect(evaluation.met).toBe(false);
    expect(outcomes(evaluation)).toEqual(['not_met', 'met', 'not_met']);
  });

  it('counts not checked as not met in AND', () => {
    const documents = {
      pid: { birthdate: '1984' },
      mdl: { driving_privileges: [{ vehicle_category_code: 'B' }] },
    };

    const evaluation = evaluate(branch([AT_LEAST_21_US1, HOLDS_B]), documents);

    expect(evaluation.met).toBe(false);
    expect(outcomes(evaluation)).toEqual(['not_checked', 'met']);
  });

  it('meets OR when one rule is met', () => {
    const evaluation = evaluate(
      branch([AT_LEAST_21_US1, B_FOR_2_YEARS], 'or'),
      applicant(AGED_20, 'Stuttgart', B_FOR_5)
    );

    expect(evaluation.met).toBe(true);
    expect(outcomes(evaluation)).toEqual(['not_met', 'met']);
  });

  it("doesn't meet OR when no rule is met", () => {
    const evaluation = evaluate(branch(US1_RULES, 'or'), applicant(AGED_20, 'Esslingen', null));

    expect(evaluation.met).toBe(false);
    expect(outcomes(evaluation)).toEqual(['not_met', 'not_met', 'not_met']);
  });

  it.each(['and', 'or'] as const)('meets a branch without rules, with %s', (operator) => {
    expect(evaluate(branch([], operator), {})).toEqual({ met: true, items: [], messages: [] });
  });

  it.each([
    ['at least 21', applicant(AGED_25, 'Stuttgart', B_FOR_1), true],
    ['at least 19 with class B for 3 years', applicant(AGED_20, 'Stuttgart', B_FOR_3), true],
    ['20 with class B for 1 year', applicant(AGED_20, 'Stuttgart', B_FOR_1), false],
    ['at least 21, but not from Stuttgart', applicant(AGED_25, 'Esslingen', B_FOR_3), false],
    ['neither way to qualify', applicant(AGED_18, 'Esslingen', null), false],
  ])('user story 2: %s', (_name, documents, met) => {
    expect(evaluate(USER_STORY_2, documents).met).toBe(met);
  });

  it('gives a group its AND or OR of its members, and its members their own outcomes', () => {
    expect(reported(evaluate(USER_STORY_2, AGED_20_B_FOR_1))).toEqual([
      ['rule-1', null, 'met'],
      ['group-1', null, 'not_met'],
      ['rule-2', 'group-1', 'not_met'],
      ['group-2', 'group-1', 'not_met'],
      ['rule-3', 'group-2', 'met'],
      ['rule-4', 'group-2', 'not_met'],
    ]);
  });

  it("reports the members of a group without a message of its own, and none when it's met", () => {
    const unmet = evaluate(USER_STORY_2, AGED_20_B_FOR_1);
    const met = evaluate(USER_STORY_2, applicant(AGED_25, 'Stuttgart', B_FOR_1));

    expect(unmet.messages.map(({ id }) => id)).toEqual(['rule-2', 'rule-4']);
    expect(met.messages).toEqual([]);
  });

  it('meets an OR group through one member', () => {
    const evaluation = evaluate(
      branch([LIVES_IN_STUTTGART, group(1, 'or', AT_LEAST_21, B_FOR_3_YEARS)]),
      applicant(AGED_25, 'Esslingen', B_FOR_1)
    );

    expect(reported(evaluation)).toEqual([
      ['rule-1', null, 'not_met'],
      ['group-1', null, 'met'],
      ['rule-2', 'group-1', 'met'],
      ['rule-4', 'group-1', 'not_met'],
    ]);
  });

  it('meets an OR top level through a met group', () => {
    const evaluation = evaluate(
      branch([LIVES_IN_STUTTGART, group(1, 'and', AT_LEAST_19, B_FOR_3_YEARS)], 'or'),
      applicant(AGED_20, 'Esslingen', B_FOR_3)
    );

    expect(evaluation.met).toBe(true);
  });

  it('counts not checked as not met in a group', () => {
    const documents = {
      pid: { birthdate: '1984' },
      mdl: { driving_privileges: [{ vehicle_category_code: 'B' }] },
    };

    const evaluation = evaluate(branch([group(1, 'or', AT_LEAST_21, B_FOR_3_YEARS)]), documents);

    expect(evaluation.met).toBe(false);
    expect(reported(evaluation)).toEqual([
      ['group-1', null, 'not_met'],
      ['rule-2', 'group-1', 'not_checked'],
      ['rule-4', 'group-1', 'not_checked'],
    ]);
  });
});

describe('evaluateBranch on a branch based on the main branch', () => {
  it('evaluates changed and added rules as the branch has them', () => {
    const changedAge = marked(
      { ...AT_LEAST_21, condition: { operator: 'at_least_years_ago', years: 19 } },
      'changed'
    );

    const evaluation = evaluate(
      based([changedAge, marked(B_FOR_3_YEARS, 'added')]),
      AGED_20_B_FOR_1
    );

    expect(reported(evaluation)).toEqual([
      ['rule-2', null, 'met'],
      ['rule-4', null, 'not_met'],
    ]);
  });

  it("combines the top level with the branch's operator", () => {
    expect(evaluate(based([AT_LEAST_21, AT_LEAST_19], 'or'), AGED_20_B_FOR_1).met).toBe(true);
  });

  it('leaves out removed rules', () => {
    const evaluation = evaluate(
      based([marked(AT_LEAST_21, 'removed'), AT_LEAST_19]),
      AGED_20_B_FOR_1
    );

    expect(reported(evaluation)).toEqual([['rule-3', null, 'met']]);
    expect(evaluation.met).toBe(true);
  });

  it('leaves out a removed group with its members', () => {
    const removed = marked(group(1, 'and', AT_LEAST_21, B_FOR_3_YEARS), 'removed');

    const evaluation = evaluate(based([LIVES_IN_STUTTGART, removed]), AGED_20_B_FOR_1);

    expect(reported(evaluation)).toEqual([['rule-1', null, 'met']]);
    expect(evaluation.met).toBe(true);
  });

  it.each(['and', 'or'] as const)('meets a branch whose rules are all removed, with %s', (op) => {
    const evaluation = evaluate(
      based(
        [
          marked(AT_LEAST_21, 'removed'),
          marked(group(1, 'and', AT_LEAST_19, B_FOR_3_YEARS), 'removed'),
        ],
        op
      ),
      AGED_20_B_FOR_1
    );

    expect(evaluation).toEqual({ met: true, items: [], messages: [] });
  });

  it('puts the remaining member of a dissolved group in its place', () => {
    const dissolved = group(
      1,
      'or',
      marked(AT_LEAST_21, 'removed'),
      group(2, 'and', AT_LEAST_19, B_FOR_3_YEARS)
    );

    expect(reported(evaluate(based([LIVES_IN_STUTTGART, dissolved]), AGED_20_B_FOR_1))).toEqual([
      ['rule-1', null, 'met'],
      ['group-2', null, 'not_met'],
      ['rule-3', 'group-2', 'met'],
      ['rule-4', 'group-2', 'not_met'],
    ]);
  });

  it('puts the rule of a dissolved sub-group in the group', () => {
    const subGroup = group(2, 'and', marked(AT_LEAST_19, 'removed'), B_FOR_3_YEARS);

    expect(
      reported(evaluate(based([group(1, 'or', AT_LEAST_21, subGroup)]), AGED_20_B_FOR_1))
    ).toEqual([
      ['group-1', null, 'not_met'],
      ['rule-2', 'group-1', 'not_met'],
      ['rule-4', 'group-1', 'not_met'],
    ]);
  });

  it('dissolves a changed group too', () => {
    const changed = marked(
      group(1, 'or', marked(AT_LEAST_21, 'removed'), B_FOR_3_YEARS),
      'changed'
    );

    expect(reported(evaluate(based([changed]), AGED_20_B_FOR_1))).toEqual([
      ['rule-4', null, 'not_met'],
    ]);
  });

  it('leaves out a dissolved group without members that count', () => {
    const empty = group(1, 'and', marked(AT_LEAST_21, 'removed'), marked(AT_LEAST_19, 'removed'));

    expect(reported(evaluate(based([empty, B_FOR_3_YEARS]), AGED_20_B_FOR_1))).toEqual([
      ['rule-4', null, 'not_met'],
    ]);
  });

  it.each([
    ['the removal was undone', AT_LEAST_21],
    ['Standard added a member', B_FOR_3_YEARS],
    ['the branch added one', marked(B_FOR_3_YEARS, 'added')],
  ])('counts a group again once two members count: %s', (_name, second) => {
    const evaluation = evaluate(based([group(1, 'or', AT_LEAST_19, second)]), AGED_20_B_FOR_1);

    expect(reported(evaluation).map(([id, groupId]) => [id, groupId])).toEqual([
      ['group-1', null],
      ['rule-3', 'group-1'],
      [second.id, 'group-1'],
    ]);
  });

  it('counts a sub-group the branch formed as one member of the group', () => {
    const own = marked(group(5, 'and', AT_LEAST_21, AT_LEAST_19), 'added');

    const alone = evaluate(based([group(1, 'or', own)]), AGED_20_B_FOR_1);
    const beside = evaluate(based([group(1, 'or', own, B_FOR_3_YEARS)]), AGED_20_B_FOR_1);

    expect(reported(alone)).toEqual([
      ['group-5', null, 'not_met'],
      ['rule-2', 'group-5', 'not_met'],
      ['rule-3', 'group-5', 'met'],
    ]);
    expect(reported(beside)).toEqual([
      ['group-1', null, 'not_met'],
      ['group-5', 'group-1', 'not_met'],
      ['rule-2', 'group-5', 'not_met'],
      ['rule-3', 'group-5', 'met'],
      ['rule-4', 'group-1', 'not_met'],
    ]);
  });

  it("throws for a group the branch added with one member that counts, which it doesn't dissolve", () => {
    const own = marked(group(5, 'and', AT_LEAST_19, marked(AT_LEAST_21, 'removed')), 'added');

    expect(() => evaluate(based([own]), AGED_20_B_FOR_1)).toThrow(
      'A saved group has fewer than two members that count'
    );
  });
});

describe('evaluateBranch on what the save refuses', () => {
  it.each(
    (['main', 'empty'] as const).flatMap((origin) =>
      (['changed', 'removed', 'added'] as const).map((mark) => [origin, mark] as const)
    )
  )('throws for a mark in a %s branch: %s', (origin, mark) => {
    expect(() =>
      evaluate(branch([marked(AT_LEAST_21, mark)], 'and', origin), AGED_20_B_FOR_1)
    ).toThrow('A branch that is not based on the main branch has a mark');
  });

  it.each([
    ['a marked group', marked(group(1, 'or', AT_LEAST_21, AT_LEAST_19), 'changed')],
    ['a group with a removed member', group(1, 'or', marked(AT_LEAST_21, 'removed'), AT_LEAST_19)],
    ['a group of one', group(1, 'or', AT_LEAST_21)],
    ['an empty group', group(1, 'or')],
  ])('throws for %s in the main branch', (_name, item) => {
    expect(() => evaluate(branch([item]), AGED_20_B_FOR_1)).toThrow(Error);
  });

  it('throws for a rule that cannot be evaluated, wherever it is', () => {
    const noTarget = { ...AT_LEAST_19, id: 'rule-9', target: null };

    expect(() =>
      evaluate(branch([AT_LEAST_21, group(1, 'or', AT_LEAST_19, noTarget)], 'or'), AGED_20_B_FOR_1)
    ).toThrow('A saved rule has no target or no condition');
  });

  it('throws unless the day of sharing is a day number', () => {
    expect(() => evaluateBranch(branch([]), {}, 0, CONTEXT)).toThrow(RangeError);
  });
});
