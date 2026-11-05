import { describe, expect, it } from 'vitest';

import type {
  Combinator,
  Condition,
  GroupItem,
  RuleItem,
  RuleTarget,
  RuleTreeItem,
} from '../../../types/form-connections';
import { OPERATORS } from '../constants';
import { type Applicant, evaluateBranch, type EvaluatedItem, ruleOutcome } from '../evaluation';
import { rule, target } from '../testData';
import { deleteItem, isDissolved } from '../tree';
import { dayNumber, isoDate } from './calendar';
import { CASE_FOLDING } from './caseFolding';
import { FIRST_DAY, LAST_DAY } from './constants';
import {
  BRANCH,
  checkedBranchOf,
  FROM_TODAY,
  type GeneratedBranch,
  LATER_DAYS,
  MAX_TEXT_RULES,
  met,
  type Oracle,
  ORACLE_CONTEXT,
  ORACLE_TODAY,
  ORACLE_TODAY_DAY,
  oracleOf,
  randomBranch,
  TEXT_LETTERS,
  TEXT_UNITS,
  withSeed,
} from './testOracle';
import { normalisedText } from './text';
import type { CheckedItem } from './types';

/** The seeds the survey of generated branches reads */
const SEEDS = 1000;

/**
 * The time limit of the test that builds the survey: it checks all `SEEDS` branches, 2 to 3 s
 * alone and over Vitest's 5 s default while the full suite runs in parallel
 */
const SURVEY_TIMEOUT_MS = 30_000;

/** Characters the cases need, written as code points */
const SHARP_S = String.fromCodePoint(0xdf);
const COMBINING_DOT_ABOVE = String.fromCodePoint(0x307);

// Targets
const HEIGHT = target('mdl', 'height');
const SEX = target('pid', 'sex');
const CLASSES = target('mdl', 'driving_privileges', 'classes');
const ISSUE_DATE_B = target('mdl', 'driving_privileges', 'issue_date', 'B');
const FAMILY_NAME = target('pid', 'family_name');
const BIRTHDATE = target('pid', 'birthdate');
const EXPIRY = target('pid', 'date_of_expiry');

/** The date fields whose rules the date check enumerates densely */
const DATE_FIELDS = [BIRTHDATE, EXPIRY];

/** A branch built by hand, not based on the main branch */
function handBranch(key: string, items: RuleTreeItem[], operator: Combinator = 'and') {
  return { key, origin: 'main' as const, operator, items };
}

/** Rules numbered from 1 in the order given */
function rules(...checks: [RuleTarget, Condition][]): RuleItem[] {
  return checks.map(([ruleTarget, condition], index) => rule(index + 1, ruleTarget, condition));
}

function group(number: number, operator: Combinator, items: RuleTreeItem[]): GroupItem {
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

/** Every item of a tree, top-down */
function flat(items: readonly RuleTreeItem[]): RuleTreeItem[] {
  return items.flatMap((item) => (item.type === 'rule' ? [item] : [item, ...flat(item.items)]));
}

/** The ids of a checked tree's items, top-down */
function checkedIds(items: readonly CheckedItem[]): string[] {
  return items.flatMap((item) =>
    item.type === 'rule' ? [item.id] : [item.id, ...checkedIds(item.items)]
  );
}

/** How many levels a tree has: 1 without groups */
function levels(items: readonly RuleTreeItem[]): number {
  return Math.max(1, ...items.map((item) => (item.type === 'group' ? 1 + levels(item.items) : 1)));
}

/** The kind of value a generated rule's target compares, as `OPERATORS` names it */
function kindOf(ruleTarget: RuleTarget): string {
  if (ruleTarget.field === 'height') {
    return 'number';
  }
  if (ruleTarget.field === 'family_name') {
    return 'text';
  }
  if (ruleTarget.field === 'sex' || ruleTarget.part === 'classes') {
    return 'enum';
  }
  return 'date';
}

/** What the generated branches of `SEEDS` seeds hold, read once */
interface Survey {
  operators: Set<string>;
  targets: Set<string>;
  matchCases: Set<string>;
  decimals: number;
  levels: Set<number>;
  topOperators: Set<Combinator>;
  groupOperators: Set<Combinator>;
  based: number;
  removed: number;
  dissolved: number;
  unmeetableToday: number;
  meetableLater: number;
  allMeet: number;
}

let survey: Survey | null = null;

/** The survey of the generated branches, which also checks each one */
function surveyed(): Survey {
  if (survey) {
    return survey;
  }
  const result: Survey = {
    operators: new Set(),
    targets: new Set(),
    matchCases: new Set(),
    decimals: 0,
    levels: new Set(),
    topOperators: new Set(),
    groupOperators: new Set(),
    based: 0,
    removed: 0,
    dissolved: 0,
    unmeetableToday: 0,
    meetableLater: 0,
    allMeet: 0,
  };
  for (let seed = 1; seed <= SEEDS; seed += 1) {
    withSeed(seed, () => surveyOne(randomBranch(seed), result));
  }
  survey = result;
  return result;
}

/** Checks one generated branch and adds it to the survey */
function surveyOne(branch: GeneratedBranch, result: Survey): void {
  const all = flat(branch.items);
  const allRules = all.filter((item): item is RuleItem => item.type === 'rule');
  expect(allRules.length).toBeGreaterThanOrEqual(2);
  expect(allRules.length).toBeLessThanOrEqual(8);
  expect(levels(branch.items)).toBeLessThanOrEqual(3);
  const textRules = allRules.filter(({ target: each }) => each?.field === 'family_name');
  expect(textRules.length).toBeLessThanOrEqual(MAX_TEXT_RULES);

  // Checked whole, with the oracle's items
  const checked = checkedBranchOf(branch);
  expect(checked.leftOut).toEqual([]);
  const oracle = oracleOf(branch);
  expect(oracle.itemIds).toEqual(checkedIds(checked.items));
  expect(oracle.itemIds.filter((id) => id.startsWith('rule-')).length).toBeGreaterThanOrEqual(2);

  for (const each of allRules) {
    const { operator } = each.condition ?? { operator: '' };
    result.operators.add(`${kindOf(each.target ?? HEIGHT)}:${operator}`);
    result.targets.add(JSON.stringify(each.target));
    if (each.target?.field === 'family_name') {
      result.matchCases.add(String(each.condition?.match_case ?? 'absent'));
    }
    if (each.target?.field === 'height' && !Number.isInteger(each.condition?.value)) {
      result.decimals += 1;
    }
  }
  result.levels.add(levels(branch.items));
  result.topOperators.add(branch.operator);
  for (const item of all) {
    if (item.type === 'group') {
      result.groupOperators.add(item.operator);
    }
  }
  if (branch.origin === 'based') {
    result.based += 1;
    result.removed += all.some((item) => item.mark === 'removed') ? 1 : 0;
    const dissolved = dissolvedGroups(branch.items);
    expect(dissolved.filter((id) => oracle.itemIds.includes(id))).toEqual([]);
    result.dissolved += dissolved.length > 0 ? 1 : 0;
  }
  const today = oracle.canMeet([BRANCH], ORACLE_TODAY_DAY);
  result.unmeetableToday += today ? 0 : 1;
  result.meetableLater += !today && oracle.canMeet([BRANCH], LATER_DAYS) ? 1 : 0;
  result.allMeet += oracle.alwaysMet([BRANCH], FROM_TODAY) ? 1 : 0;
}

/** The inherited groups dissolved in a based branch, outside removed items */
function dissolvedGroups(items: readonly RuleTreeItem[]): string[] {
  return items.flatMap((item) => {
    if (item.mark === 'removed' || item.type === 'rule') {
      return [];
    }
    return [...(isDissolved(item, true) ? [item.id] : []), ...dissolvedGroups(item.items)];
  });
}

/** The sets of items met, with the branch's outcome, of each applicant on `day` */
function metSets(oracle: Oracle, branch: GeneratedBranch, day: number): Set<string> {
  const sets = new Set<string>();
  for (const applicant of oracle.applicantsOn(day)) {
    const evaluation = evaluateBranch(branch, applicant, day, ORACLE_CONTEXT);
    const metIds: string[] = [];
    const visit = (item: EvaluatedItem): void => {
      if (item.outcome === 'met') {
        metIds.push(item.item.id);
      }
      item.members.forEach(visit);
    };
    evaluation.items.forEach(visit);
    sets.add(`${evaluation.met} ${metIds.join(',')}`);
  }
  return sets;
}

/** The outcomes of `fieldRules` for the applicant on `day`, a letter each */
function vectorOf(fieldRules: readonly RuleItem[], applicant: Applicant, day: number): string {
  return fieldRules.map((each) => ruleOutcome(each, applicant, day, ORACLE_CONTEXT)).join(',');
}

/** The texts' two forms, reduced to what the generated rules can tell apart (testOracle.ts) */
const WRITTEN_LETTERS: ReadonlySet<string> = new Set(TEXT_LETTERS);
const FOLDED_LETTERS: ReadonlySet<string> = new Set(['a', 'b', 's']);

function reduced(text: string, letters: ReadonlySet<string>): string {
  return Array.from(text, (character) => (letters.has(character) ? character : '-'))
    .join('')
    .replace(/-+/g, '-');
}

function formsOf(text: string): string {
  const written = reduced(normalisedText(text, true), WRITTEN_LETTERS);
  return `${written} | ${reduced(normalisedText(text, false), FOLDED_LETTERS)}`;
}

/** The forms of every string of one to `most` of the units */
function unitForms(most: number): Set<string> {
  const forms = new Set<string>();
  let level = [''];
  for (let length = 1; length <= most; length += 1) {
    level = level.flatMap((text) => TEXT_UNITS.map((unit) => text + unit));
    level.forEach((text) => forms.add(formsOf(text)));
  }
  return forms;
}

describe('randomBranch()', () => {
  it('gives the same branch for the same seed, and different branches for different seeds', () => {
    expect(randomBranch(7)).toEqual(randomBranch(7));
    expect(randomBranch(7).key).toBe('seed-7');
    const distinct = new Set(
      Array.from({ length: 100 }, (_, index) => JSON.stringify(randomBranch(index + 1).items))
    );
    expect(distinct.size).toBeGreaterThan(95);
  });

  // The first to read the survey, so it builds it
  it(
    'builds branches of two to eight complete rules that are checked whole',
    {
      timeout: SURVEY_TIMEOUT_MS,
    },
    () => {
      // surveyOne() checks each: checkedBranchOf() leaves nothing out, and the checked tree's items
      // are the oracle's items
      expect(surveyed().operators.size).toBeGreaterThan(0);
    }
  );

  it('covers every operator of every kind, both letter-case settings and decimals', () => {
    const { operators, targets, matchCases, decimals } = surveyed();
    for (const [kind, definitions] of Object.entries(OPERATORS)) {
      for (const { operator } of definitions) {
        expect(operators).toContain(`${kind}:${operator}`);
      }
    }
    for (const each of [HEIGHT, SEX, CLASSES, FAMILY_NAME, BIRTHDATE, EXPIRY]) {
      expect(targets).toContain(JSON.stringify(each));
    }
    for (const part of ['issue_date', 'expiry_date']) {
      for (const licenceClass of ['A', 'B', 'C']) {
        expect(targets).toContain(
          JSON.stringify(target('mdl', 'driving_privileges', part, licenceClass))
        );
      }
    }
    expect(matchCases).toEqual(new Set(['true', 'false', 'absent']));
    expect(decimals).toBeGreaterThan(0);
  });

  it('covers one to three levels, AND and OR, and based branches with removed items', () => {
    const { levels: depths, topOperators, groupOperators, based, removed, dissolved } = surveyed();
    expect(depths).toEqual(new Set([1, 2, 3]));
    expect(topOperators).toEqual(new Set(['and', 'or']));
    expect(groupOperators).toEqual(new Set(['and', 'or']));
    expect(based).toBeGreaterThan(SEEDS / 5);
    expect(removed).toBeGreaterThan(SEEDS / 10);
    expect(dissolved).toBeGreaterThan(0);
  });

  it("gives branches that can be met, that can't, and that only later days can meet", () => {
    const { unmeetableToday, meetableLater, allMeet } = surveyed();
    expect(unmeetableToday).toBeGreaterThan(SEEDS / 10);
    expect(unmeetableToday).toBeLessThan(SEEDS / 2);
    expect(meetableLater).toBeGreaterThan(0);
    expect(allMeet).toBeGreaterThan(SEEDS / 20);
  });
});

describe('withSeed()', () => {
  it('passes the result through, and names the seed in what fails', () => {
    expect(withSeed(42, () => 'done')).toBe('done');
    expect(() =>
      withSeed(42, () => {
        expect(1).toBe(2);
      })
    ).toThrow(/^seed 42: /);
  });
});

describe('the texts the oracle enumerates', () => {
  it('stand for every character: each adds to the two forms what one or two units add', () => {
    const forms = unitForms(2);
    const missing: string[] = [];
    // No code point beyond U+1FFFF folds, or decomposes into a letter the rules use
    for (let codePoint = 0; codePoint <= 0x1ffff; codePoint += 1) {
      if (codePoint >= 0xd800 && codePoint <= 0xdfff) {
        continue;
      }
      const text = String.fromCodePoint(codePoint);
      if (normalisedText(text, true) !== '' && !forms.has(formsOf(text))) {
        missing.push(codePoint.toString(16));
      }
    }
    expect(missing).toEqual([]);
    expect([...CASE_FOLDING.keys()].every((codePoint) => codePoint <= 0x1ffff)).toBe(true);
  });

  it('stand for each letter that folds to a, b or s, followed by every combining mark', () => {
    const forms = unitForms(3);
    const folding = [...CASE_FOLDING]
      .filter(([, folded]) => /[abs]/.test(folded))
      .map(([codePoint]) => String.fromCodePoint(codePoint));
    // A, B, S, the long s, ß, the capital ẞ, ẚ (U+1E9A) and the ligatures ﬅ and ﬆ
    expect(folding).toHaveLength(9);
    const marks: string[] = [];
    for (let codePoint = 0x300; codePoint <= 0xe01ef; codePoint += 1) {
      const character =
        codePoint >= 0xd800 && codePoint <= 0xdfff ? '' : String.fromCodePoint(codePoint);
      if (/^\p{M}$/u.test(character)) {
        marks.push(character);
      }
    }
    const missing = ['a', 'b', 's', ...folding].flatMap((letter) =>
      marks
        .filter((mark) => !forms.has(formsOf(letter + mark)))
        .map((mark) => `${letter} ${mark.codePointAt(0)?.toString(16)}`)
    );
    expect(missing).toEqual([]);
  });

  it('find ß followed by a mark, and "ssss", where letter case is mixed', () => {
    const sharpS = handBranch(
      'sharp s',
      rules(
        [FAMILY_NAME, { operator: 'contains', value: SHARP_S, match_case: true }],
        [FAMILY_NAME, { operator: 'not_contains', value: SHARP_S, match_case: false }]
      )
    );
    const written = oracleOf(sharpS).whoMeets([BRANCH], ORACLE_TODAY_DAY);
    expect(written?.applicant.pid.family_name).toBe(SHARP_S + COMBINING_DOT_ABOVE);

    const folded = handBranch(
      'folded',
      rules(
        [FAMILY_NAME, { operator: 'equal_to', value: SHARP_S + SHARP_S, match_case: false }],
        [FAMILY_NAME, { operator: 'not_contains', value: SHARP_S, match_case: true }]
      )
    );
    expect(oracleOf(folded).whoMeets([BRANCH], ORACLE_TODAY_DAY)?.applicant.pid.family_name).toBe(
      'ssss'
    );
  });

  it('tell the letter-case settings apart (EC "Letter case")', () => {
    const respecting = handBranch(
      'respecting',
      rules(
        [FAMILY_NAME, { operator: 'equal_to', value: 'Ab', match_case: true }],
        [FAMILY_NAME, { operator: 'equal_to', value: 'ab', match_case: true }]
      )
    );
    expect(oracleOf(respecting).canMeet([BRANCH], FROM_TODAY)).toBe(false);
    const ignoring = handBranch(
      'ignoring',
      rules(
        [FAMILY_NAME, { operator: 'equal_to', value: 'Ab', match_case: false }],
        [FAMILY_NAME, { operator: 'equal_to', value: 'ab' }]
      )
    );
    const oracle = oracleOf(ignoring);
    expect(oracle.canMeet([BRANCH], ORACLE_TODAY_DAY)).toBe(true);
    expect(oracle.changedOutcome(['rule-2'], FROM_TODAY)).toBeNull();
  });

  it("refuse text rules they don't stand for", () => {
    const three = handBranch(
      'three',
      rules(
        [FAMILY_NAME, { operator: 'contains', value: 'a' }],
        [FAMILY_NAME, { operator: 'contains', value: 'b' }],
        [FAMILY_NAME, { operator: 'contains', value: 'A' }]
      )
    );
    expect(() => oracleOf(three)).toThrow(/three: the oracle's texts stand for/);
    const long = handBranch('long', rules([FAMILY_NAME, { operator: 'contains', value: 'abc' }]));
    expect(() => oracleOf(long)).toThrow(/long: the oracle's texts stand for/);
  });
});

describe('oracleOf()', () => {
  it('finds no whole number above 2 and below 3 (EC "Whole numbers")', () => {
    const oracle = oracleOf(
      handBranch(
        'whole numbers',
        rules(
          [HEIGHT, { operator: 'greater_than', value: 2 }],
          [HEIGHT, { operator: 'less_than', value: 3 }]
        )
      )
    );
    expect(oracle.canMeet([BRANCH], FROM_TODAY)).toBe(false);
    expect(oracle.canMeet(['rule-1'], ORACLE_TODAY_DAY)).toBe(true);
    expect(oracle.canMeet(['rule-2'], ORACLE_TODAY_DAY)).toBe(true);

    const decimal = oracleOf(
      handBranch(
        'decimal',
        rules(
          [HEIGHT, { operator: 'greater_than', value: 2 }],
          [HEIGHT, { operator: 'less_than', value: 3.5 }]
        )
      )
    );
    expect(decimal.whoMeets([BRANCH], ORACLE_TODAY_DAY)?.applicant.mdl.height).toBe(3);
  });

  it('finds no date before 1 Jan 2030 and after 31 Dec 2029 (EC "Adjacent dates")', () => {
    const oracle = oracleOf(
      handBranch(
        'adjacent',
        rules(
          [EXPIRY, { operator: 'before', date: '2030-01-01' }],
          [EXPIRY, { operator: 'after', date: '2029-12-31' }]
        )
      )
    );
    expect(oracle.canMeet([BRANCH], { from: FIRST_DAY, to: LAST_DAY })).toBe(false);
  });

  it('meets a fixed date and an age from a later day on (EC-7, scaled to a year)', () => {
    // Born after 1 Mar 2027 and at least 1 year old: from 2 Mar 2028 on
    const oracle = oracleOf(
      handBranch(
        'EC-7',
        rules(
          [BIRTHDATE, { operator: 'after', date: '2027-03-01' }],
          [BIRTHDATE, { operator: 'at_least_years_ago', years: 1 }]
        )
      )
    );
    expect(oracle.canMeet([BRANCH], ORACLE_TODAY_DAY)).toBe(false);
    expect(oracle.canMeet([BRANCH], LATER_DAYS)).toBe(true);
    expect(oracle.meetDays([BRANCH], FROM_TODAY)).toEqual([
      { from: dayNumber('2028-03-02'), to: LAST_DAY },
    ]);
    expect(oracle.whoMeets([BRANCH], FROM_TODAY)?.date).toBe('2028-03-02');
  });

  it('keeps a fixed date that adds nothing today but does later (EC-7, second example)', () => {
    // Born before 1 Mar 2027 and at least 1 year old: the first rule matters from 1 Mar 2028 on
    const oracle = oracleOf(
      handBranch(
        'EC-7 later',
        rules(
          [BIRTHDATE, { operator: 'before', date: '2027-03-01' }],
          [BIRTHDATE, { operator: 'at_least_years_ago', years: 1 }]
        )
      )
    );
    expect(oracle.changedOutcome(['rule-1'], ORACLE_TODAY_DAY)).toBeNull();
    expect(oracle.changedOutcome(['rule-1'], FROM_TODAY)?.date).toBe('2028-03-01');
  });

  it('meets two classes, but not two codes of one value (EC "Fields with several values")', () => {
    const classes = oracleOf(
      handBranch(
        'classes',
        rules(
          [CLASSES, { operator: 'includes_one_of', values: ['A'] }],
          [CLASSES, { operator: 'includes_one_of', values: ['B'] }]
        )
      )
    );
    const listed = classes.whoMeets([BRANCH], ORACLE_TODAY_DAY)?.applicant.mdl.driving_privileges;
    expect(listed).toEqual([{ vehicle_category_code: 'A' }, { vehicle_category_code: 'B' }]);
    const sex = oracleOf(
      handBranch(
        'sex',
        rules(
          [SEX, { operator: 'includes_one_of', values: [0] }],
          [SEX, { operator: 'includes_one_of', values: [1] }]
        )
      )
    );
    expect(sex.canMeet([BRANCH], FROM_TODAY)).toBe(false);
  });

  it('never meets "none of" every value, and always meets "one of" every value', () => {
    const oracle = oracleOf(
      handBranch(
        'every value',
        rules(
          [SEX, { operator: 'includes_none_of', values: [0, 1, 2] }],
          [SEX, { operator: 'includes_one_of', values: [2, 0, 1] }]
        ),
        'or'
      )
    );
    expect(oracle.canMeet(['rule-1'], FROM_TODAY)).toBe(false);
    expect(oracle.alwaysMet(['rule-2'], FROM_TODAY)).toBe(true);
    expect(oracle.alwaysMet([BRANCH], FROM_TODAY)).toBe(true);
  });

  it("meets a class's date only while the class is listed (FR-007, fifth bullet)", () => {
    const oracle = oracleOf(
      handBranch(
        'class date',
        rules(
          [ISSUE_DATE_B, { operator: 'before', date: '2030-01-01' }],
          [CLASSES, { operator: 'includes_none_of', values: ['B'] }]
        )
      )
    );
    expect(oracle.canMeet([BRANCH], FROM_TODAY)).toBe(false);
    expect(oracle.canMeet(['rule-1'], ORACLE_TODAY_DAY)).toBe(true);
    const listed = oracle.whoFails(['rule-1'], ORACLE_TODAY_DAY)?.applicant.mdl.driving_privileges;
    expect(listed).toEqual([{ vehicle_category_code: 'A' }]);
  });

  it('finds that 9999-12-31 fails what every other day meets', () => {
    // On 9999-12-31 no date is less than a year ago, and 9999-12-31 isn't before a month from then
    const oracle = oracleOf(
      handBranch(
        'calendar end',
        rules(
          [EXPIRY, { operator: 'less_than_years_ago', years: 1 }],
          [EXPIRY, { operator: 'less_than_from_now', amount: 1, unit: 'months' }]
        ),
        'or'
      )
    );
    expect(oracle.alwaysMet([BRANCH], { from: ORACLE_TODAY_DAY, to: LAST_DAY - 1 })).toBe(true);
    const failing = oracle.whoFails([BRANCH], FROM_TODAY);
    expect(failing?.date).toBe('9999-12-31');
    expect(failing?.applicant.pid.date_of_expiry).toBe('9999-12-31');
  });

  it('answers a branch without dates from today alone', () => {
    const oracle = oracleOf(
      handBranch('no dates', rules([HEIGHT, { operator: 'greater_than', value: 1 }]))
    );
    expect(oracle.days(FROM_TODAY)).toEqual([ORACLE_TODAY_DAY]);
    expect(oracle.days({ from: ORACLE_TODAY_DAY + 5, to: LAST_DAY })).toEqual([
      ORACLE_TODAY_DAY + 5,
    ]);
    expect(() => oracle.days({ from: LAST_DAY, to: ORACLE_TODAY_DAY })).toThrow(RangeError);
  });

  it('deletes duplicates one at a time, in the working tree', () => {
    const oracle = oracleOf(
      handBranch(
        'duplicates',
        rules(
          [HEIGHT, { operator: 'greater_than', value: 2 }],
          [HEIGHT, { operator: 'greater_than', value: 2 }]
        )
      )
    );
    expect(oracle.changedOutcome(['rule-1'], FROM_TODAY)).toBeNull();
    expect(oracle.changedOutcome(['rule-2'], FROM_TODAY)).toBeNull();
    expect(oracle.changedOutcome(['rule-1'], FROM_TODAY, ['rule-2'])).not.toBeNull();
    // Without rules, everyone meets the branch
    expect(oracle.changedOutcome(['rule-1', 'rule-2'], FROM_TODAY)?.applicant.mdl.height).toBe(0);
    expect(() => oracle.changedOutcome(['group-9'], FROM_TODAY)).toThrow(/group-9/);
  });

  it('deletes as the rules step does: a group left with one member becomes that member', () => {
    const [higher, lower, sex] = rules(
      [HEIGHT, { operator: 'greater_than', value: 2 }],
      [HEIGHT, { operator: 'less_than', value: 1 }],
      [SEX, { operator: 'includes_one_of', values: [1] }]
    );
    const branch = handBranch('dissolve', [group(1, 'or', [higher, lower]), sex]);
    const oracle = oracleOf(branch);
    // Without both members, the group is gone and the branch is the sex's rule alone
    const witness = oracle.changedOutcome(['rule-1', 'rule-2'], FROM_TODAY);
    expect(witness).not.toBeNull();
    if (witness) {
      const alone = handBranch('alone', [sex]);
      expect(met(alone, witness.applicant, witness.day)).not.toBe(
        met(branch, witness.applicant, witness.day)
      );
    }
  });

  it("deletes as tree.ts' deleteItem() does, for generated branches", () => {
    let compared = 0;
    for (let seed = 1; compared < 60; seed += 1) {
      const branch = randomBranch(seed);
      if (branch.origin === 'based') {
        continue;
      }
      compared += 1;
      withSeed(seed, () => {
        const oracle = oracleOf(branch);
        const ids = oracle.itemIds.filter((_, index) => (seed + index) % 3 === 0).slice(0, 3);
        let items = branch.items;
        for (const id of ids) {
          items = deleteItem(items, id)?.items ?? items;
        }
        const deleted = { ...branch, items };
        const changes = oracle
          .days(FROM_TODAY)
          .some((day) =>
            oracle
              .applicantsOn(day)
              .some((applicant) => met(branch, applicant, day) !== met(deleted, applicant, day))
          );
        expect(oracle.changedOutcome(ids, FROM_TODAY) !== null).toBe(changes);
      });
    }
  });

  it('counts the items of a based branch as the evaluator does', () => {
    const [removed, kept, added] = rules(
      [HEIGHT, { operator: 'greater_than', value: 2 }],
      [HEIGHT, { operator: 'less_than', value: 5 }],
      [SEX, { operator: 'includes_one_of', values: [1] }]
    );
    const branch = {
      key: 'based',
      origin: 'based' as const,
      operator: 'and' as const,
      items: [
        group(1, 'or', [{ ...removed, mark: 'removed' as const }, kept]),
        { ...added, mark: 'added' as const },
      ],
    };
    const oracle = oracleOf(branch);
    expect(oracle.itemIds).toEqual(['rule-2', 'rule-3']);
    expect(checkedIds(checkedBranchOf(branch).items)).toEqual(['rule-2', 'rule-3']);
    expect(() => oracle.canMeet(['group-1'], ORACLE_TODAY_DAY)).toThrow(/group-1 is not an item/);
  });

  it('gives witnesses that met() confirms', () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      withSeed(seed, () => {
        const branch = randomBranch(seed);
        const oracle = oracleOf(branch);
        const meeting = oracle.whoMeets([BRANCH], FROM_TODAY);
        if (meeting) {
          expect(met(branch, meeting.applicant, meeting.day)).toBe(true);
          expect(meeting.date).toBe(isoDate(meeting.day));
        }
        const failing = oracle.whoFails([BRANCH], FROM_TODAY);
        if (failing) {
          expect(met(branch, failing.applicant, failing.day)).toBe(false);
        }
        expect(meeting !== null || failing !== null).toBe(true);
      });
    }
  });
});

describe('the dates and days the oracle enumerates', () => {
  it('give a date field every outcome of the dates from 3 years before to 2 years after', () => {
    // Every threshold of the generated counts lies in that stretch, and every fixed date near today
    let compared = 0;
    for (let seed = 1; compared < 12; seed += 1) {
      const branch = randomBranch(seed);
      const field = DATE_FIELDS.find((each) =>
        flat(branch.items).some(
          (item) =>
            item.type === 'rule' &&
            item.target?.field === each.field &&
            !['before', 'after', 'on'].includes(item.condition?.operator ?? '')
        )
      );
      if (branch.origin === 'based' || !field) {
        continue;
      }
      compared += 1;
      withSeed(seed, () => {
        const fieldRules = flat(branch.items).filter(
          (item): item is RuleItem => item.type === 'rule' && item.target?.field === field.field
        );
        const fixed = fieldRules.flatMap(({ condition }) =>
          condition?.date ? [dayNumber(condition.date)] : []
        );
        const oracle = oracleOf(branch);
        const days = oracle.days(FROM_TODAY);
        for (const day of new Set([days[0], ...days.slice(1, 2), days[days.length - 1]])) {
          const enumerated = new Set(
            oracle.applicantsOn(day).map((applicant) => vectorOf(fieldRules, applicant, day))
          );
          const dense = new Set<string>();
          const stretches = [
            [day - 1100, day + 740],
            [FIRST_DAY, FIRST_DAY + 5],
            [LAST_DAY - 5, LAST_DAY],
            ...fixed.map((date) => [date - 5, date + 5]),
          ];
          for (const [from, to] of stretches) {
            for (let date = Math.max(FIRST_DAY, from); date <= Math.min(LAST_DAY, to); date += 1) {
              const applicant = { pid: { [field.field]: isoDate(date) } };
              dense.add(vectorOf(fieldRules, applicant, day));
            }
          }
          expect(enumerated).toEqual(dense);
        }
      });
    }
  });

  it('change what applicants can meet only on the days that stand for a range', () => {
    let compared = 0;
    for (let seed = 1; compared < 20; seed += 1) {
      const branch = randomBranch(seed);
      const relative = flat(branch.items).some(
        (item) =>
          item.type === 'rule' &&
          kindOf(item.target ?? HEIGHT) === 'date' &&
          !['before', 'after', 'on'].includes(item.condition?.operator ?? '')
      );
      if (branch.origin === 'based' || !relative) {
        continue;
      }
      compared += 1;
      withSeed(seed, () => {
        const oracle = oracleOf(branch);
        const days = oracle.days(FROM_TODAY);
        const sampled = new Set<number>();
        for (let offset = 0; offset <= 10; offset += 1) {
          sampled.add(ORACLE_TODAY_DAY + offset);
          sampled.add(LAST_DAY - offset);
        }
        for (const day of days.slice(0, 8)) {
          for (let offset = -2; offset <= 2; offset += 1) {
            sampled.add(Math.max(ORACLE_TODAY_DAY, Math.min(LAST_DAY, day + offset)));
          }
        }
        for (const day of sampled) {
          const standing = days.filter((each) => each <= day).at(-1) ?? ORACLE_TODAY_DAY;
          expect(metSets(oracle, branch, day), isoDate(day)).toEqual(
            metSets(oracle, branch, standing)
          );
        }
      });
    }
  });

  it('use today in Germany of the generated branches', () => {
    expect(isoDate(ORACLE_TODAY_DAY)).toBe(ORACLE_TODAY);
    expect(checkedBranchOf(randomBranch(1)).today).toBe(ORACLE_TODAY);
    expect(FROM_TODAY).toEqual({ from: ORACLE_TODAY_DAY, to: LAST_DAY });
    expect(LATER_DAYS).toEqual({ from: ORACLE_TODAY_DAY + 1, to: LAST_DAY });
  });
});
