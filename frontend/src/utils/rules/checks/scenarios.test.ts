// The spec's scenarios of the rule checks (specs/003-rule-consistency-checks, US1 acceptance
// scenarios, edge cases, quickstart V4): each case builds its branch with testData.ts' helpers,
// checks it on 2026-10-28 with `buildCheckedBranch()` and `checkBranch()`, and asserts the exact
// findings, their notes (`noteOf()`) and, where the spec words it, the summary (`summaryOf()`).
//
// Conflicts (US1) come first. The redundancy scenarios (US2, T036) and the variants' (US3, T040)
// extend this file with the same helpers: `scenario()` for a main branch's items, `scenarioOf()`
// for any branch, such as one based on the main branch.
import { describe, expect, it } from 'vitest';

import type { DocumentField } from '../../../types/document-types';
import type {
  BranchInput,
  Combinator,
  Condition,
  GroupItem,
  RuleItem,
  RuleTarget,
  RuleTreeItem,
} from '../../../types/form-connections';
import { mainBranch, MDL, OPTION_SETS, PID, rule, target } from '../testData';
import { deleteItem, replaceItem, setOperator, undoChange, ungroupItem, updateRule } from '../tree';
import type { RuleContext } from '../types';
import { buildCheckedBranch } from './checkedTree';
import { namesOf, noteOf, summaryOf } from './findingMessages';
import { checkBranch } from './findings';
import type {
  BranchCheck,
  CheckedBranch,
  CheckOptions,
  ConflictingFinding,
  ItemFinding,
  ItemNames,
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
  /** The summary above the rules: '' when the result has neither a finding nor a notice */
  summary: string;
}

/** Checks a branch on `today`, with the branch's own name in the summary */
function scenarioOf(branch: BranchInput, today = TODAY, key = 'branch-1'): Scenario {
  const checked = buildCheckedBranch({ ...branch, key }, SCENARIO_CONTEXT, today);
  const result = checkBranch(checked, IN_TIME);
  const names = namesOf(branch.items);
  const notes = Object.fromEntries(
    result.findings.map((finding) => [finding.itemId, noteOf(finding, names)])
  );
  const shown = result.findings.length > 0 || result.notice !== null;
  return {
    checked,
    result,
    names,
    notes,
    summary: shown ? summaryOf(result, { key, name: branch.name }, names) : '',
  };
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

/** "Conflicting. Can’t be met together with <items>." */
function withNote(items: string, today = false): string {
  const suffix = today ? ' by applicants who share today' : '';
  return `Conflicting. Can’t be met together with ${items}${suffix}.`;
}

const NONE_CAN_MEET = { kind: 'none_can_meet', today: false } as const;

// US1: see rules that can't be met together

describe('US1-AS1 and AS2: two rules on a field that holds one value', () => {
  const items = [nationalityOneOf(1, 'DE'), nationalityOneOf(2, 'IT')];

  it('AS1: marks both rules, each naming the other, and gives the branch its notice (F1)', () => {
    const { result, notes, summary } = scenario(items);
    expect(result).toMatchObject({ complete: true, notice: NONE_CAN_MEET, checkedRules: 2 });
    expect(result.findings).toEqual([
      withItems('rule-1', ['rule-2']),
      withItems('rule-2', ['rule-1']),
    ]);
    expect(notes).toEqual({ 'rule-1': withNote('Rule 02'), 'rule-2': withNote('Rule 01') });
    expect(summary).toBe(
      '2 conflicting rules: nobody can meet both Rule 01 and Rule 02. No applicant can meet the ' +
        'rules of Standard.'
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
    const { result, notes, summary } = scenario([group(1, [ageAbove(1, 30), ageBelow(2, 20)])]);
    expect(result.notice).toEqual(NONE_CAN_MEET);
    expect(result.findings).toEqual([
      members('group-1', ['rule-1', 'rule-2']),
      withItems('rule-1', ['rule-2']),
      withItems('rule-2', ['rule-1']),
    ]);
    expect(notes).toEqual({
      'group-1': 'Conflicting. Rule 01 and Rule 02 in this group can’t be met together.',
      'rule-1': withNote('Rule 02'),
      'rule-2': withNote('Rule 01'),
    });
    expect(summary).toBe(
      '2 conflicting rules and 1 conflicting group: nobody can meet both Rule 01 and Rule 02. No ' +
        'applicant can meet the rules of Standard.'
    );
  });

  it('in a sub-group: the same marks on the sub-group, and its group names it', () => {
    // Top level AND: Group 01 (AND: Sub-group 02 (AND: Rule 01, Rule 02), Rule 03)
    const { result, notes } = scenario([
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
      'group-1': 'Conflicting. Sub-group 02 in this group can’t be met.',
      'group-2': 'Conflicting. Rule 01 and Rule 02 in this group can’t be met together.',
      'rule-1': withNote('Rule 02'),
      'rule-2': withNote('Rule 01'),
    });
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
    expect(notes['group-1']).toBe(
      'Conflicting. Rule 01 and Rule 02 in this group can’t be met together.'
    );
  });
});

describe('US1-AS5: a rule in an OR group that conflicts with an AND sibling (W2)', () => {
  it('marks only Rule 02, naming Rule 01, and the branch has no notice', () => {
    const { result, notes, summary } = scenario([
      yearsAgo(1, 'at_least_years_ago', 21),
      group(1, [yearsAgo(2, 'less_than_years_ago', 18), classesOneOf(3, 'B')], 'or'),
    ]);
    expect(result).toMatchObject({ complete: true, notice: null, checkedRules: 3 });
    expect(result.findings).toEqual([withItems('rule-2', ['rule-1'])]);
    expect(notes).toEqual({ 'rule-2': withNote('Rule 01') });
    expect(summary).toBe('1 conflicting rule: nobody can meet both Rule 01 and Rule 02.');
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
    const { result, notes, summary } = scenario([
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
    expect(summary).toBe(
      '4 conflicting rules: nobody can meet all of Rule 01, Rule 02, Rule 03 and Rule 04. No ' +
        'applicant can meet the rules of Standard.'
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

  it('conflicts for applicants who share today, in the notes and the notice', () => {
    const { result, notes, summary } = scenario(items);
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
    expect(summary).toBe(
      '2 conflicting rules: nobody who shares today can meet both Rule 01 and Rule 02. No ' +
        'applicant who shares today can meet the rules of Standard.'
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
    const { result, notes, summary } = scenario([
      on(1, MDL_NATIONALITY, { operator: 'includes_none_of', values: EVERY_COUNTRY }),
    ]);
    expect(result).toMatchObject({ complete: true, notice: NONE_CAN_MEET });
    expect(result.findings).toEqual([condition('rule-1')]);
    expect(notes).toEqual({
      'rule-1': 'Conflicting. No applicant can meet this rule’s condition.',
    });
    expect(summary).toBe(
      '1 conflicting rule: nobody can meet Rule 01. No applicant can meet the rules of Standard.'
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

  it('"includes one of" every country isn’t conflicting', () => {
    const { result } = scenario([
      on(1, MDL_NATIONALITY, { operator: 'includes_one_of', values: EVERY_COUNTRY }),
    ]);
    expect(result).toMatchObject({ complete: true, notice: null });
    expect(conflictsOf(result)).toEqual([]);
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

// Quickstart V4: how conditions are judged, combined with AND

/** A row of quickstart V4: its two rules, and its conflicting findings and notice */
interface V4Row {
  rules: string;
  items: RuleTreeItem[];
  /** The row expects conflicts: these findings, and the notice */
  conflicts: ItemFinding[];
  notice: BranchCheck['notice'];
  /**
   * The row expects no finding at all. False for the rows that expect a redundant rule, whose
   * redundancy T036 asserts: here, only that nothing conflicts
   */
  noFinding: boolean;
}

const BOTH_CONFLICT = [withItems('rule-1', ['rule-2']), withItems('rule-2', ['rule-1'])];

const V4_ROWS: V4Row[] = [
  {
    rules: 'Personal ID – Nationality includes one of Germany, … of Italy',
    items: [
      on(1, PID_NATIONALITY, { operator: 'includes_one_of', values: ['DE'] }),
      on(2, PID_NATIONALITY, { operator: 'includes_one_of', values: ['IT'] }),
    ],
    conflicts: [],
    notice: null,
    noFinding: true,
  },
  {
    rules: 'Licence classes includes one of B, … of C',
    items: [classesOneOf(1, 'B'), classesOneOf(2, 'C')],
    conflicts: [],
    notice: null,
    noFinding: true,
  },
  {
    rules: 'City or town is equal to Stuttgart, … STUTTGART, both ignoring case',
    items: [city(1, 'equal_to', 'Stuttgart'), city(2, 'equal_to', 'STUTTGART')],
    conflicts: [],
    notice: null,
    noFinding: false,
  },
  {
    rules: 'the same, both respecting case',
    items: [city(1, 'equal_to', 'Stuttgart', true), city(2, 'equal_to', 'STUTTGART', true)],
    conflicts: BOTH_CONFLICT,
    notice: NONE_CAN_MEET,
    noFinding: false,
  },
  {
    rules: 'the first respecting case, the second ignoring it',
    items: [city(1, 'equal_to', 'Stuttgart', true), city(2, 'equal_to', 'STUTTGART')],
    conflicts: [],
    notice: null,
    noFinding: false,
  },
  {
    rules: 'contains straße, contains STRASSE, ignoring case',
    items: [city(1, 'contains', 'straße'), city(2, 'contains', 'STRASSE')],
    conflicts: [],
    notice: null,
    noFinding: false,
  },
  {
    rules: 'is equal to Stuttgart, doesn’t contain gart',
    items: [city(1, 'equal_to', 'Stuttgart'), city(2, 'not_contains', 'gart')],
    conflicts: BOTH_CONFLICT,
    notice: NONE_CAN_MEET,
    noFinding: false,
  },
  {
    rules: 'is equal to Stuttgart, contains Stutt',
    items: [city(1, 'equal_to', 'Stuttgart'), city(2, 'contains', 'Stutt')],
    conflicts: [],
    notice: null,
    noFinding: false,
  },
  {
    rules: 'Age in years is greater than 20, … less than 21',
    items: [ageAbove(1, 20), ageBelow(2, 21)],
    conflicts: BOTH_CONFLICT,
    notice: NONE_CAN_MEET,
    noFinding: false,
  },
  {
    rules: 'Expiry date is before 1 Jan 2030, … is after 31 Dec 2029',
    items: [
      on(1, PID_EXPIRY, { operator: 'before', date: '2030-01-01' }),
      on(2, PID_EXPIRY, { operator: 'after', date: '2029-12-31' }),
    ],
    conflicts: BOTH_CONFLICT,
    notice: NONE_CAN_MEET,
    noFinding: false,
  },
  {
    rules: 'Expiry date is at least 12 months from now, … at least 1 year from now',
    items: [
      on(1, PID_EXPIRY, { operator: 'at_least_from_now', amount: 12, unit: 'months' }),
      on(2, PID_EXPIRY, { operator: 'at_least_from_now', amount: 1, unit: 'years' }),
    ],
    conflicts: [],
    notice: null,
    noFinding: false,
  },
  {
    rules: 'Date of birth (Age) is exactly 21 years old, … at least 18 years old',
    items: [yearsAgo(1, 'exactly_years_ago', 21), yearsAgo(2, 'at_least_years_ago', 18)],
    conflicts: [],
    notice: null,
    noFinding: false,
  },
  {
    rules: 'Personal ID – Date of birth is after 1 Jan 2010, … (Age) is at least 21 years old',
    items: [
      on(1, PID_BIRTH, { operator: 'after', date: '2010-01-01' }),
      yearsAgo(2, 'at_least_years_ago', 21),
    ],
    conflicts: [withItems('rule-1', ['rule-2'], true), withItems('rule-2', ['rule-1'], true)],
    notice: { kind: 'none_can_meet', today: true },
    noFinding: false,
  },
  {
    rules: 'Date of birth is before 1 Jan 2010, … (Age) is at least 18 years old',
    items: [
      on(1, PID_BIRTH, { operator: 'before', date: '2010-01-01' }),
      yearsAgo(2, 'at_least_years_ago', 18),
    ],
    conflicts: [],
    notice: null,
    noFinding: true,
  },
  {
    rules: 'Driving licence – Nationality includes none of every country',
    items: [on(1, MDL_NATIONALITY, { operator: 'includes_none_of', values: EVERY_COUNTRY })],
    conflicts: [condition('rule-1')],
    notice: NONE_CAN_MEET,
    noFinding: false,
  },
  {
    rules: 'Personal ID – Date of birth (Age) at least 21, Driving licence – Age in years < 18',
    items: [yearsAgo(1, 'at_least_years_ago', 21), ageBelow(2, 18)],
    conflicts: [],
    notice: null,
    noFinding: true,
  },
];

describe('Quickstart V4: how conditions are judged', () => {
  it.each(V4_ROWS)('$rules', ({ items, conflicts, notice, noFinding }) => {
    const { result } = scenario(items);
    expect(result.complete).toBe(true);
    expect(result.notice).toEqual(notice);
    expect(conflictsOf(result)).toEqual(conflicts);
    if (noFinding) {
      expect(result.findings).toEqual([]);
    }
  });
});
