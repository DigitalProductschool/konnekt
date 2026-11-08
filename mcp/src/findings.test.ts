import type { DocumentField } from '@connection-portal/api-types/document-types';
import type {
  BranchInput,
  Combinator,
  Condition,
  GroupItem,
  RuleItem,
  RuleTarget,
  RuleTreeItem,
} from '@connection-portal/api-types/form-connections';
import {
  addRuleToBranch,
  newBranch,
  propagateMain,
  removeItem,
} from '@connection-portal/rules/branches';
import { buildCheckedBranch } from '@connection-portal/rules/checks/checkedTree';
import { namesOf, noteOf, resolutionOf } from '@connection-portal/rules/checks/findingMessages';
import { checkBranch } from '@connection-portal/rules/checks/findings';
import { ORACLE_CONTEXT } from '@connection-portal/rules/checks/testOracle';
import type { BranchCheck, CheckOptions, ItemFinding } from '@connection-portal/rules/checks/types';
import { mainBranch, MDL, OPTION_SETS, PID, rule, target } from '@connection-portal/rules/testData';
import { deleteItem, duplicateRule, updateRule } from '@connection-portal/rules/tree';
import type { RuleContext } from '@connection-portal/rules/types';
import { describe, expect, it } from 'vitest';

import { type VariantCheck, variantCheckOf } from './findings';
import { itemLink, variantLink } from './links';

// The trees of rules/src/checks/scenarios.test.ts (spec 003's scenarios), checked on the same day
// with the same context, then mapped as check_rules maps them (SC-007)

const CONNECTION = { id: '3f2b8c1e-5a4d-4e6f-9a7b-1c2d3e4f5a6b' };
const STANDARD_ID = '11111111-1111-4111-8111-111111111111';
const AMBULANCE_ID = '22222222-2222-4222-8222-222222222222';

/** The day of spec 003's scenarios */
const TODAY = '2026-10-28';

/** A clock that never reaches the deadline */
const IN_TIME: CheckOptions = { deadline: Number.POSITIVE_INFINITY, now: () => 0 };

function numberField(key: string, label: string): DocumentField {
  return {
    key,
    label,
    kind: 'number',
    option_set: null,
    date_of_birth: false,
    parts: null,
    multiple_values: false,
  };
}

/** scenarios.test.ts' context: "Driving licence – Weight (kg)" stays unrequested */
const SCENARIO_CONTEXT: RuleContext = {
  documents: [
    PID,
    {
      ...MDL,
      fields: [
        ...MDL.fields,
        numberField('age_in_years', 'Age in years'),
        numberField('age_birth_year', 'Year of birth'),
      ],
    },
  ],
  optionSets: OPTION_SETS.map((set) =>
    set.key === 'countries'
      ? { ...set, options: [...set.options, { value: 'IT', label: 'Italy', description: null }] }
      : set
  ),
};

const EVERY_COUNTRY = ['DE', 'AT', 'FR', 'IT'];

const MDL_NATIONALITY = target('mdl', 'nationality');
const PID_NATIONALITY = target('pid', 'nationalities');
const AGE = target('mdl', 'age_in_years');
const CLASSES = target('mdl', 'driving_privileges', 'classes');
const PID_BIRTH = target('pid', 'birthdate');
const CITY = target('pid', 'address_locality');

function on(number: number, ruleTarget: RuleTarget, condition: Condition): RuleItem {
  return rule(number, ruleTarget, condition);
}

const nationalityOneOf = (number: number, ...values: string[]) =>
  on(number, MDL_NATIONALITY, { operator: 'includes_one_of', values });
const ageAbove = (number: number, value: number) =>
  on(number, AGE, { operator: 'greater_than', value });
const ageBelow = (number: number, value: number) =>
  on(number, AGE, { operator: 'less_than', value });
const ageNot = (number: number, value: number) =>
  on(number, AGE, { operator: 'not_equal_to', value });
const classesOneOf = (number: number, ...values: string[]) =>
  on(number, CLASSES, { operator: 'includes_one_of', values });
const yearsAgo = (number: number, operator: string, years: number) =>
  on(number, PID_BIRTH, { operator, years });
const city = (number: number, operator: string, value: string, matchCase = false) =>
  on(number, CITY, { operator, value, match_case: matchCase });

function group(
  number: number,
  items: RuleTreeItem[],
  operator: Combinator = 'and',
  subGroup = false
): GroupItem {
  const digits = String(number).padStart(2, '0');
  return {
    type: 'group',
    id: `group-${number}`,
    name: subGroup ? `Sub-group ${digits}` : `Group ${digits}`,
    mark: null,
    operator,
    message: null,
    items,
  };
}

/** Standard, stored, with these items at a top level combined with `operator` */
function standard(items: RuleTreeItem[], operator: Combinator = 'and'): BranchInput {
  return { ...mainBranch(items), id: STANDARD_ID, operator };
}

/** "Ambulance", stored, based on `main`, with these rules of its own */
function ambulanceOf(main: BranchInput, own: RuleItem[] = []): BranchInput {
  const based = own.reduce<BranchInput>(
    (branch, item) => addRuleToBranch(branch, item) ?? branch,
    newBranch(main, 'based', 'Ambulance', null)
  );
  return { ...based, id: AMBULANCE_ID };
}

/** "Children", stored, started empty, with these rules */
function childrenOf(main: BranchInput, own: RuleItem[]): BranchInput {
  const empty = own.reduce<BranchInput>(
    (branch, item) => addRuleToBranch(branch, item) ?? branch,
    newBranch(main, 'empty', 'Children', null)
  );
  return { ...empty, id: AMBULANCE_ID };
}

interface Replay {
  title: string;
  variant: BranchInput;
  context?: RuleContext;
  today?: string;
}

// US2-AS7 runs on the oracle's fields (testOracle.ts' ORACLE_CONTEXT)
const HEIGHT = target('mdl', 'height');
const FAMILY_NAME = target('pid', 'family_name');
const US2_AS7: RuleTreeItem[] = [
  on(1, HEIGHT, { operator: 'greater_than', value: 10 }),
  on(2, HEIGHT, { operator: 'greater_than', value: 11 }),
  group(
    1,
    [
      on(3, HEIGHT, { operator: 'greater_than', value: 5 }),
      on(4, CLASSES, { operator: 'includes_one_of', values: ['B'] }),
    ],
    'or'
  ),
  on(5, FAMILY_NAME, { operator: 'equal_to', value: 'a', match_case: false }),
  on(6, FAMILY_NAME, { operator: 'equal_to', value: 'A', match_case: false }),
];

const DUPLICATED = duplicateRule([nationalityOneOf(1, 'DE'), nationalityOneOf(2, 'IT')], 'rule-1', {
  rule: 3,
  group: 1,
});

const US3_STANDARD = standard([ageAbove(1, 18), classesOneOf(2, 'B')]);
const US3_CHANGED = {
  ...US3_STANDARD,
  items:
    updateRule(US3_STANDARD.items, 'rule-2', {
      condition: { operator: 'includes_one_of', values: ['C'] },
    })?.items ?? [],
};

const DISSOLVED_STANDARD = standard([
  group(1, [ageAbove(1, 30), classesOneOf(2, 'B')], 'or'),
  ageBelow(3, 20),
]);

const REPLAYS: Replay[] = [
  {
    title: 'US1-AS1: two rules on a field that holds one value',
    variant: standard([nationalityOneOf(1, 'DE'), nationalityOneOf(2, 'IT')]),
  },
  {
    title: 'US1-AS2: the same rules combined with OR',
    variant: standard([nationalityOneOf(1, 'DE'), nationalityOneOf(2, 'IT')], 'or'),
  },
  {
    title: 'US1-AS3: rules that can’t be met together in a group',
    variant: standard([group(1, [ageAbove(1, 30), ageBelow(2, 20)])]),
  },
  {
    title: 'US1-AS3: rules that can’t be met together in a sub-group',
    variant: standard([
      group(1, [
        group(2, [ageAbove(1, 30), ageBelow(2, 20)], 'and', true),
        on(3, PID_NATIONALITY, { operator: 'includes_one_of', values: ['DE'] }),
      ]),
    ]),
  },
  {
    title: 'US1-AS4: a group that can’t be met, as an alternative',
    variant: standard(
      [
        group(1, [ageAbove(1, 30), ageBelow(2, 20)]),
        on(3, PID_NATIONALITY, { operator: 'includes_one_of', values: ['DE'] }),
      ],
      'or'
    ),
  },
  {
    title: 'US1-AS5: a rule in an OR group that conflicts with an AND sibling',
    variant: standard([
      yearsAgo(1, 'at_least_years_ago', 21),
      group(1, [yearsAgo(2, 'less_than_years_ago', 18), classesOneOf(3, 'B')], 'or'),
    ]),
  },
  {
    title: 'an OR group none of whose members can be met beside an AND sibling',
    variant: standard([ageAbove(1, 30), group(1, [ageBelow(2, 20), ageBelow(3, 10)], 'or')]),
  },
  {
    title: 'EC-11: a conflict among four rules',
    variant: standard([ageAbove(1, 17), ageBelow(2, 20), ageNot(3, 18), ageNot(4, 19)]),
  },
  {
    title: 'EC "Letter case": "is equal to Stuttgart" and "is equal to STUTTGART"',
    variant: standard([
      city(1, 'equal_to', 'Stuttgart', true),
      city(2, 'equal_to', 'STUTTGART', true),
    ]),
  },
  {
    title: 'EC-7: a fixed date against the day of sharing, at the moment',
    variant: standard([
      on(1, PID_BIRTH, { operator: 'after', date: '2010-01-01' }),
      yearsAgo(2, 'at_least_years_ago', 21),
    ]),
  },
  {
    title: 'EC "An enum rule with every value": a condition no citizen can meet',
    variant: standard([
      on(1, MDL_NATIONALITY, { operator: 'includes_none_of', values: EVERY_COUNTRY }),
    ]),
  },
  {
    title: 'EC "An enum rule with every value": every citizen meets the variant',
    variant: standard([
      on(1, MDL_NATIONALITY, { operator: 'includes_one_of', values: EVERY_COUNTRY }),
    ]),
  },
  {
    title: 'EC "Rules with problems": rules left out',
    variant: standard([
      ageAbove(1, 30),
      on(2, AGE, { operator: 'less_than', value: null }),
      on(3, target('mdl', 'weight'), { operator: 'less_than', value: 20 }),
      rule(4, AGE, { operator: 'less_than', value: 25 }, ''),
      rule(5, null, null),
    ]),
  },
  {
    title: 'US2-AS1: with AND, the weaker rule is redundant',
    variant: standard([ageAbove(1, 10), ageAbove(2, 11)]),
  },
  {
    title: 'US2-AS2: with OR, the stronger rule is redundant',
    variant: standard([ageAbove(1, 10), ageAbove(2, 11)], 'or'),
  },
  {
    title: 'US2-AS3: a duplicated rule',
    variant: standard(
      duplicateRule([ageAbove(1, 18)], 'rule-1', { rule: 2, group: 1 })?.items ?? []
    ),
  },
  {
    title: 'US2-AS4: a class listed, and a date of that class',
    variant: standard([
      classesOneOf(1, 'B'),
      on(2, target('mdl', 'driving_privileges', 'issue_date', 'B'), {
        operator: 'at_least_years_ago',
        years: 2,
      }),
    ]),
  },
  {
    title: 'US2-AS5: an OR group that every citizen meets',
    variant: standard([group(1, [ageAbove(1, 18), ageBelow(2, 21)], 'or'), classesOneOf(3, 'B')]),
  },
  {
    title: 'US2-AS6: an OR group implied by a rule beside it',
    variant: standard([
      yearsAgo(1, 'at_least_years_ago', 21),
      group(
        1,
        [
          yearsAgo(2, 'at_least_years_ago', 18),
          on(3, PID_NATIONALITY, { operator: 'includes_one_of', values: ['DE'] }),
        ],
        'or'
      ),
    ]),
  },
  {
    title: 'US2-AS7: several redundant items',
    variant: standard(US2_AS7),
    context: ORACLE_CONTEXT,
  },
  {
    title: 'EC-20: a variant no citizen can meet, with a duplicate',
    variant: standard(DUPLICATED?.items ?? []),
  },
  {
    title: 'EC-20: the duplicate once the conflict is gone',
    variant: standard(deleteItem(DUPLICATED?.items ?? [], 'rule-2')?.items ?? []),
  },
  { title: 'EC "A branch without rules"', variant: standard([]) },
  {
    title: 'US3-AS1: a change to Standard causes a conflict in Ambulance',
    variant: propagateMain(
      US3_STANDARD,
      US3_CHANGED,
      ambulanceOf(US3_STANDARD, [on(5, CLASSES, { operator: 'includes_none_of', values: ['C'] })])
    ),
  },
  {
    title: 'US3-AS3: a variant that started empty',
    variant: childrenOf(US3_STANDARD, [ageBelow(5, 20), ageAbove(6, 30)]),
  },
  {
    title: 'EC "Removed rules and dissolved groups": a group dissolved in Ambulance',
    variant:
      removeItem(DISSOLVED_STANDARD, ambulanceOf(DISSOLVED_STANDARD), 'rule-2') ??
      ambulanceOf(DISSOLVED_STANDARD),
  },
];

/** The replay whose title starts with `start` */
function replayTitled(start: string): Replay {
  const found = REPLAYS.find((entry) => entry.title.startsWith(start));
  if (!found) {
    throw new Error(`No replay ${start}`);
  }
  return found;
}

/** The ids a finding's reason names, as the rules step's notes name them */
function reasonIds(finding: ItemFinding): string[] {
  const { reason } = finding;
  switch (reason?.type) {
    case 'with':
    case 'members':
      return reason.items;
    case 'same':
      return [reason.item];
    case 'implied_by':
      return [...reason.items, ...reason.orItems];
    case 'implies':
      return [...reason.items, ...reason.givenItems];
    default:
      return [];
  }
}

/** Checks a variant as the rules step does, and maps the result as check_rules does */
function replay({ variant, context = SCENARIO_CONTEXT, today = TODAY }: Replay): {
  leftOut: string[];
  check: BranchCheck;
  answer: VariantCheck;
} {
  const checked = buildCheckedBranch({ ...variant, key: 'branch-1' }, context, today);
  const check = checkBranch(checked, IN_TIME);
  return {
    leftOut: checked.leftOut,
    check,
    answer: variantCheckOf(check, variant, context, CONNECTION),
  };
}

describe('variantCheckOf on spec 003’s scenarios (SC-007)', () => {
  it.each(REPLAYS)('$title: the findings equal the check’s', (scenario) => {
    const { leftOut, check, answer } = replay(scenario);
    const names = namesOf(scenario.variant.items);
    const order = [...names.keys()];
    expect(answer.checked_completely).toBe(check.complete);
    expect(answer.rules_checked).toBe(check.checkedRules);
    expect(answer.notice?.kind ?? null).toBe(check.notice?.kind ?? null);
    expect(answer.notice?.at_the_moment ?? null).toBe(check.notice?.today ?? null);
    expect(
      answer.findings.map(({ item, kind, involves, why, at_the_moment, resolution }) => ({
        itemId: item.id,
        kind,
        involves: involves.map((ref) => ref.id),
        why,
        today: at_the_moment,
        resolution,
      }))
    ).toEqual(
      check.findings.map((finding) => ({
        itemId: finding.itemId,
        kind: finding.kind,
        involves: [...new Set(reasonIds(finding))].sort(
          (a, b) => order.indexOf(a) - order.indexOf(b)
        ),
        why: noteOf(finding, names),
        today: finding.today,
        resolution: resolutionOf(finding, names),
      }))
    );
    expect(answer.not_covered.map(({ item }) => item.id)).toEqual(leftOut);
  });

  it('covers every kind of finding and reason, and both notices', () => {
    const checks = REPLAYS.map((scenario) => replay(scenario).check);
    const reasons = new Set(
      checks.flatMap((check) =>
        check.findings.map((finding) => `${finding.kind}:${finding.reason?.type ?? ''}`)
      )
    );
    expect([...reasons].sort()).toEqual([
      'always_met:',
      'conflicting:condition',
      'conflicting:members',
      'conflicting:with',
      'redundant:implied_by',
      'redundant:implies',
      'redundant:same',
    ]);
    const notices = new Set(checks.map((check) => check.notice?.kind ?? null));
    expect(notices).toEqual(new Set([null, 'none_can_meet', 'all_meet']));
    expect(checks.some((check) => check.notice?.today === true)).toBe(true);
    expect(checks.some((check) => check.findings.some((finding) => finding.today))).toBe(true);
  });
});

describe('variantCheckOf', () => {
  it('answers a variant’s findings with refs, why, at the moment and the resolution', () => {
    const variant = standard([nationalityOneOf(1, 'DE'), nationalityOneOf(2, 'IT')]);
    const { answer } = replay({ title: '', variant });
    const ref = (number: number) => ({
      id: `rule-${number}`,
      type: 'rule',
      name: `Rule 0${number}`,
      link: itemLink(CONNECTION.id, STANDARD_ID, `rule-${number}`),
    });
    expect(answer).toEqual({
      variant: {
        id: STANDARD_ID,
        name: 'Standard',
        link: variantLink(CONNECTION.id, STANDARD_ID),
      },
      checked_completely: true,
      rules_checked: 2,
      notice: {
        kind: 'none_can_meet',
        text: 'No citizen can meet the rules of Standard.',
        at_the_moment: false,
        resolution: 'Loosen or delete one of the rules that no citizen can meet together.',
      },
      findings: [
        {
          item: ref(1),
          kind: 'conflicting',
          involves: [ref(2)],
          why: 'Contradicts Rule 02.',
          at_the_moment: false,
          resolution: 'Change or delete one of Rule 01 and Rule 02; they contradict each other.',
        },
        {
          item: ref(2),
          kind: 'conflicting',
          involves: [ref(1)],
          why: 'Contradicts Rule 01.',
          at_the_moment: false,
          resolution: 'Change or delete one of Rule 01 and Rule 02; they contradict each other.',
        },
      ],
      not_covered: [],
    });
  });

  it('names a group’s members and a covering group as items involved', () => {
    const { answer } = replay({
      title: '',
      variant: standard([group(1, [ageAbove(1, 30), ageBelow(2, 20)])]),
    });
    expect(answer.findings[0]).toMatchObject({
      item: { id: 'group-1', type: 'group', name: 'Group 01' },
      kind: 'conflicting',
      involves: [{ id: 'rule-1' }, { id: 'rule-2' }],
      why: 'Rule 01 and Rule 02 in this group contradict each other.',
    });
  });

  it('says at the moment for a finding and a notice that hold today only (FR-008)', () => {
    const { answer } = replay(replayTitled('EC-7:'));
    expect(answer.notice).toEqual({
      kind: 'none_can_meet',
      text: 'Right now, no citizen can meet the rules of Standard.',
      at_the_moment: true,
      resolution:
        'Loosen or delete one of the rules that no citizen can meet together at the moment.',
    });
    expect(answer.findings.map((finding) => finding.at_the_moment)).toEqual([true, true]);
  });

  it('gives a variant that every citizen meets its notice and resolution', () => {
    const { answer } = replay(replayTitled('EC "An enum rule with every value": every citizen'));
    expect(answer.notice).toEqual({
      kind: 'all_meet',
      text: 'Every citizen meets the rules of Standard.',
      at_the_moment: false,
      resolution: 'Add a rule or make one stricter; as it is, the variant accepts every citizen.',
    });
    expect(answer.findings).toEqual([
      expect.objectContaining({
        kind: 'always_met',
        involves: [],
        why: 'Every citizen meets this rule.',
        resolution: 'Rule 01’s condition is always met; delete it or make it stricter.',
      }),
    ]);
  });

  it('names the rules left out with the editor’s reasons and texts (FR-033)', () => {
    const variant = standard([
      ageAbove(1, 30),
      on(2, AGE, { operator: 'less_than', value: null }),
      on(3, target('mdl', 'weight'), { operator: 'less_than', value: 20 }),
      rule(4, AGE, { operator: 'less_than', value: 25 }, ''),
      rule(5, null, null),
      on(6, target('mdl', 'driving_privileges'), { operator: 'includes_one_of', values: ['B'] }),
      on(7, target('mdl', 'driving_privileges', 'colour'), {
        operator: 'includes_one_of',
        values: ['B'],
      }),
      on(8, target('mdl', 'portrait'), { operator: 'equal_to', value: 'x', match_case: false }),
    ]);
    const { answer } = replay({ title: '', variant });
    expect(
      answer.not_covered.map(({ item, reason, text }) => ({ id: item.id, reason, text }))
    ).toEqual([
      {
        id: 'rule-2',
        reason: 'condition_incomplete',
        text: 'Rule 02 in Standard: enter a number.',
      },
      {
        id: 'rule-3',
        reason: 'data_not_requested',
        text: 'Rule 03 in Standard checks data that’s no longer requested.',
      },
      { id: 'rule-5', reason: 'no_data', text: 'Rule 05 in Standard: choose the data to check.' },
      { id: 'rule-6', reason: 'no_data', text: 'Rule 06 in Standard: choose the data to check.' },
      {
        id: 'rule-7',
        reason: 'unreadable',
        text: expect.stringMatching(/^Rule 07 in Standard checks a part that .+ doesn’t have\.$/),
      },
      {
        id: 'rule-8',
        reason: 'data_not_requested',
        text: 'Rule 08 in Standard checks data that’s no longer requested.',
      },
    ]);
    expect(answer.not_covered[0].item).toEqual({
      id: 'rule-2',
      type: 'rule',
      name: 'Rule 02',
      link: itemLink(CONNECTION.id, STANDARD_ID, 'rule-2'),
    });
    // A missing message doesn't leave a rule out: Rule 04 is checked
    expect(answer.findings.map((finding) => finding.item.id)).toEqual(['rule-1', 'rule-4']);
  });

  it('names the variant in the texts of a based variant', () => {
    const main = standard([ageAbove(1, 18)]);
    const ambulance = ambulanceOf(main, [on(5, AGE, { operator: 'less_than', value: null })]);
    const { answer } = replay({ title: '', variant: ambulance });
    expect(answer.variant).toEqual({
      id: AMBULANCE_ID,
      name: 'Ambulance',
      link: variantLink(CONNECTION.id, AMBULANCE_ID),
    });
    expect(answer.not_covered).toEqual([
      {
        item: {
          id: 'rule-5',
          type: 'rule',
          name: 'Rule 05',
          link: itemLink(CONNECTION.id, AMBULANCE_ID, 'rule-5'),
        },
        reason: 'condition_incomplete',
        text: 'Rule 05 in Ambulance: enter a number.',
      },
    ]);
  });

  it('answers a check that didn’t finish as not checked completely', () => {
    const variant = standard([nationalityOneOf(1, 'DE'), nationalityOneOf(2, 'IT')]);
    const unfinished: BranchCheck = {
      branchKey: 'branch-1',
      fingerprint: 'f',
      complete: false,
      notice: null,
      findings: [],
      checkedRules: 2,
    };
    expect(variantCheckOf(unfinished, variant, SCENARIO_CONTEXT, CONNECTION)).toMatchObject({
      checked_completely: false,
      rules_checked: 2,
      notice: null,
      findings: [],
      not_covered: [],
    });
  });

  it('leaves out a finding on an item the variant no longer has, and never names an id', () => {
    const variant = standard([ageAbove(1, 10)]);
    const stale: BranchCheck = {
      branchKey: 'branch-1',
      fingerprint: 'f',
      complete: true,
      notice: null,
      findings: [
        { itemId: 'rule-9', kind: 'always_met', reason: null, today: false },
        {
          itemId: 'rule-1',
          kind: 'conflicting',
          reason: { type: 'with', items: ['rule-9'] },
          today: false,
        },
      ],
      checkedRules: 1,
    };
    const answer = variantCheckOf(stale, variant, SCENARIO_CONTEXT, CONNECTION);
    expect(answer.findings).toHaveLength(1);
    expect(answer.findings[0]).toMatchObject({ item: { id: 'rule-1' }, involves: [] });
  });
});
