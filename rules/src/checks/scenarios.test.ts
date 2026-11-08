// The spec's scenarios of the rule checks (specs/003-rule-consistency-checks, US1 and US2
// acceptance scenarios, edge cases, quickstart V3 and V4): each case builds its branch with testData.ts' helpers,
// checks it on 2026-10-28 with `buildCheckedBranch()` and `checkBranch()`, and asserts the exact
// findings, their notes (`noteOf()`) and, where the spec words it, the banner (`bannerOf()`).
//
// Conflicts (US1) come first, then the redundancy scenarios (US2, T036), then the variants' (US3,
// T040), whose branches branches.ts builds and each of which is checked on its own: `scenario()`
// for a main branch's items, `scenarioOf()` for any branch, such as one based on the main branch.
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
import { describe, expect, it } from 'vitest';

import {
  addRuleToBranch,
  copyRule,
  newBranch,
  propagateMain,
  removeItem,
  restoreItem,
} from '../branches';
import { mainBranch, MDL, OPTION_SETS, PID, rule, target } from '../testData';
import {
  deleteItem,
  duplicateRule,
  replaceItem,
  setOperator,
  undoChange,
  ungroupItem,
  updateRule,
} from '../tree';
import type { RuleContext } from '../types';
import { buildCheckedBranch } from './checkedTree';
import { bannerOf, namesOf, noteOf, textOf } from './findingMessages';
import { checkBranch } from './findings';
import { checkedBranchOf, FROM_TODAY, oracleOf } from './testOracle';
import type {
  BranchCheck,
  CheckedBranch,
  CheckOptions,
  ConflictingFinding,
  ItemFinding,
  ItemNames,
  RedundantFinding,
} from './types';

// The context and the day

/** The day of the spec's scenarios */
const TODAY = '2026-10-28';

/** A clock that never reaches the deadline */
const IN_TIME: CheckOptions = { deadline: Number.POSITIVE_INFINITY, now: () => 0 };

/** A requested number field of the driving licence, as backend/app/catalog.py has it */
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

/**
 * testData.ts' context with what the spec's scenarios read besides: the driving licence's "Age in
 * years" and "Year of birth", and Italy among the countries. "Driving licence – Weight (kg)" stays
 * unrequested (EC "Rules with problems")
 */
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

/** Every country of the scenarios' set */
const EVERY_COUNTRY = ['DE', 'AT', 'FR', 'IT'];

// The fields

/** "Driving licence – Nationality": one country (FR-007) */
const MDL_NATIONALITY = target('mdl', 'nationality');
/** "Personal ID – Nationality": several countries (FR-007) */
const PID_NATIONALITY = target('pid', 'nationalities');
/** "Driving licence – Age in years": whole numbers (FR-007) */
const AGE = target('mdl', 'age_in_years');
/** "Driving licence – Licence classes": several classes */
const CLASSES = target('mdl', 'driving_privileges', 'classes');
/** "Personal ID – Date of birth" */
const PID_BIRTH = target('pid', 'birthdate');
/** "Personal ID – City or town" */
const CITY = target('pid', 'address_locality');
/** "Personal ID – Expiry date" */
const PID_EXPIRY = target('pid', 'date_of_expiry');
/** "Driving licence – Expiry date" */
const MDL_EXPIRY = target('mdl', 'expiry_date');

/** Rule `number`, "Rule NN", on a field with a condition */
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

/**
 * Group or sub-group `number` with these items, "Group NN" or "Sub-group NN" as the rules step
 * names them
 */
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

// The case builder

/** A branch checked as the rules step checks it, with what the step shows of the result */
interface Scenario {
  checked: CheckedBranch;
  result: BranchCheck;
  /** The current names of the branch's items */
  names: ItemNames;
  /** The note of each item with a finding, by item id, in display order */
  notes: Record<string, string>;
  /** The findings banner's single or collapsed text: '' without a banner */
  banner: string;
}

/** Checks a branch on `today`, with the branch's own name in the banner */
function scenarioOf(branch: BranchInput, today = TODAY, key = 'branch-1'): Scenario {
  const checked = buildCheckedBranch({ ...branch, key }, SCENARIO_CONTEXT, today);
  const result = checkBranch(checked, IN_TIME);
  const names = namesOf(branch.items);
  const notes = Object.fromEntries(
    result.findings.map((finding) => [finding.itemId, noteOf(finding, names)])
  );
  const banner = bannerOf(result, { key, name: branch.name }, names);
  return { checked, result, names, notes, banner: banner ? textOf(banner.head) : '' };
}

/** The main branch "Standard" with these items at a top level combined with `operator` */
function scenario(items: RuleTreeItem[], operator: Combinator = 'and', today = TODAY): Scenario {
  return scenarioOf({ ...mainBranch(items), operator }, today);
}

/** The conflicting findings alone, for the cases that the redundancy steps (T034) add to */
function conflictsOf(result: BranchCheck): ItemFinding[] {
  return result.findings.filter((finding) => finding.kind === 'conflicting');
}

// The expected findings

/** Conflicting: can't be met together with `items` */
function withItems(itemId: string, items: string[], today = false): ConflictingFinding {
  return { itemId, kind: 'conflicting', reason: { type: 'with', items }, today };
}

/** Conflicting: a group whose `items` can't be met together (AND), or none of which can (OR) */
function members(
  itemId: string,
  items: string[],
  operator: Combinator = 'and',
  today = false
): ConflictingFinding {
  return { itemId, kind: 'conflicting', reason: { type: 'members', operator, items }, today };
}

/** Conflicting: a rule that can't be met on its own */
function condition(itemId: string, today = false): ConflictingFinding {
  return { itemId, kind: 'conflicting', reason: { type: 'condition' }, today };
}

/** "Can’t be met together with <items>." */
function withNote(items: string, today = false): string {
  const suffix = today ? ' at the moment' : '';
  return `Contradicts ${items}${suffix}.`;
}

const NONE_CAN_MEET = { kind: 'none_can_meet', today: false } as const;
const ALL_MEET = { kind: 'all_meet', today: false } as const;

/** Redundant: the same check as `item` */
function sameAs(itemId: string, item: string): RedundantFinding {
  return { itemId, kind: 'redundant', reason: { type: 'same', item }, today: false };
}

/** Redundant: anyone who meets `items` also meets this item (or one of `orItems`) */
function impliedBy(itemId: string, items: string[], orItems: string[] = []): RedundantFinding {
  return {
    itemId,
    kind: 'redundant',
    reason: { type: 'implied_by', items, orItems },
    today: false,
  };
}

/** Redundant: anyone who meets this item (and `givenItems`) also meets one of `items` */
function implies(itemId: string, items: string[], givenItems: string[] = []): RedundantFinding {
  return {
    itemId,
    kind: 'redundant',
    reason: { type: 'implies', items, givenItems },
    today: false,
  };
}

/** Always met: every citizen meets the item */
function alwaysMet(itemId: string): ItemFinding {
  return { itemId, kind: 'always_met', reason: null, today: false };
}

/** "Same as <item>. You can delete one of them." */
function sameNote(item: string): string {
  return `Same as ${item}. You can delete one of them.`;
}

/** "Anyone who meets <items> also meets this rule. You can delete the rule." */
function impliedNote(items: string, noun: 'rule' | 'group' = 'rule'): string {
  return `Anyone who meets ${items} also meets this ${noun}. You can delete the ${noun}.`;
}

/** "Anyone who meets this rule also meets <items>. You can delete the rule." */
function impliesNote(items: string, noun: 'rule' | 'group' = 'rule'): string {
  return `Anyone who meets this ${noun} also meets ${items}. You can delete the ${noun}.`;
}

// US1: see rules that can't be met together

describe('US1-AS1 and AS2: two rules on a field that holds one value', () => {
  const items = [nationalityOneOf(1, 'DE'), nationalityOneOf(2, 'IT')];

  it('AS1: marks both rules, each naming the other, and gives the branch its notice (F1)', () => {
    const { result, notes, banner } = scenario(items);
    expect(result).toMatchObject({ complete: true, notice: NONE_CAN_MEET, checkedRules: 2 });
    expect(result.findings).toEqual([
      withItems('rule-1', ['rule-2']),
      withItems('rule-2', ['rule-1']),
    ]);
    expect(notes).toEqual({ 'rule-1': withNote('Rule 02'), 'rule-2': withNote('Rule 01') });
    expect(banner).toBe(
      'Rule 01 and Rule 02 contradict each other, so no citizen can meet the rules of Standard.'
    );
  });

  it('AS2: has neither marks nor a notice once the level is switched to OR', () => {
    const switched = setOperator(mainBranch(items), null, 'or');
    expect(switched).not.toBeNull();
    const { result } = scenarioOf(switched?.branch ?? mainBranch(items));
    expect(result).toMatchObject({ complete: true, notice: null, findings: [] });
  });
});

describe('US1-AS3: rules that can’t be met together, at every level', () => {
  it('at the top level: both rules and the notice', () => {
    const { result, notes } = scenario([ageAbove(1, 30), ageBelow(2, 20)]);
    expect(result.notice).toEqual(NONE_CAN_MEET);
    expect(result.findings).toEqual([
      withItems('rule-1', ['rule-2']),
      withItems('rule-2', ['rule-1']),
    ]);
    expect(notes).toEqual({ 'rule-1': withNote('Rule 02'), 'rule-2': withNote('Rule 01') });
  });

  it('in a group: both rules, the group with its members note, and the notice (F6)', () => {
    const { result, notes, banner } = scenario([group(1, [ageAbove(1, 30), ageBelow(2, 20)])]);
    expect(result.notice).toEqual(NONE_CAN_MEET);
    expect(result.findings).toEqual([
      members('group-1', ['rule-1', 'rule-2']),
      withItems('rule-1', ['rule-2']),
      withItems('rule-2', ['rule-1']),
    ]);
    expect(notes).toEqual({
      'group-1': 'Rule 01 and Rule 02 in this group contradict each other.',
      'rule-1': withNote('Rule 02'),
      'rule-2': withNote('Rule 01'),
    });
    expect(banner).toBe(
      'Group 01: Rule 01 and Rule 02 contradict each other, so no citizen can meet the rules ' +
        'of Standard.'
    );
  });

  it('in a sub-group: the same marks on the sub-group, and its group names it', () => {
    // Top level AND: Group 01 (AND: Sub-group 02 (AND: Rule 01, Rule 02), Rule 03)
    const { result, notes, banner } = scenario([
      group(1, [
        group(2, [ageAbove(1, 30), ageBelow(2, 20)], 'and', true),
        on(3, PID_NATIONALITY, { operator: 'includes_one_of', values: ['DE'] }),
      ]),
    ]);
    expect(result.notice).toEqual(NONE_CAN_MEET);
    expect(result.findings).toEqual([
      members('group-1', ['group-2']),
      members('group-2', ['rule-1', 'rule-2']),
      withItems('rule-1', ['rule-2']),
      withItems('rule-2', ['rule-1']),
    ]);
    expect(notes).toEqual({
      'group-1': 'Sub-group 02 in this group can’t be met.',
      'group-2': 'Rule 01 and Rule 02 in this group contradict each other.',
      'rule-1': withNote('Rule 02'),
      'rule-2': withNote('Rule 01'),
    });
    // Two lines, "Group 01: Sub-group 02 can’t be met." and Sub-group 02's, so collapsed
    expect(banner).toBe(
      '2 rules contradict each other. So no citizen can meet the rules of Standard.'
    );
  });
});

describe('US1-AS4: a group that can’t be met, as an alternative', () => {
  it('marks the group and its two rules, and the branch has no notice', () => {
    const { result, notes } = scenario(
      [
        group(1, [ageAbove(1, 30), ageBelow(2, 20)]),
        on(3, PID_NATIONALITY, { operator: 'includes_one_of', values: ['DE'] }),
      ],
      'or'
    );
    expect(result).toMatchObject({ complete: true, notice: null });
    expect(result.findings).toEqual([
      members('group-1', ['rule-1', 'rule-2']),
      withItems('rule-1', ['rule-2']),
      withItems('rule-2', ['rule-1']),
    ]);
    expect(notes['group-1']).toBe('Rule 01 and Rule 02 in this group contradict each other.');
  });
});

describe('US1-AS5: a rule in an OR group that conflicts with an AND sibling (W2)', () => {
  it('marks only Rule 02, naming Rule 01, and the branch has no notice', () => {
    const { result, notes, banner } = scenario([
      yearsAgo(1, 'at_least_years_ago', 21),
      group(1, [yearsAgo(2, 'less_than_years_ago', 18), classesOneOf(3, 'B')], 'or'),
    ]);
    expect(result).toMatchObject({ complete: true, notice: null, checkedRules: 3 });
    expect(result.findings).toEqual([withItems('rule-2', ['rule-1'])]);
    expect(notes).toEqual({ 'rule-2': withNote('Rule 01') });
    expect(banner).toBe('Rule 01 and Rule 02 contradict each other.');
  });
});

describe('US1-AS6: the marks follow every change, and its undo', () => {
  const conflict = [nationalityOneOf(1, 'DE'), nationalityOneOf(2, 'IT')];
  const conflictFindings = [withItems('rule-1', ['rule-2']), withItems('rule-2', ['rule-1'])];

  it('edit: the conflict goes when Rule 02 asks for Germany too, and comes back on undo', () => {
    const before = scenario(conflict);
    expect(before.result.findings).toEqual(conflictFindings);
    const edited = updateRule(conflict, 'rule-2', {
      condition: { operator: 'includes_one_of', values: ['DE'] },
    });
    expect(edited).not.toBeNull();
    const afterEdit = scenario(edited?.items ?? []);
    expect(afterEdit.checked.fingerprint).not.toBe(before.checked.fingerprint);
    expect(conflictsOf(afterEdit.result)).toEqual([]);
    expect(afterEdit.result.notice).toBeNull();
    const undone = scenario(edited ? replaceItem(edited.items, edited.previous) : []);
    expect(undone.checked.fingerprint).toBe(before.checked.fingerprint);
    expect(undone.result).toEqual(before.result);
    expect(undone.notes).toEqual(before.notes);
  });

  it('delete: the conflict goes with Rule 02, and comes back on undo', () => {
    const before = scenario(conflict);
    const deleted = deleteItem(conflict, 'rule-2');
    expect(deleted).not.toBeNull();
    const afterDelete = scenario(deleted?.items ?? []);
    expect(afterDelete.result).toMatchObject({ notice: null, findings: [], checkedRules: 1 });
    const undone = scenario(deleted ? undoChange(deleted.items, deleted.undo) : []);
    expect(undone.result).toEqual(before.result);
  });

  it('delete in a group: the group dissolves with its conflict, and both come back on undo', () => {
    const items = [group(1, [ageAbove(1, 30), ageBelow(2, 20)]), classesOneOf(3, 'B')];
    const before = scenario(items);
    expect(before.result.findings).toEqual([
      members('group-1', ['rule-1', 'rule-2']),
      withItems('rule-1', ['rule-2']),
      withItems('rule-2', ['rule-1']),
    ]);
    const deleted = deleteItem(items, 'rule-2');
    expect(deleted?.dissolved?.id).toBe('group-1');
    const afterDelete = scenario(deleted?.items ?? []);
    expect(afterDelete.result).toMatchObject({ notice: null, findings: [] });
    const undone = scenario(deleted ? undoChange(deleted.items, deleted.undo) : []);
    expect(undone.result).toEqual(before.result);
  });

  it('ungroup: the group’s rules become alternatives, and the marks come back on undo', () => {
    // US1-AS4's tree: ungrouping Group 01 puts its rules into the top level combined with OR
    const items = [
      group(1, [ageAbove(1, 30), ageBelow(2, 20)]),
      on(3, PID_NATIONALITY, { operator: 'includes_one_of', values: ['DE'] }),
    ];
    const before = scenario(items, 'or');
    expect(before.result.findings).toHaveLength(3);
    const ungrouped = ungroupItem(items, 'group-1');
    expect(ungrouped).not.toBeNull();
    const afterUngroup = scenario(ungrouped?.items ?? [], 'or');
    expect(afterUngroup.result).toMatchObject({ notice: null, findings: [], checkedRules: 3 });
    const undone = scenario(ungrouped ? undoChange(ungrouped.items, ungrouped.undo) : [], 'or');
    expect(undone.result).toEqual(before.result);
  });
});

// Edge cases

describe('EC-11: a conflict among four rules, any three of which can be met (W3)', () => {
  it('marks each of the four, naming the other three', () => {
    const { result, notes, banner } = scenario([
      ageAbove(1, 17),
      ageBelow(2, 20),
      ageNot(3, 18),
      ageNot(4, 19),
    ]);
    expect(result.notice).toEqual(NONE_CAN_MEET);
    expect(result.findings).toEqual([
      withItems('rule-1', ['rule-2', 'rule-3', 'rule-4']),
      withItems('rule-2', ['rule-1', 'rule-3', 'rule-4']),
      withItems('rule-3', ['rule-1', 'rule-2', 'rule-4']),
      withItems('rule-4', ['rule-1', 'rule-2', 'rule-3']),
    ]);
    expect(notes).toEqual({
      'rule-1': withNote('Rule 02, Rule 03 and Rule 04'),
      'rule-2': withNote('Rule 01, Rule 03 and Rule 04'),
      'rule-3': withNote('Rule 01, Rule 02 and Rule 04'),
      'rule-4': withNote('Rule 01, Rule 02 and Rule 03'),
    });
    expect(banner).toBe(
      'Rule 01, Rule 02, Rule 03 and Rule 04 contradict each other, so no citizen can meet the ' +
        'rules of Standard.'
    );
  });
});

describe('EC "Fields with several values" (FR-007)', () => {
  it('Personal ID – Nationality: Germany and Italy don’t conflict, one can have both', () => {
    const { result } = scenario([
      on(1, PID_NATIONALITY, { operator: 'includes_one_of', values: ['DE'] }),
      on(2, PID_NATIONALITY, { operator: 'includes_one_of', values: ['IT'] }),
    ]);
    expect(result).toMatchObject({ complete: true, notice: null, findings: [] });
  });

  it('Driving licence – Nationality, which holds one country: they conflict', () => {
    expect(
      scenario([nationalityOneOf(1, 'DE'), nationalityOneOf(2, 'IT')]).result.findings
    ).toEqual([withItems('rule-1', ['rule-2']), withItems('rule-2', ['rule-1'])]);
  });

  it('Licence classes: B and C don’t conflict', () => {
    const { result } = scenario([classesOneOf(1, 'B'), classesOneOf(2, 'C')]);
    expect(result).toMatchObject({ complete: true, notice: null, findings: [] });
  });
});

describe('EC "Letter case": "is equal to Stuttgart" and "is equal to STUTTGART"', () => {
  it('conflict when both respect letter case', () => {
    const { result, notes } = scenario([
      city(1, 'equal_to', 'Stuttgart', true),
      city(2, 'equal_to', 'STUTTGART', true),
    ]);
    expect(result).toMatchObject({ complete: true, notice: NONE_CAN_MEET });
    expect(result.findings).toEqual([
      withItems('rule-1', ['rule-2']),
      withItems('rule-2', ['rule-1']),
    ]);
    expect(notes).toEqual({ 'rule-1': withNote('Rule 02'), 'rule-2': withNote('Rule 01') });
  });

  it.each([
    ['both ignore letter case', false, false],
    ['only the first respects letter case', true, false],
  ])('don’t conflict when %s', (_, first, second) => {
    const { result } = scenario([
      city(1, 'equal_to', 'Stuttgart', first),
      city(2, 'equal_to', 'STUTTGART', second),
    ]);
    expect(result).toMatchObject({ complete: true, notice: null });
    expect(conflictsOf(result)).toEqual([]);
  });

  it('"contains straße" and "contains STRASSE", ignoring letter case, don’t conflict', () => {
    const { result } = scenario([city(1, 'contains', 'straße'), city(2, 'contains', 'STRASSE')]);
    expect(result).toMatchObject({ complete: true, notice: null });
    expect(conflictsOf(result)).toEqual([]);
  });
});

describe('EC "Text inside other text"', () => {
  it('"is equal to Stuttgart" and "doesn’t contain gart" conflict', () => {
    const { result } = scenario([
      city(1, 'equal_to', 'Stuttgart'),
      city(2, 'not_contains', 'gart'),
    ]);
    expect(result).toMatchObject({ complete: true, notice: NONE_CAN_MEET });
    expect(result.findings).toEqual([
      withItems('rule-1', ['rule-2']),
      withItems('rule-2', ['rule-1']),
    ]);
  });

  it('"is equal to Stuttgart" and "contains Stutt" don’t', () => {
    const { result } = scenario([city(1, 'equal_to', 'Stuttgart'), city(2, 'contains', 'Stutt')]);
    expect(result).toMatchObject({ complete: true, notice: null });
    expect(conflictsOf(result)).toEqual([]);
  });
});

describe('EC "Whole numbers" (FR-007)', () => {
  it('"Age in years is greater than 20" and "is less than 21" conflict', () => {
    const { result } = scenario([ageAbove(1, 20), ageBelow(2, 21)]);
    expect(result).toMatchObject({ complete: true, notice: NONE_CAN_MEET });
    expect(result.findings).toEqual([
      withItems('rule-1', ['rule-2']),
      withItems('rule-2', ['rule-1']),
    ]);
  });

  it('"is greater than 20" and "is less than 21.5" don’t: 21 meets both', () => {
    const { result } = scenario([ageAbove(1, 20), ageBelow(2, 21.5)]);
    expect(result).toMatchObject({ complete: true, notice: null, findings: [] });
  });
});

describe('EC "Adjacent dates" (spec 002, FR-003)', () => {
  it('"Expiry date is before 1 Jan 2030" and "is after 31 Dec 2029" conflict', () => {
    const { result } = scenario([
      on(1, PID_EXPIRY, { operator: 'before', date: '2030-01-01' }),
      on(2, PID_EXPIRY, { operator: 'after', date: '2029-12-31' }),
    ]);
    expect(result).toMatchObject({ complete: true, notice: NONE_CAN_MEET });
    expect(result.findings).toEqual([
      withItems('rule-1', ['rule-2']),
      withItems('rule-2', ['rule-1']),
    ]);
  });

  it('"is before 2 Jan 2030" and "is after 31 Dec 2029" don’t: 1 Jan 2030 meets both', () => {
    const { result } = scenario([
      on(1, PID_EXPIRY, { operator: 'before', date: '2030-01-02' }),
      on(2, PID_EXPIRY, { operator: 'after', date: '2029-12-31' }),
    ]);
    expect(result).toMatchObject({ complete: true, notice: null, findings: [] });
  });
});

describe('EC-7: a fixed date against the day of sharing (FR-008, W5)', () => {
  const items = [
    on(1, PID_BIRTH, { operator: 'after', date: '2010-01-01' }),
    yearsAgo(2, 'at_least_years_ago', 21),
  ];

  it('conflicts at the moment, in the notes, the banner and the notice (A7)', () => {
    const { result, notes, banner } = scenario(items);
    expect(result).toMatchObject({
      complete: true,
      notice: { kind: 'none_can_meet', today: true },
    });
    expect(result.findings).toEqual([
      withItems('rule-1', ['rule-2'], true),
      withItems('rule-2', ['rule-1'], true),
    ]);
    expect(notes).toEqual({
      'rule-1': withNote('Rule 02', true),
      'rule-2': withNote('Rule 01', true),
    });
    expect(banner).toBe(
      'Rule 01 and Rule 02 contradict each other, so right now no citizen can meet the rules ' +
        'of Standard.'
    );
  });

  it('still conflicts on 1 Jan 2031, and no longer on 2 Jan 2031', () => {
    expect(scenario(items, 'and', '2031-01-01').result.findings).toHaveLength(2);
    const { result } = scenario(items, 'and', '2031-01-02');
    expect(result).toMatchObject({ complete: true, notice: null, findings: [] });
  });
});

describe('EC "An enum rule with every value" (FR-007)', () => {
  it('"includes none of" every country: the rule’s condition can’t be met', () => {
    const { result, notes, banner } = scenario([
      on(1, MDL_NATIONALITY, { operator: 'includes_none_of', values: EVERY_COUNTRY }),
    ]);
    expect(result).toMatchObject({ complete: true, notice: NONE_CAN_MEET });
    expect(result.findings).toEqual([condition('rule-1')]);
    expect(notes).toEqual({
      'rule-1': 'No citizen can meet this rule.',
    });
    expect(banner).toBe(
      'No citizen can meet Rule 01. So no citizen can meet the rules of Standard.'
    );
  });

  it('the same on a field that holds several countries, beside a rule that can be met', () => {
    const { result } = scenario([
      classesOneOf(1, 'B'),
      on(2, PID_NATIONALITY, { operator: 'includes_none_of', values: EVERY_COUNTRY }),
    ]);
    expect(result.notice).toEqual(NONE_CAN_MEET);
    expect(result.findings).toEqual([condition('rule-2')]);
  });

  it('"includes one of" every country: every citizen meets the rule, and the branch', () => {
    const { result, notes, banner } = scenario([
      on(1, MDL_NATIONALITY, { operator: 'includes_one_of', values: EVERY_COUNTRY }),
    ]);
    expect(result).toMatchObject({ complete: true, notice: ALL_MEET });
    expect(result.findings).toEqual([alwaysMet('rule-1')]);
    expect(notes).toEqual({ 'rule-1': 'Every citizen meets this rule.' });
    expect(banner).toContain('Every citizen meets Rule 01, so it doesn’t check anything.');
  });

  it('"includes one of" every country beside a rule that checks something: no notice', () => {
    const { result, notes } = scenario([
      classesOneOf(1, 'B'),
      on(2, PID_NATIONALITY, { operator: 'includes_one_of', values: EVERY_COUNTRY }),
    ]);
    expect(result).toMatchObject({ complete: true, notice: null });
    expect(result.findings).toEqual([alwaysMet('rule-2')]);
    expect(notes).toEqual({ 'rule-2': 'Every citizen meets this rule.' });
  });
});

describe('EC "Fields that describe the same fact" (FR-007)', () => {
  // "Personal ID – Date of birth (Age) is at least 21 years old" and "Driving licence – Age in
  // years is less than 18"
  it('a Personal ID’s age against a driving licence’s: no finding', () => {
    const { result } = scenario([yearsAgo(1, 'at_least_years_ago', 21), ageBelow(2, 18)]);
    expect(result).toMatchObject({ complete: true, notice: null, findings: [] });
  });

  it('both documents’ dates of birth, the licence’s age and year of birth: no finding', () => {
    const { result } = scenario([
      on(1, PID_BIRTH, { operator: 'after', date: '2010-01-01' }),
      on(2, target('mdl', 'birth_date'), { operator: 'before', date: '2000-01-01' }),
      ageAbove(3, 50),
      on(4, target('mdl', 'age_birth_year'), { operator: 'greater_than', value: 2000 }),
    ]);
    expect(result).toMatchObject({ complete: true, notice: null, findings: [] });
  });
});

describe('EC "Unlikely values" (Assumptions)', () => {
  it('a birth in the future, an age of 200, a licence expired ten years ago: no finding', () => {
    const { result } = scenario([
      on(1, PID_BIRTH, { operator: 'after', date: '2030-01-01' }),
      on(2, AGE, { operator: 'equal_to', value: 200 }),
      on(3, MDL_EXPIRY, { operator: 'before', date: '2016-10-28' }),
    ]);
    expect(result).toMatchObject({ complete: true, notice: null, findings: [], checkedRules: 3 });
  });
});

describe('EC "Rules with problems" (FR-002, W11)', () => {
  it('leaves out incomplete rules and unrequested data, but not a missing message', () => {
    const { checked, result, notes } = scenario([
      ageAbove(1, 30),
      on(2, AGE, { operator: 'less_than', value: null }),
      on(3, target('mdl', 'weight'), { operator: 'less_than', value: 20 }),
      rule(4, AGE, { operator: 'less_than', value: 25 }, ''),
      rule(5, null, null),
    ]);
    expect(checked.leftOut).toEqual(['rule-2', 'rule-3', 'rule-5']);
    expect(result).toMatchObject({ complete: true, notice: NONE_CAN_MEET, checkedRules: 2 });
    expect(result.findings).toEqual([
      withItems('rule-1', ['rule-4']),
      withItems('rule-4', ['rule-1']),
    ]);
    expect(notes).toEqual({ 'rule-1': withNote('Rule 04'), 'rule-4': withNote('Rule 01') });
  });

  it('carries no finding and no notice when only rules with problems conflict', () => {
    const { result } = scenario([
      ageAbove(1, 30),
      on(2, AGE, { operator: 'less_than', value: null }),
      on(3, target('mdl', 'weight'), { operator: 'less_than', value: 20 }),
    ]);
    expect(result).toMatchObject({ complete: true, notice: null, findings: [], checkedRules: 1 });
  });
});

// US2: see rules that make no difference (quickstart V3)

/** The next numbers of the rules step after Rule 01 */
const AFTER_ONE_RULE = { rule: 2, group: 1 };

describe('US2-AS1 and AS2: "greater than 10" and "greater than 11" (V3 step 1)', () => {
  const items = [ageAbove(1, 10), ageAbove(2, 11)];

  it('AS1: with AND, the weaker Rule 01 is redundant, naming Rule 02', () => {
    const { result, notes, banner } = scenario(items);
    expect(result).toMatchObject({ complete: true, notice: null, checkedRules: 2 });
    expect(result.findings).toEqual([impliedBy('rule-1', ['rule-2'])]);
    expect(notes).toEqual({ 'rule-1': impliedNote('Rule 02') });
    expect(banner).toBe('Anyone who meets Rule 02 also meets Rule 01.');
  });

  it('AS2: with OR, the stronger Rule 02 is redundant, naming Rule 01', () => {
    const { result, notes, banner } = scenario(items, 'or');
    expect(result).toMatchObject({ complete: true, notice: null });
    expect(result.findings).toEqual([implies('rule-2', ['rule-1'])]);
    expect(notes).toEqual({ 'rule-2': impliesNote('Rule 01') });
    expect(banner).toBe('Anyone who meets Rule 02 also meets Rule 01.');
  });
});

describe('US2-AS3 and EC "Duplicates and copies": a duplicated rule (V3 step 2)', () => {
  const original = [ageAbove(1, 18)];
  const duplicated = duplicateRule(original, 'rule-1', AFTER_ONE_RULE);

  it('the copy is the same check as the original, which stays plain', () => {
    expect(duplicated?.rule.id).toBe('rule-2');
    const { result, notes, banner } = scenario(duplicated?.items ?? []);
    expect(result).toMatchObject({ complete: true, notice: null });
    expect(result.findings).toEqual([sameAs('rule-2', 'rule-1')]);
    expect(notes).toEqual({ 'rule-2': sameNote('Rule 01') });
    expect(banner).toBe('Rule 02 is the same as Rule 01.');
  });

  it('a duplicate in a group is the same check too', () => {
    const items = [group(1, [ageAbove(1, 18), classesOneOf(2, 'B')], 'or')];
    const copy = duplicateRule(items, 'rule-1', { rule: 3, group: 2 });
    const { result, notes } = scenario(copy?.items ?? []);
    expect(result.findings).toEqual([sameAs('rule-3', 'rule-1')]);
    expect(notes).toEqual({ 'rule-3': sameNote('Rule 01') });
  });

  it('the copy’s mark goes once its value changes to a stronger one', () => {
    const changed = updateRule(duplicated?.items ?? [], 'rule-2', {
      condition: { operator: 'greater_than', value: 30 },
    });
    const { result, notes } = scenario(changed?.items ?? []);
    // The copy now checks more than the original: the original adds nothing beside it
    expect(result.findings).toEqual([impliedBy('rule-1', ['rule-2'])]);
    expect(notes).toEqual({ 'rule-1': impliedNote('Rule 02') });
  });

  it('unless the new condition still makes no difference', () => {
    const changed = updateRule(duplicated?.items ?? [], 'rule-2', {
      condition: { operator: 'greater_than', value: 10 },
    });
    const { result, notes } = scenario(changed?.items ?? []);
    expect(result.findings).toEqual([impliedBy('rule-2', ['rule-1'])]);
    expect(notes).toEqual({ 'rule-2': impliedNote('Rule 01') });
  });
});

describe('US2-AS4: a class listed, and a date of that class (V3 step 3)', () => {
  it('"Licence classes includes one of B" is redundant beside "Licence class B – Issue date"', () => {
    const { result, notes } = scenario([
      classesOneOf(1, 'B'),
      on(2, target('mdl', 'driving_privileges', 'issue_date', 'B'), {
        operator: 'at_least_years_ago',
        years: 2,
      }),
    ]);
    expect(result).toMatchObject({ complete: true, notice: null });
    expect(result.findings).toEqual([impliedBy('rule-1', ['rule-2'])]);
    expect(notes).toEqual({ 'rule-1': impliedNote('Rule 02') });
  });
});

describe('US2-AS5: an OR group that every citizen meets (V3 step 4)', () => {
  it('marks the group as always met, its rules stay plain', () => {
    const { result, notes, banner } = scenario([
      group(1, [ageAbove(1, 18), ageBelow(2, 21)], 'or'),
    ]);
    expect(result).toMatchObject({ complete: true, notice: ALL_MEET });
    expect(result.findings).toEqual([alwaysMet('group-1')]);
    expect(notes).toEqual({ 'group-1': 'Every citizen meets this group.' });
    expect(banner).toContain('Every citizen meets Group 01, so it doesn’t check anything.');
  });

  it('beside a rule that checks something, the branch has no notice', () => {
    const { result, notes, banner } = scenario([
      group(1, [ageAbove(1, 18), ageBelow(2, 21)], 'or'),
      classesOneOf(3, 'B'),
    ]);
    expect(result).toMatchObject({ complete: true, notice: null });
    expect(result.findings).toEqual([alwaysMet('group-1')]);
    expect(notes).toEqual({ 'group-1': 'Every citizen meets this group.' });
    expect(banner).toBe('Every citizen meets Group 01, so it doesn’t check anything.');
  });
});

describe('US2-AS6: an OR group implied by a rule beside it (V3 step 5)', () => {
  it('marks the group redundant, naming Rule 01, and the rules inside it stay plain', () => {
    const { result, notes } = scenario([
      yearsAgo(1, 'at_least_years_ago', 21),
      group(
        1,
        [
          yearsAgo(2, 'at_least_years_ago', 18),
          on(3, PID_NATIONALITY, { operator: 'includes_one_of', values: ['DE'] }),
        ],
        'or'
      ),
    ]);
    expect(result).toMatchObject({ complete: true, notice: null });
    expect(result.findings).toEqual([impliedBy('group-1', ['rule-1'])]);
    expect(notes).toEqual({ 'group-1': impliedNote('Rule 01', 'group') });
  });
});

describe('US2-AS7: deleting every redundant item changes no outcome (V3 step 6)', () => {
  // On the oracle's fields (testOracle.ts' ORACLE_CONTEXT), so that the oracle can compare
  // every citizen's outcome on every day from today on
  const height = target('mdl', 'height');
  const classes = target('mdl', 'driving_privileges', 'classes');
  const familyName = target('pid', 'family_name');
  const items: RuleTreeItem[] = [
    on(1, height, { operator: 'greater_than', value: 10 }),
    on(2, height, { operator: 'greater_than', value: 11 }),
    group(
      1,
      [
        on(3, height, { operator: 'greater_than', value: 5 }),
        on(4, classes, { operator: 'includes_one_of', values: ['B'] }),
      ],
      'or'
    ),
    on(5, familyName, { operator: 'equal_to', value: 'a', match_case: false }),
    on(6, familyName, { operator: 'equal_to', value: 'A', match_case: false }),
  ];
  const branch = { ...mainBranch(items), key: 'us2-as7' };
  const before = checkBranch(checkedBranchOf(branch), IN_TIME);
  const redundant = before.findings
    .filter((finding) => finding.kind === 'redundant')
    .map((finding) => finding.itemId);

  it('reports Rule 01, Group 01 and Rule 06 as redundant', () => {
    // Research R8 visits the items from the last: Group 01 is asked about while Rule 01 is still
    // in the working tree, and Rule 01 is the first of the smallest sets that imply it
    expect(before).toMatchObject({ complete: true, notice: null });
    expect(before.findings).toEqual([
      impliedBy('rule-1', ['rule-2']),
      impliedBy('group-1', ['rule-1']),
      sameAs('rule-6', 'rule-5'),
    ]);
  });

  it('deleting all of them at once changes no citizen’s outcome', () => {
    expect(oracleOf(branch).changedOutcome(redundant, FROM_TODAY)).toBeNull();
  });

  it('deleting them one after the other keeps the notice and the always-met marks', () => {
    const alwaysMetOf = (check: BranchCheck) =>
      check.findings.filter((finding) => finding.kind === 'always_met');
    let current = items;
    for (const id of redundant) {
      current = deleteItem(current, id)?.items ?? current;
      const after = checkBranch(
        checkedBranchOf({ ...mainBranch(current), key: 'us2-as7' }),
        IN_TIME
      );
      expect(after.notice).toEqual(before.notice);
      expect(alwaysMetOf(after)).toEqual(alwaysMetOf(before));
    }
  });
});

describe('EC "Letter case" and "Text inside other text": redundant text rules', () => {
  it('both ignoring letter case, the later rule is the same check', () => {
    const { result, notes } = scenario([
      city(1, 'equal_to', 'Stuttgart'),
      city(2, 'equal_to', 'STUTTGART'),
    ]);
    expect(result.findings).toEqual([sameAs('rule-2', 'rule-1')]);
    expect(notes).toEqual({ 'rule-2': sameNote('Rule 01') });
  });

  it('the first respecting letter case, the second ignoring it: the second is redundant', () => {
    const { result, notes } = scenario([
      city(1, 'equal_to', 'Stuttgart', true),
      city(2, 'equal_to', 'STUTTGART'),
    ]);
    expect(result.findings).toEqual([impliedBy('rule-2', ['rule-1'])]);
    expect(notes).toEqual({ 'rule-2': impliedNote('Rule 01') });
  });

  it('"contains straße" and "contains STRASSE", ignoring letter case, are the same check', () => {
    const { result, notes } = scenario([
      city(1, 'contains', 'straße'),
      city(2, 'contains', 'STRASSE'),
    ]);
    expect(result.findings).toEqual([sameAs('rule-2', 'rule-1')]);
    expect(notes).toEqual({ 'rule-2': sameNote('Rule 01') });
  });

  it('"is equal to Stuttgart" makes "contains Stutt" redundant', () => {
    const { result, notes } = scenario([
      city(1, 'equal_to', 'Stuttgart'),
      city(2, 'contains', 'Stutt'),
    ]);
    expect(result.findings).toEqual([impliedBy('rule-2', ['rule-1'])]);
    expect(notes).toEqual({ 'rule-2': impliedNote('Rule 01') });
  });
});

describe('EC "Years and months"', () => {
  it('"at least 12 months from now" and "at least 1 year from now" are the same check', () => {
    const { result, notes } = scenario([
      on(1, PID_EXPIRY, { operator: 'at_least_from_now', amount: 12, unit: 'months' }),
      on(2, PID_EXPIRY, { operator: 'at_least_from_now', amount: 1, unit: 'years' }),
    ]);
    expect(result.findings).toEqual([sameAs('rule-2', 'rule-1')]);
    expect(notes).toEqual({ 'rule-2': sameNote('Rule 01') });
  });

  it('"exactly 21 years old" makes "at least 18 years old" redundant with AND', () => {
    const { result, notes } = scenario([
      yearsAgo(1, 'exactly_years_ago', 21),
      yearsAgo(2, 'at_least_years_ago', 18),
    ]);
    expect(result.findings).toEqual([impliedBy('rule-2', ['rule-1'])]);
    expect(notes).toEqual({ 'rule-2': impliedNote('Rule 01') });
  });
});

describe('EC-7’s second example: redundant today, but not on every later day', () => {
  it('"before 1 Jan 2010" next to "at least 18 years old" gives no finding', () => {
    const { result } = scenario([
      on(1, PID_BIRTH, { operator: 'before', date: '2010-01-01' }),
      yearsAgo(2, 'at_least_years_ago', 18),
    ]);
    expect(result).toMatchObject({ complete: true, notice: null, findings: [] });
  });
});

describe('EC "Rules that are redundant only because of each other" (FR-005)', () => {
  it('of two rules with the same check, only the later one is marked', () => {
    const { result } = scenario([ageAbove(1, 18), ageAbove(2, 18)]);
    expect(result.findings).toEqual([sameAs('rule-2', 'rule-1')]);
  });

  it('the same in a level combined with OR', () => {
    const { result } = scenario([ageAbove(1, 18), ageAbove(2, 18)], 'or');
    expect(result.findings).toEqual([sameAs('rule-2', 'rule-1')]);
  });

  it('of three, the two later ones, each the same as the first', () => {
    const { result, notes } = scenario([ageAbove(1, 18), ageAbove(2, 18), ageAbove(3, 18)]);
    expect(result.findings).toEqual([sameAs('rule-2', 'rule-1'), sameAs('rule-3', 'rule-1')]);
    expect(notes).toEqual({ 'rule-2': sameNote('Rule 01'), 'rule-3': sameNote('Rule 01') });
  });
});

describe('EC-20 (W4): a branch that no citizen can meet, with a duplicate (V3 step 7)', () => {
  const conflict = [nationalityOneOf(1, 'DE'), nationalityOneOf(2, 'IT')];
  const duplicated = duplicateRule(conflict, 'rule-1', { rule: 3, group: 1 });

  it('reports only conflicts while the branch can’t be met', () => {
    const { result } = scenario(duplicated?.items ?? []);
    expect(result).toMatchObject({ complete: true, notice: NONE_CAN_MEET });
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.findings.every((finding) => finding.kind === 'conflicting')).toBe(true);
  });

  it('shows the duplicate’s note once the conflict is gone', () => {
    const resolved = deleteItem(duplicated?.items ?? [], 'rule-2');
    const { result, notes } = scenario(resolved?.items ?? []);
    expect(result).toMatchObject({ complete: true, notice: null });
    expect(result.findings).toEqual([sameAs('rule-3', 'rule-1')]);
    expect(notes).toEqual({ 'rule-3': sameNote('Rule 01') });
  });
});

describe('EC "A branch without rules"', () => {
  it('has no findings and no notice, although every citizen meets it', () => {
    const { result, banner } = scenario([]);
    expect(result).toMatchObject({ complete: true, notice: null, findings: [], checkedRules: 0 });
    expect(banner).toBe('');
  });
});

// Quickstart V4: how conditions are judged, combined with AND

/** A row of quickstart V4: its two rules, and its findings, their notes and the notice */
interface V4Row {
  rules: string;
  items: RuleTreeItem[];
  /** Every finding the row expects, conflicting or redundant */
  findings: ItemFinding[];
  /** The note of each finding's item */
  notes: Record<string, string>;
  notice: BranchCheck['notice'];
}

const BOTH_CONFLICT = [withItems('rule-1', ['rule-2']), withItems('rule-2', ['rule-1'])];
const BOTH_CONFLICT_NOTES = { 'rule-1': withNote('Rule 02'), 'rule-2': withNote('Rule 01') };

/** The second rule redundant, "Same as" the first */
const SECOND_SAME = {
  findings: [sameAs('rule-2', 'rule-1')],
  notes: { 'rule-2': sameNote('Rule 01') },
  notice: null,
};

/** The second rule redundant: whoever meets the first meets it */
const SECOND_IMPLIED = {
  findings: [impliedBy('rule-2', ['rule-1'])],
  notes: { 'rule-2': impliedNote('Rule 01') },
  notice: null,
};

const NO_FINDING = { findings: [], notes: {}, notice: null };

const V4_ROWS: V4Row[] = [
  {
    rules: 'Personal ID – Nationality includes one of Germany, … of Italy',
    items: [
      on(1, PID_NATIONALITY, { operator: 'includes_one_of', values: ['DE'] }),
      on(2, PID_NATIONALITY, { operator: 'includes_one_of', values: ['IT'] }),
    ],
    ...NO_FINDING,
  },
  {
    rules: 'Licence classes includes one of B, … of C',
    items: [classesOneOf(1, 'B'), classesOneOf(2, 'C')],
    ...NO_FINDING,
  },
  {
    rules: 'City or town is equal to Stuttgart, … STUTTGART, both ignoring case',
    items: [city(1, 'equal_to', 'Stuttgart'), city(2, 'equal_to', 'STUTTGART')],
    ...SECOND_SAME,
  },
  {
    rules: 'the same, both respecting case',
    items: [city(1, 'equal_to', 'Stuttgart', true), city(2, 'equal_to', 'STUTTGART', true)],
    findings: BOTH_CONFLICT,
    notes: BOTH_CONFLICT_NOTES,
    notice: NONE_CAN_MEET,
  },
  {
    rules: 'the first respecting case, the second ignoring it',
    items: [city(1, 'equal_to', 'Stuttgart', true), city(2, 'equal_to', 'STUTTGART')],
    ...SECOND_IMPLIED,
  },
  {
    rules: 'contains straße, contains STRASSE, ignoring case',
    items: [city(1, 'contains', 'straße'), city(2, 'contains', 'STRASSE')],
    ...SECOND_SAME,
  },
  {
    rules: 'is equal to Stuttgart, doesn’t contain gart',
    items: [city(1, 'equal_to', 'Stuttgart'), city(2, 'not_contains', 'gart')],
    findings: BOTH_CONFLICT,
    notes: BOTH_CONFLICT_NOTES,
    notice: NONE_CAN_MEET,
  },
  {
    rules: 'is equal to Stuttgart, contains Stutt',
    items: [city(1, 'equal_to', 'Stuttgart'), city(2, 'contains', 'Stutt')],
    ...SECOND_IMPLIED,
  },
  {
    rules: 'Age in years is greater than 20, … less than 21',
    items: [ageAbove(1, 20), ageBelow(2, 21)],
    findings: BOTH_CONFLICT,
    notes: BOTH_CONFLICT_NOTES,
    notice: NONE_CAN_MEET,
  },
  {
    rules: 'Expiry date is before 1 Jan 2030, … is after 31 Dec 2029',
    items: [
      on(1, PID_EXPIRY, { operator: 'before', date: '2030-01-01' }),
      on(2, PID_EXPIRY, { operator: 'after', date: '2029-12-31' }),
    ],
    findings: BOTH_CONFLICT,
    notes: BOTH_CONFLICT_NOTES,
    notice: NONE_CAN_MEET,
  },
  {
    rules: 'Expiry date is at least 12 months from now, … at least 1 year from now',
    items: [
      on(1, PID_EXPIRY, { operator: 'at_least_from_now', amount: 12, unit: 'months' }),
      on(2, PID_EXPIRY, { operator: 'at_least_from_now', amount: 1, unit: 'years' }),
    ],
    ...SECOND_SAME,
  },
  {
    rules: 'Date of birth (Age) is exactly 21 years old, … at least 18 years old',
    items: [yearsAgo(1, 'exactly_years_ago', 21), yearsAgo(2, 'at_least_years_ago', 18)],
    ...SECOND_IMPLIED,
  },
  {
    rules: 'Personal ID – Date of birth is after 1 Jan 2010, … (Age) is at least 21 years old',
    items: [
      on(1, PID_BIRTH, { operator: 'after', date: '2010-01-01' }),
      yearsAgo(2, 'at_least_years_ago', 21),
    ],
    findings: [withItems('rule-1', ['rule-2'], true), withItems('rule-2', ['rule-1'], true)],
    notes: { 'rule-1': withNote('Rule 02', true), 'rule-2': withNote('Rule 01', true) },
    notice: { kind: 'none_can_meet', today: true },
  },
  {
    rules: 'Date of birth is before 1 Jan 2010, … (Age) is at least 18 years old',
    items: [
      on(1, PID_BIRTH, { operator: 'before', date: '2010-01-01' }),
      yearsAgo(2, 'at_least_years_ago', 18),
    ],
    ...NO_FINDING,
  },
  {
    rules: 'Driving licence – Nationality includes none of every country',
    items: [on(1, MDL_NATIONALITY, { operator: 'includes_none_of', values: EVERY_COUNTRY })],
    findings: [condition('rule-1')],
    notes: { 'rule-1': 'No citizen can meet this rule.' },
    notice: NONE_CAN_MEET,
  },
  {
    rules: 'Personal ID – Date of birth (Age) at least 21, Driving licence – Age in years < 18',
    items: [yearsAgo(1, 'at_least_years_ago', 21), ageBelow(2, 18)],
    ...NO_FINDING,
  },
];

describe('Quickstart V4: how conditions are judged', () => {
  it.each(V4_ROWS)('$rules', ({ items, findings, notes, notice }) => {
    const result = scenario(items);
    expect(result.result.complete).toBe(true);
    expect(result.result.notice).toEqual(notice);
    expect(result.result.findings).toEqual(findings);
    expect(result.notes).toEqual(notes);
  });
});

// US3: checks in every branch. Each branch is built with branches.ts and checked on its own

/** "Ambulance", based on `main`, with these rules of its own added at its top level */
function ambulanceOf(main: BranchInput, own: RuleItem[] = []): BranchInput {
  return own.reduce<BranchInput>(
    (branch, item) => addRuleToBranch(branch, item) ?? branch,
    newBranch(main, 'based', 'Ambulance', null)
  );
}

/** A branch that started empty, "Children", with these rules */
function childrenOf(main: BranchInput, own: RuleItem[] = []): BranchInput {
  return own.reduce<BranchInput>(
    (branch, item) => addRuleToBranch(branch, item) ?? branch,
    newBranch(main, 'empty', 'Children', null)
  );
}

/** The ids of the items that a finding names */
function namedBy(finding: ItemFinding): string[] {
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

/** The item ids that a branch's findings are about or name */
function idsOf(result: BranchCheck): string[] {
  return result.findings.flatMap((finding) => [finding.itemId, ...namedBy(finding)]);
}

describe('US3-AS1: a change to Standard causes a conflict in Ambulance only', () => {
  const standard = mainBranch([ageAbove(1, 18), classesOneOf(2, 'B')]);
  const ambulance = ambulanceOf(standard, [
    on(5, CLASSES, { operator: 'includes_none_of', values: ['C'] }),
  ]);

  it('before the change, neither branch has a finding', () => {
    expect(scenarioOf(standard).result).toMatchObject({ complete: true, findings: [] });
    expect(scenarioOf(ambulance, TODAY, 'ambulance').result).toMatchObject({
      complete: true,
      notice: null,
      findings: [],
      checkedRules: 3,
    });
  });

  it('"includes one of C" in Standard: Rule 02 and Rule 05 conflict in Ambulance', () => {
    const edited = updateRule(standard.items, 'rule-2', {
      condition: { operator: 'includes_one_of', values: ['C'] },
    });
    expect(edited).not.toBeNull();
    const changed = { ...standard, items: edited?.items ?? [] };
    const propagated = propagateMain(standard, changed, ambulance);

    const inStandard = scenarioOf(changed);
    expect(inStandard.result).toMatchObject({ complete: true, notice: null, findings: [] });

    const { result, notes } = scenarioOf(propagated, TODAY, 'ambulance');
    expect(result).toMatchObject({ complete: true, notice: NONE_CAN_MEET, checkedRules: 3 });
    expect(result.findings).toEqual([
      withItems('rule-2', ['rule-5']),
      withItems('rule-5', ['rule-2']),
    ]);
    expect(notes).toEqual({ 'rule-2': withNote('Rule 05'), 'rule-5': withNote('Rule 02') });
  });
});

describe('US3-AS2: a rule removed in Ambulance, and restored', () => {
  const standard = mainBranch([ageAbove(1, 30), classesOneOf(2, 'B')]);
  const ambulance = ambulanceOf(standard, [ageBelow(5, 20)]);
  const conflict = [withItems('rule-1', ['rule-5']), withItems('rule-5', ['rule-1'])];

  it('while inherited, Rule 01 conflicts with Ambulance’s Rule 05', () => {
    const { result } = scenarioOf(ambulance, TODAY, 'ambulance');
    expect(result).toMatchObject({ complete: true, notice: NONE_CAN_MEET, checkedRules: 3 });
    expect(result.findings).toEqual(conflict);
  });

  it('removed, Rule 01 isn’t checked, and the conflict it took part in leaves Ambulance', () => {
    const removed = removeItem(standard, ambulance, 'rule-1');
    expect(removed).not.toBeNull();
    const { result } = scenarioOf(removed ?? ambulance, TODAY, 'ambulance');
    expect(result).toMatchObject({ complete: true, notice: null, findings: [], checkedRules: 2 });
    // Standard keeps Rule 01, with no conflict of its own
    expect(scenarioOf(standard).result).toMatchObject({ findings: [], checkedRules: 2 });
  });

  it('restored, Rule 01 is checked again, with its conflict', () => {
    const removed = removeItem(standard, ambulance, 'rule-1');
    const restored = removed && restoreItem(standard, removed, 'rule-1');
    expect(restored).not.toBeNull();
    const before = scenarioOf(ambulance, TODAY, 'ambulance');
    const after = scenarioOf(restored ?? ambulance, TODAY, 'ambulance');
    expect(after.checked.fingerprint).toBe(before.checked.fingerprint);
    expect(after.result).toEqual(before.result);
    expect(after.result.findings).toEqual(conflict);
  });
});

describe('US3-AS3: a branch that started empty is checked without Standard’s rules', () => {
  const standard = mainBranch([nationalityOneOf(1, 'DE'), ageAbove(2, 18)]);

  it('a rule that would conflict with Standard’s gets no finding', () => {
    const children = childrenOf(standard, [nationalityOneOf(5, 'IT'), ageAbove(6, 18)]);
    const { result } = scenarioOf(children, TODAY, 'children');
    expect(result).toMatchObject({ complete: true, notice: null, findings: [], checkedRules: 2 });
  });

  it('its own rules are checked against each other', () => {
    const children = childrenOf(standard, [nationalityOneOf(5, 'IT'), nationalityOneOf(6, 'DE')]);
    const { result } = scenarioOf(children, TODAY, 'children');
    expect(result).toMatchObject({ complete: true, notice: NONE_CAN_MEET, checkedRules: 2 });
    expect(result.findings).toEqual([
      withItems('rule-5', ['rule-6']),
      withItems('rule-6', ['rule-5']),
    ]);
  });
});

describe('US3-AS4: a conflict among inherited rules shows in both branches', () => {
  const standard = mainBranch([ageAbove(1, 30), ageBelow(2, 20)]);
  const ambulance = ambulanceOf(standard, [classesOneOf(5, 'B')]);
  const conflict = [withItems('rule-1', ['rule-2']), withItems('rule-2', ['rule-1'])];

  it('Standard and Ambulance both mark Rule 01 and Rule 02, and neither can be met', () => {
    const inStandard = scenarioOf(standard).result;
    const inAmbulance = scenarioOf(ambulance, TODAY, 'ambulance').result;
    expect(inStandard).toMatchObject({ complete: true, notice: NONE_CAN_MEET });
    expect(inStandard.findings).toEqual(conflict);
    expect(inAmbulance).toMatchObject({ complete: true, notice: NONE_CAN_MEET, checkedRules: 3 });
    expect(inAmbulance.findings).toEqual(conflict);
  });
});

describe('EC "Removed rules and dissolved groups": a group dissolved in Ambulance', () => {
  // Standard: Group 01 (OR: Rule 01 "greater than 30", Rule 02 "includes one of B") AND Rule 03
  // "less than 20". Rule 01 conflicts with its AND sibling Rule 03 (US1-AS5), Group 01 doesn’t
  const standard = mainBranch([
    group(1, [ageAbove(1, 30), classesOneOf(2, 'B')], 'or'),
    ageBelow(3, 20),
  ]);
  const ambulance = ambulanceOf(standard);

  it('in Standard, only Rule 01 is marked, and the branch can be met', () => {
    const { result } = scenarioOf(standard);
    expect(result).toMatchObject({ complete: true, notice: null });
    expect(result.findings).toEqual([withItems('rule-1', ['rule-3'])]);
  });

  it('Rule 02 removed: Group 01 is checked as Rule 01, which Rule 03 then conflicts with', () => {
    const removed = removeItem(standard, ambulance, 'rule-2');
    expect(removed).not.toBeNull();
    const { checked, result } = scenarioOf(removed ?? ambulance, TODAY, 'ambulance');
    expect(checked.items.map((entry) => entry.id)).toEqual(['rule-1', 'rule-3']);
    expect(result).toMatchObject({ complete: true, notice: NONE_CAN_MEET, checkedRules: 2 });
    expect(result.findings).toEqual([
      withItems('rule-1', ['rule-3']),
      withItems('rule-3', ['rule-1']),
    ]);
  });

  it('Group 01 restored: Ambulance is checked as Standard again', () => {
    const removed = removeItem(standard, ambulance, 'rule-2');
    const restored = removed && restoreItem(standard, removed, 'group-1');
    expect(restored).not.toBeNull();
    const { result } = scenarioOf(restored ?? ambulance, TODAY, 'ambulance');
    expect(result).toEqual({ ...scenarioOf(standard).result, branchKey: 'ambulance' });
  });
});

describe('EC "Duplicates and copies": a rule copied to another branch', () => {
  const standard = mainBranch([ageAbove(1, 30)]);
  const branches = [standard, ambulanceOf(standard), childrenOf(standard, [ageBelow(5, 20)])];
  const counters = { rule: 6, group: 1 };

  it('copied to Children, it is checked with Children’s rules, and Standard keeps none', () => {
    const copied = copyRule(branches, 0, 'rule-1', [2], counters);
    expect(copied?.copies.map((copy) => copy.rule.id)).toEqual(['rule-6']);
    const [inStandard, , inChildren] = copied?.branches ?? branches;
    expect(scenarioOf(inStandard).result).toMatchObject({ findings: [], checkedRules: 1 });
    const { result } = scenarioOf(inChildren, TODAY, 'children');
    expect(result).toMatchObject({ complete: true, notice: NONE_CAN_MEET, checkedRules: 2 });
    expect(result.findings).toEqual([
      withItems('rule-5', ['rule-6']),
      withItems('rule-6', ['rule-5']),
    ]);
  });

  it('copied from Children to Ambulance, it conflicts there with the inherited Rule 01', () => {
    const copied = copyRule(branches, 2, 'rule-5', [1], counters);
    const inAmbulance = copied?.branches[1] ?? branches[1];
    const { result } = scenarioOf(inAmbulance, TODAY, 'ambulance');
    expect(result).toMatchObject({ complete: true, notice: NONE_CAN_MEET, checkedRules: 2 });
    expect(result.findings).toEqual([
      withItems('rule-1', ['rule-6']),
      withItems('rule-6', ['rule-1']),
    ]);
  });

  it('copied from Standard to Ambulance, which inherits the original: the same check', () => {
    const copied = copyRule(branches, 0, 'rule-1', [1], counters);
    const inAmbulance = copied?.branches[1] ?? branches[1];
    const { result, notes } = scenarioOf(inAmbulance, TODAY, 'ambulance');
    expect(result).toMatchObject({ complete: true, notice: null });
    expect(result.findings).toEqual([sameAs('rule-6', 'rule-1')]);
    expect(notes).toEqual({ 'rule-6': sameNote('Rule 01') });
  });
});

describe('FR-001: two branches with the same rules', () => {
  const standard = mainBranch([ageAbove(1, 18), classesOneOf(2, 'B')]);

  it('a based branch that changes nothing: no finding compares it with Standard', () => {
    const inStandard = scenarioOf(standard).result;
    const inAmbulance = scenarioOf(ambulanceOf(standard), TODAY, 'ambulance').result;
    expect(inStandard).toMatchObject({ complete: true, notice: null, findings: [] });
    expect(inAmbulance).toEqual({ ...inStandard, branchKey: 'ambulance' });
  });

  it('a branch that started empty with the same checks: none in either branch', () => {
    const children = childrenOf(standard, [ageAbove(5, 18), classesOneOf(6, 'B')]);
    expect(scenarioOf(standard).result.findings).toEqual([]);
    const { result } = scenarioOf(children, TODAY, 'children');
    expect(result).toMatchObject({ complete: true, notice: null, findings: [], checkedRules: 2 });
  });

  it('each branch’s findings name only its own items', () => {
    const children = childrenOf(standard, [ageAbove(5, 18), ageAbove(6, 18)]);
    const { result } = scenarioOf(children, TODAY, 'children');
    expect(result.findings).toEqual([sameAs('rule-6', 'rule-5')]);
    expect(idsOf(result).every((id) => ['rule-5', 'rule-6'].includes(id))).toBe(true);
  });
});
