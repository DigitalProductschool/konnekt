import type {
  BranchInput,
  Combinator,
  Condition,
  GroupItem,
  Mark,
  RuleItem,
  RuleTarget,
  RuleTreeItem,
} from '@konnekt/api-types/form-connections';
import type { OptionSet } from '@konnekt/api-types/option-sets';
import { describe, expect, it } from 'vitest';

import { newBranch, removeItem } from '../branches';
import { isComplete, optionsOf, requestedRuleDocuments, resolveTarget } from '../conditions';
import { OPERATORS } from '../constants';
import { CONTEXT, mainBranch, MDL, OPTION_SETS, PID, rule, target, US1_RULES } from '../testData';
import {
  effectiveItems,
  flattenItems,
  renameItem,
  setGroupMessage,
  setOperator,
  updateRule,
} from '../tree';
import type { RuleContext } from '../types';
import { checksUnrequestedData } from '../validation';
import { buildCheckedBranch, type KeyedBranch } from './checkedTree';
import { ruleFormula } from './literals';
import type { CheckedBranch, CheckedGroup, CheckedItem, CheckedRule, Formula } from './types';

const TODAY = '2026-10-28';

/** A checked tree's ids and operators: a rule by its id, a group as [id, operator, items] */
type Shape = string | [string, Combinator, Shape[]];

function shapeOf(items: CheckedItem[]): Shape[] {
  return items.map((item) =>
    item.type === 'rule' ? item.id : [item.id, item.operator, shapeOf(item.items)]
  );
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function must<T>(value: T | null): T {
  if (value === null) {
    throw new Error('expected a result');
  }
  return value;
}

function group(
  number: number,
  items: RuleTreeItem[],
  operator: Combinator = 'and',
  name = `Group ${String(number).padStart(2, '0')}`
): GroupItem {
  return {
    type: 'group',
    id: `group-${number}`,
    name,
    mark: null,
    operator,
    message: null,
    items,
  };
}

/** A complete rule: "Personal ID – Date of birth is at least N years old" */
function complete(number: number, years = number): RuleItem {
  return rule(number, target('pid', 'birthdate'), { operator: 'at_least_years_ago', years });
}

/** A rule whose condition lacks its number of years */
function incomplete(number: number): RuleItem {
  return rule(number, target('pid', 'birthdate'), { operator: 'at_least_years_ago', years: null });
}

/** A rule whose data isn't chosen yet */
function untargeted(number: number): RuleItem {
  return rule(number, null, null);
}

function keyed(branch: BranchInput, key = 'branch-1'): KeyedBranch {
  return { ...branch, key };
}

function build(
  branch: BranchInput,
  context: RuleContext = CONTEXT,
  today = TODAY,
  key = 'branch-1'
): CheckedBranch {
  return buildCheckedBranch(keyed(branch, key), context, today);
}

/** The checked tree of a main branch with these items */
function buildMain(items: RuleTreeItem[], context: RuleContext = CONTEXT): CheckedBranch {
  return build(mainBranch(items), context);
}

/** The test data's documents, with only these fields of each requested */
function requesting(fields: { pid?: string[]; mdl?: string[] }, optionSets = OPTION_SETS) {
  const requested = Object.entries(fields).map(([documentType, keys]) => ({
    document_type: documentType,
    fields: keys,
  }));
  return { documents: requestedRuleDocuments([PID, MDL], requested), optionSets };
}

const PID_FIELDS = PID.fields.map((field) => field.key);
const MDL_FIELDS = MDL.fields.map((field) => field.key);

describe('buildCheckedBranch', () => {
  it('reads each rule as ruleFormula() does, with the variables its formula uses', () => {
    const checked = build(mainBranch(), CONTEXT, TODAY, 'main');
    expect(checked.branchKey).toBe('main');
    expect(checked.operator).toBe('and');
    expect(checked.today).toBe(TODAY);
    expect(checked.leftOut).toEqual([]);
    expect(checked.items).toEqual(
      US1_RULES.map((entry) => ({
        type: 'rule',
        id: entry.id,
        formula: must(ruleFormula(entry, CONTEXT)).formula,
      }))
    );
    // A class's date uses the classes held too, which rule-2 checks as well: collected by key
    expect(Object.keys(checked.variables)).toEqual([
      'pid.birthdate',
      'mdl.driving_privileges.classes',
      'mdl.driving_privileges.issue_date#B',
    ]);
    for (const entry of US1_RULES) {
      for (const variable of must(ruleFormula(entry, CONTEXT)).variables) {
        expect(checked.variables[variable.key]).toEqual(variable);
      }
    }
  });

  it('keeps the AND or OR of the top level and of each group, and the display order', () => {
    const branch = {
      ...mainBranch([
        complete(1),
        group(1, [complete(2), group(2, [complete(3), complete(4)], 'and')], 'or'),
        complete(5),
      ]),
      operator: 'or' as const,
    };
    const checked = build(branch);
    expect(checked.operator).toBe('or');
    expect(shapeOf(checked.items)).toEqual([
      'rule-1',
      ['group-1', 'or', ['rule-2', ['group-2', 'and', ['rule-3', 'rule-4']]]],
      'rule-5',
    ]);
  });

  it('is plain data, which structuredClone() and JSON keep as it is', () => {
    const checked = build(mainBranch([complete(4), group(1, US1_RULES, 'or')]));
    expect(structuredClone(checked)).toEqual(checked);
    expect(JSON.parse(JSON.stringify(checked))).toEqual(checked);
  });

  it('leaves the branch and the context as they are', () => {
    const branch = deepFreeze(mainBranch([complete(1), group(1, [incomplete(2), complete(3)])]));
    const context = deepFreeze(structuredClone(CONTEXT));
    expect(shapeOf(build(branch, context).items)).toEqual(['rule-1', 'rule-3']);
  });
});

describe('EC "Removed rules and dissolved groups"', () => {
  // Standard: rule-1, group-1 (rule-2, rule-3), rule-4
  const main: BranchInput = deepFreeze(
    mainBranch([complete(1), group(1, [complete(2), complete(3)], 'or'), complete(4)])
  );
  const based = (): BranchInput => newBranch(main, 'based', 'Ambulance', null);

  it('checks a based branch as the main branch while it follows it', () => {
    expect(shapeOf(build(based()).items)).toEqual([
      'rule-1',
      ['group-1', 'or', ['rule-2', 'rule-3']],
      'rule-4',
    ]);
  });

  it('leaves out the rules and groups removed there, with everything in them', () => {
    const withoutRule = build(must(removeItem(main, based(), 'rule-1')));
    expect(shapeOf(withoutRule.items)).toEqual([['group-1', 'or', ['rule-2', 'rule-3']], 'rule-4']);
    expect(withoutRule.leftOut).toEqual([]);
    const withoutGroup = build(must(removeItem(main, based(), 'group-1')));
    expect(shapeOf(withoutGroup.items)).toEqual(['rule-1', 'rule-4']);
    expect(withoutGroup.leftOut).toEqual([]);
  });

  it('checks a dissolved group as its remaining member, in its place', () => {
    const removed = must(removeItem(main, based(), 'rule-2'));
    expect(shapeOf(build(removed).items)).toEqual(['rule-1', 'rule-3', 'rule-4']);
    const both = must(removeItem(main, removed, 'rule-3'));
    expect(shapeOf(build(both).items)).toEqual(['rule-1', 'rule-4']);
  });

  it('dissolves a sub-group in its place inside its group', () => {
    const nested = deepFreeze(
      mainBranch([
        group(1, [complete(1), group(2, [complete(2), complete(3)], 'or')], 'and'),
        complete(4),
      ])
    );
    const branch = newBranch(nested, 'based', 'Ambulance', null);
    const removed = must(removeItem(nested, branch, 'rule-3'));
    expect(shapeOf(build(removed).items)).toEqual([
      ['group-1', 'and', ['rule-1', 'rule-2']],
      'rule-4',
    ]);
  });

  it('counts a removed rule with a problem neither as checked nor as left out', () => {
    const withProblem = deepFreeze(
      mainBranch([complete(1), group(1, [incomplete(2), complete(3)]), complete(4)])
    );
    expect(build(withProblem).leftOut).toEqual(['rule-2']);
    const branch = newBranch(withProblem, 'based', 'Ambulance', null);
    const removed = build(must(removeItem(withProblem, branch, 'rule-2')));
    expect(shapeOf(removed.items)).toEqual(['rule-1', 'rule-3', 'rule-4']);
    expect(removed.leftOut).toEqual([]);
  });
});

describe('W11: rules with problems are left out', () => {
  it('leaves out a rule with an incomplete condition, no target, or data not requested', () => {
    const context = requesting({
      pid: PID_FIELDS,
      mdl: MDL_FIELDS.filter((key) => key !== 'height'),
    });
    const height = rule(4, target('mdl', 'height'), { operator: 'greater_than', value: 150 });
    const checked = buildMain([complete(1), incomplete(2), untargeted(3), height], context);
    expect(shapeOf(checked.items)).toEqual(['rule-1']);
    expect(checked.leftOut).toEqual(['rule-2', 'rule-3', 'rule-4']);
    expect(Object.keys(checked.variables)).toEqual(['pid.birthdate']);
    // The same rule counts while its data is requested
    expect(shapeOf(buildMain([height]).items)).toEqual(['rule-4']);
  });

  it('checks a group with one rule left as that rule, in its place', () => {
    const checked = buildMain([complete(1), group(1, [incomplete(2), complete(3)]), complete(4)]);
    expect(shapeOf(checked.items)).toEqual(['rule-1', 'rule-3', 'rule-4']);
    expect(checked.leftOut).toEqual(['rule-2']);
  });

  it('leaves out a group with no rule left, and lists its rules as left out', () => {
    const checked = buildMain([complete(1), group(1, [incomplete(2), untargeted(3)])]);
    expect(shapeOf(checked.items)).toEqual(['rule-1']);
    expect(checked.leftOut).toEqual(['rule-2', 'rule-3']);
  });

  it('works bottom-up through sub-groups', () => {
    const outer = buildMain([
      group(1, [incomplete(1), group(2, [complete(2), complete(3)], 'or')], 'and'),
    ]);
    expect(shapeOf(outer.items)).toEqual([['group-2', 'or', ['rule-2', 'rule-3']]]);
    const inner = buildMain([group(1, [complete(1), group(2, [incomplete(2), complete(3)])])]);
    expect(shapeOf(inner.items)).toEqual([['group-1', 'and', ['rule-1', 'rule-3']]]);
    const both = buildMain([
      complete(4),
      group(1, [untargeted(1), group(2, [incomplete(2), complete(3)])]),
    ]);
    expect(shapeOf(both.items)).toEqual(['rule-4', 'rule-3']);
    expect(both.leftOut).toEqual(['rule-1', 'rule-2']);
    expect(shapeOf(buildMain([group(1, [group(2, [])]), group(3, [])]).items)).toEqual([]);
  });

  it('leaves out a rule that the save refuses or the evaluator can’t read', () => {
    const nationality = (values: Condition['values']): Condition => ({
      operator: 'includes_one_of',
      values,
    });
    const refused: RuleItem[] = [
      // A value that isn't in the value set, and one chosen twice, though both have a formula
      rule(1, target('pid', 'nationalities'), nationality(['XX'])),
      rule(2, target('pid', 'nationalities'), nationality(['DE', 'DE'])),
      // An image, a field made of parts without its part, a class that isn't in the set
      rule(3, target('pid', 'picture'), { operator: 'equal_to', value: 'x' }),
      rule(4, target('mdl', 'driving_privileges'), nationality(['B'])),
      rule(5, target('mdl', 'driving_privileges', 'issue_date', 'Z'), {
        operator: 'at_least_years_ago',
        years: 2,
      }),
      // An operator of another kind, and a text that is only spaces
      rule(6, target('mdl', 'height'), { operator: 'before', date: '2026-01-01' }),
      rule(7, target('pid', 'family_name'), { operator: 'equal_to', value: '   ' }),
    ];
    expect(ruleFormula(refused[0], CONTEXT)).not.toBeNull();
    expect(ruleFormula(refused[1], CONTEXT)).not.toBeNull();
    const checked = buildMain([...refused, complete(8)]);
    expect(shapeOf(checked.items)).toEqual(['rule-8']);
    expect(checked.leftOut).toEqual(refused.map((entry) => entry.id));
    // A value set that isn't loaded: the condition counts as complete, but has no formula
    const unloaded = {
      ...CONTEXT,
      optionSets: OPTION_SETS.filter((set) => set.key !== 'countries'),
    };
    const withoutSet = buildMain(
      [rule(9, target('pid', 'nationalities'), nationality(['DE']))],
      unloaded
    );
    expect(withoutSet.items).toEqual([]);
    expect(withoutSet.leftOut).toEqual(['rule-9']);
  });

  it('keeps a rule without an error message', () => {
    const checked = buildMain([
      { ...complete(1), message: '' },
      { ...complete(2), message: '   ' },
    ]);
    expect(shapeOf(checked.items)).toEqual(['rule-1', 'rule-2']);
    expect(checked.leftOut).toEqual([]);
  });
});

describe('W13: a branch without checked rules', () => {
  it('has no items when it has no rules', () => {
    const checked = buildMain([]);
    expect(checked.items).toEqual([]);
    expect(checked.leftOut).toEqual([]);
    expect(checked.variables).toEqual({});
  });

  it('has no items when it is based on the main branch and all its rules are removed there', () => {
    const main = deepFreeze(mainBranch([complete(1), group(1, [complete(2), complete(3)])]));
    let branch = newBranch(main, 'based', 'Ambulance', null);
    branch = must(removeItem(main, branch, 'rule-1'));
    branch = must(removeItem(main, branch, 'group-1'));
    const checked = build(branch);
    expect(checked.items).toEqual([]);
    expect(checked.leftOut).toEqual([]);
    expect(checked.variables).toEqual({});
  });

  it('has no items, but its rules left out, when every rule has a problem', () => {
    const checked = buildMain([incomplete(1), group(1, [untargeted(2), incomplete(3)])]);
    expect(checked.items).toEqual([]);
    expect(checked.leftOut).toEqual(['rule-1', 'rule-2', 'rule-3']);
  });
});

describe('the fingerprint', () => {
  const height = (value: number): Condition => ({ operator: 'greater_than', value });
  const city = rule(5, target('pid', 'address_locality'), {
    operator: 'equal_to',
    value: 'Stuttgart',
    match_case: false,
  });
  // rule-1, group-1 OR (rule-2, rule-3), rule-4 on a class's date, rule-5 on a text
  const main = deepFreeze(
    mainBranch([
      complete(1, 18),
      group(
        1,
        [
          rule(2, target('mdl', 'height'), height(150)),
          rule(3, target('pid', 'nationalities'), { operator: 'includes_one_of', values: ['DE'] }),
        ],
        'or'
      ),
      rule(4, target('mdl', 'driving_privileges', 'issue_date', 'B'), {
        operator: 'at_least_years_ago',
        years: 2,
      }),
      city,
    ])
  );
  const fingerprint = build(main).fingerprint;
  const withItems = (items: RuleTreeItem[]): string => build({ ...main, items }).fingerprint;

  it('stays the same after a rename, a new message, or another branch key or name', () => {
    expect(withItems(must(renameItem(main.items, 'rule-1', 'Adult')).items)).toBe(fingerprint);
    expect(withItems(must(renameItem(main.items, 'group-1', 'Either')).items)).toBe(fingerprint);
    const message = must(updateRule(main.items, 'rule-2', { message: 'Too short.' })).items;
    expect(withItems(message)).toBe(fingerprint);
    expect(withItems(must(setGroupMessage(main.items, 'group-1', 'Neither.')).items)).toBe(
      fingerprint
    );
    expect(build(main, CONTEXT, TODAY, 'other-key').fingerprint).toBe(fingerprint);
    expect(build({ ...main, name: 'Taxi', description: 'Cabs' }).fingerprint).toBe(fingerprint);
  });

  it('is the same for rules the evaluator reads alike, whatever the order of their keys', () => {
    const reordered: RuleItem = {
      message: city.message,
      condition: { match_case: false, value: '  Stuttgart ', operator: 'equal_to' },
      target: { licence_class: null, part: null, field: 'address_locality', document_type: 'pid' },
      name: 'Home town',
      mark: null,
      id: 'rule-5',
      type: 'rule',
    };
    expect(withItems([...main.items.slice(0, 3), reordered])).toBe(fingerprint);
    // A copy of the branch, and of the context, has the same fingerprint
    expect(build(structuredClone(main), structuredClone(CONTEXT)).fingerprint).toBe(fingerprint);
  });

  it('changes with a condition, an operator, or an AND or OR', () => {
    const changed = (id: string, condition: Condition): string =>
      withItems(must(updateRule(main.items, id, { condition })).items);
    expect(changed('rule-1', { operator: 'at_least_years_ago', years: 21 })).not.toBe(fingerprint);
    expect(changed('rule-2', height(151))).not.toBe(fingerprint);
    expect(changed('rule-1', { operator: 'less_than_years_ago', years: 18 })).not.toBe(fingerprint);
    expect(changed('rule-2', { operator: 'less_than', value: 150 })).not.toBe(fingerprint);
    expect(changed('rule-5', { ...must(city.condition), match_case: true })).not.toBe(fingerprint);
    expect(build(must(setOperator(main, null, 'or')).branch).fingerprint).not.toBe(fingerprint);
    expect(build(must(setOperator(main, 'group-1', 'and')).branch).fingerprint).not.toBe(
      fingerprint
    );
  });

  it('changes with the items’ ids and their order', () => {
    const [first, ...rest] = main.items;
    expect(withItems([{ ...first, id: 'rule-9' }, ...rest])).not.toBe(fingerprint);
    expect(withItems([...rest, first])).not.toBe(fingerprint);
  });

  it('changes with the requested documents and the value sets', () => {
    const withoutHeight = requesting({
      pid: PID_FIELDS,
      mdl: MDL_FIELDS.filter((key) => key !== 'height'),
    });
    expect(build(main, withoutHeight).fingerprint).not.toBe(fingerprint);
    // A field that no rule checks makes no difference
    const withoutEyes = requesting({
      pid: PID_FIELDS,
      mdl: MDL_FIELDS.filter((key) => key !== 'eye_colour'),
    });
    expect(build(main, withoutEyes).fingerprint).toBe(fingerprint);
    // Whether the nationalities hold several values, and the values of their set
    const single = {
      ...CONTEXT,
      documents: [
        {
          ...PID,
          fields: PID.fields.map((field) =>
            field.key === 'nationalities' ? { ...field, multiple_values: false } : field
          ),
        },
        MDL,
      ],
    };
    expect(build(main, single).fingerprint).not.toBe(fingerprint);
    const moreCountries: OptionSet[] = OPTION_SETS.map((set) =>
      set.key === 'countries'
        ? { ...set, options: [...set.options, { value: 'IT', label: 'Italy', description: null }] }
        : set
    );
    expect(build(main, { ...CONTEXT, optionSets: moreCountries }).fingerprint).not.toBe(
      fingerprint
    );
  });

  it('changes with the day', () => {
    expect(build(main, CONTEXT, '2026-10-29').fingerprint).not.toBe(fingerprint);
  });

  it('covers the rules left out', () => {
    expect(withItems([...main.items, incomplete(6)])).not.toBe(fingerprint);
  });

  it('tells apart texts that only the serialisation could confuse', () => {
    const text = (value: string): string =>
      withItems([
        rule(1, target('pid', 'family_name'), { operator: 'contains', value }),
        rule(2, target('pid', 'address_locality'), { operator: 'contains', value: 'b' }),
      ]);
    expect(text('a","b')).not.toBe(text('a'));
    expect(text('a]')).not.toBe(text('a'));
  });
});

// Fuzzing: seeded random branches of the rules state, with every kind of problem

/** A seeded pseudo-random number generator (mulberry32), in [0, 1) */
function randomOf(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** A key that a condition may lack, or have with any of these values */
const ABSENT = Symbol('absent');

const TARGETS: (RuleTarget | null)[] = [
  null,
  target('pid', 'birthdate'),
  target('pid', 'family_name'),
  target('pid', 'nationalities'),
  target('pid', 'sex'),
  target('pid', 'picture'),
  target('pid', 'place_of_birth'),
  target('pid', 'place_of_birth', 'country'),
  target('pid', 'place_of_birth', 'bogus'),
  target('pid', 'birthdate', 'country'),
  target('pid', 'birthdate', null, 'B'),
  target('mdl', 'height'),
  target('mdl', 'eye_colour'),
  target('mdl', 'driving_privileges', 'classes'),
  target('mdl', 'driving_privileges', 'classes', 'B'),
  target('mdl', 'driving_privileges', 'issue_date'),
  target('mdl', 'driving_privileges', 'issue_date', 'B'),
  target('mdl', 'driving_privileges', 'expiry_date', 'BE'),
  target('mdl', 'driving_privileges', 'issue_date', 'Z'),
  target('xyz', 'abc'),
];

const OPERATOR_NAMES = [
  ...new Set(Object.values(OPERATORS).flatMap((list) => list.map((entry) => entry.operator))),
  'bogus',
  '',
];

/** Values of each key of a condition, of the key's type, or `ABSENT` */
const CONDITION_VALUES: Record<keyof Condition, readonly unknown[]> = {
  operator: OPERATOR_NAMES,
  value: [ABSENT, null, 0, -3, 150, 20.5, NaN, Infinity, '', '  ', 'Stuttgart', 'ß', '12'],
  match_case: [ABSENT, null, true, false],
  values: [ABSENT, null, [], ['DE'], ['DE', 'DE'], ['XX'], [1], ['1', 2], ['B', 'BE'], ['de']],
  date: [ABSENT, null, '', '2026-02-30', TODAY, '0001-01-01', '9999-12-31', 'garbage', '2026-1-1'],
  years: [ABSENT, null, 0, -1, 1.5, 2, 21, NaN],
  amount: [ABSENT, null, 0, -1, 1.5, 2, 21, Infinity],
  unit: [ABSENT, null, 'years', 'months'],
};

/** Complete rules of every kind, which the contexts below may still leave out */
const COMPLETE_RULES: [RuleTarget, Condition][] = [
  [target('pid', 'birthdate'), { operator: 'at_least_years_ago', years: 18 }],
  [target('pid', 'birthdate'), { operator: 'before', date: '2000-01-01' }],
  [target('pid', 'family_name'), { operator: 'contains', value: 'a', match_case: false }],
  [target('pid', 'family_name'), { operator: 'not_equal_to', value: 'B', match_case: true }],
  [target('pid', 'nationalities'), { operator: 'includes_one_of', values: ['DE', 'AT'] }],
  [target('pid', 'sex'), { operator: 'includes_none_of', values: [1] }],
  [target('pid', 'place_of_birth', 'country'), { operator: 'includes_one_of', values: ['FR'] }],
  [target('mdl', 'height'), { operator: 'greater_than', value: 150 }],
  [target('mdl', 'height'), { operator: 'not_equal_to', value: 20.5 }],
  [target('mdl', 'eye_colour'), { operator: 'includes_one_of', values: ['blue'] }],
  [target('mdl', 'driving_privileges', 'classes'), { operator: 'includes_one_of', values: ['B'] }],
  [
    target('mdl', 'driving_privileges', 'issue_date', 'B'),
    { operator: 'at_least_years_ago', years: 2 },
  ],
  [
    target('mdl', 'driving_privileges', 'expiry_date', 'BE'),
    { operator: 'at_least_from_now', amount: 6, unit: 'months' },
  ],
];

const CONTEXTS: RuleContext[] = [
  CONTEXT,
  requesting({ pid: PID_FIELDS }),
  requesting({ pid: PID_FIELDS, mdl: MDL_FIELDS.filter((key) => key !== 'height') }),
  requesting({ pid: ['birthdate', 'sex'], mdl: ['driving_privileges'] }),
  { ...CONTEXT, optionSets: [] },
  {
    ...CONTEXT,
    optionSets: OPTION_SETS.map((set) => (set.key === 'countries' ? { ...set, options: [] } : set)),
  },
  { ...CONTEXT, optionSets: OPTION_SETS.filter((set) => set.key !== 'licence_classes') },
];

const MARKS: (Mark | null)[] = [null, null, null, 'changed', 'removed', 'added'];

/** A random branch of the rules state, with its context and day */
function randomCase(seed: number): { branch: KeyedBranch; context: RuleContext; today: string } {
  const random = randomOf(seed);
  const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)];
  const origin = pick(['main', 'based', 'based', 'empty'] as const);
  const maxDepth = pick([0, 1, 2, 2, 3, 6]);
  let counter = 0;
  const nextNumber = (): number => (random() < 0.05 ? counter : ++counter);

  const condition = (): Condition | null => {
    if (random() < 0.1) {
      return null;
    }
    const entries = Object.entries(CONDITION_VALUES)
      .map(([key, values]) => [key, pick(values)] as const)
      .filter(([, value]) => value !== ABSENT);
    return Object.fromEntries(entries) as unknown as Condition;
  };
  const mark = (): Mark | null => (origin === 'main' && random() < 0.9 ? null : pick(MARKS));
  const item = (depth: number): RuleTreeItem => {
    if (depth < maxDepth && random() < 0.3) {
      const members = Array.from({ length: Math.floor(random() * 5) }, () => item(depth + 1));
      return { ...group(nextNumber(), members, pick(['and', 'or'] as const)), mark: mark() };
    }
    const [ruleTarget, ruleCondition] =
      random() < 0.5 ? pick(COMPLETE_RULES) : [pick(TARGETS), condition()];
    return {
      ...rule(nextNumber(), ruleTarget, ruleCondition, pick(['', 'Message.'])),
      mark: mark(),
    };
  };

  const items = Array.from({ length: Math.floor(random() * 7) }, () => item(0));
  const branch: KeyedBranch = {
    key: `branch-${seed}`,
    origin,
    operator: pick(['and', 'or']),
    items,
  };
  return { branch, context: pick(CONTEXTS), today: pick([TODAY, '2027-01-01', 'not a day']) };
}

/** The checked tree and the rules left out, as `buildCheckedBranch()` returns them */
interface Reference {
  shape: Shape[];
  leftOut: string[];
}

/**
 * The checked tree derived literally, one rule of data-model.md after the other: the tree of the
 * items that count, then without the rules left out, then without the groups left with fewer than
 * two items, from the innermost level out
 */
function referenceOf(branch: KeyedBranch, context: RuleContext): Reference {
  const based = branch.origin === 'based';
  const counted = (items: RuleTreeItem[]): RuleTreeItem[] =>
    effectiveItems(items, based).map((entry) =>
      entry.type === 'group' ? { ...entry, items: counted(entry.items) } : entry
    );
  const checkable = (entry: RuleItem): boolean => {
    if (!entry.target || checksUnrequestedData(entry, context.documents)) {
      return false;
    }
    const resolved = resolveTarget(entry.target, context.documents);
    const options =
      resolved?.kind === 'enum' ? optionsOf(context.optionSets, resolved.optionSet) : null;
    return (
      isComplete(entry.condition, resolved?.kind ?? null, options) &&
      ruleFormula(entry, context) !== null
    );
  };
  const leftOut: string[] = [];
  const kept = (items: RuleTreeItem[]): RuleTreeItem[] =>
    items.flatMap((entry): RuleTreeItem[] => {
      if (entry.type === 'group') {
        return [{ ...entry, items: kept(entry.items) }];
      }
      if (checkable(entry)) {
        return [entry];
      }
      leftOut.push(entry.id);
      return [];
    });
  const collapsed = (items: RuleTreeItem[]): Shape[] =>
    items.flatMap((entry): Shape[] => {
      if (entry.type === 'rule') {
        return [entry.id];
      }
      const members = collapsed(entry.items);
      return members.length < 2 ? members : [[entry.id, entry.operator, members]];
    });
  return { shape: collapsed(kept(counted(branch.items))), leftOut };
}

/** The items that count, every level through `effectiveItems()`, groups before their members */
function countedItems(items: RuleTreeItem[], based: boolean): RuleTreeItem[] {
  return effectiveItems(items, based).flatMap((entry) =>
    entry.type === 'group' ? [entry, ...countedItems(entry.items, based)] : [entry]
  );
}

/** Every item of a checked tree, groups before their members */
function checkedItems(items: CheckedItem[]): CheckedItem[] {
  return items.flatMap((entry) =>
    entry.type === 'group' ? [entry, ...checkedItems(entry.items)] : [entry]
  );
}

function isRule(entry: CheckedItem): entry is CheckedRule {
  return entry.type === 'rule';
}

function isGroup(entry: CheckedItem): entry is CheckedGroup {
  return entry.type === 'group';
}

/** The variables a formula's literals name */
function variablesOf(formula: Formula): string[] {
  if (typeof formula === 'boolean') {
    return [];
  }
  if ('and' in formula) {
    return formula.and.flatMap(variablesOf);
  }
  return 'or' in formula ? formula.or.flatMap(variablesOf) : [formula.variable];
}

describe('total and fast', () => {
  it('derives random branches of the rules state as data-model.md does, without throwing', () => {
    const seen = { rules: 0, groups: 0, leftOut: 0, collapsed: 0, removed: 0 };
    for (let seed = 1; seed <= 1000; seed += 1) {
      const { branch, context, today } = randomCase(seed);
      const based = branch.origin === 'based';
      const checked = buildCheckedBranch(branch, context, today);
      const rules = checkedItems(checked.items).filter(isRule);
      const groups = checkedItems(checked.items).filter(isGroup);
      const counted = countedItems(branch.items, based);
      const countedRules = counted.filter((entry) => entry.type === 'rule');

      const reference = referenceOf(branch, context);
      expect(shapeOf(checked.items), `seed ${seed}`).toEqual(reference.shape);
      expect(checked.leftOut, `seed ${seed}`).toEqual(reference.leftOut);
      expect(
        groups.every((entry) => entry.items.length >= 2),
        `seed ${seed}`
      ).toBe(true);
      // Each rule that counts is either checked or left out
      expect(
        [...rules.map((entry) => entry.id), ...checked.leftOut].sort(),
        `seed ${seed}`
      ).toEqual(countedRules.map((entry) => entry.id).sort());
      // Every variable a formula uses is there, and no other
      const used = new Set(rules.flatMap((entry) => variablesOf(entry.formula)));
      expect([...used].sort(), `seed ${seed}`).toEqual(Object.keys(checked.variables).sort());
      // Plain data, and the same fingerprint for a copy
      expect(structuredClone(checked)).toEqual(checked);
      expect(buildCheckedBranch(structuredClone(branch), context, today).fingerprint).toBe(
        checked.fingerprint
      );

      seen.rules += rules.length;
      seen.groups += groups.length;
      seen.leftOut += checked.leftOut.length;
      seen.collapsed += counted.length - countedRules.length - groups.length;
      seen.removed += flattenItems(branch.items).length - counted.length;
    }
    // The random branches reach every case
    expect(seen.rules).toBeGreaterThan(500);
    expect(seen.groups).toBeGreaterThan(50);
    expect(seen.leftOut).toBeGreaterThan(500);
    expect(seen.collapsed).toBeGreaterThan(100);
    expect(seen.removed).toBeGreaterThan(100);
  });

  it('reads groups nested deeper than the editor allows', () => {
    const depth = 300;
    let nested: RuleTreeItem = group(depth, [complete(depth), complete(depth + 1)]);
    for (let number = depth - 1; number >= 1; number -= 1) {
      nested = group(number, [complete(number), nested], number % 2 ? 'or' : 'and');
    }
    for (const origin of ['main', 'based'] as const) {
      const checked = build({ ...mainBranch([nested]), origin });
      let level = checked.items;
      let levels = 0;
      while (level.length > 0 && level[level.length - 1].type === 'group') {
        const last = level[level.length - 1];
        level = last.type === 'group' ? last.items : [];
        levels += 1;
      }
      expect(levels).toBe(depth);
      expect(checkedItems(checked.items).filter(isRule)).toHaveLength(depth + 1);
    }
  });
});
