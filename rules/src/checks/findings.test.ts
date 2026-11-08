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

import { CONTEXT, mainBranch, rule, target } from '../testData';
import { renameItem } from '../tree';
import { buildCheckedBranch } from './checkedTree';
import { checkBranch as checkBranchOnly } from './findings';
import {
  BRANCH,
  checkedBranchOf,
  FROM_TODAY,
  LATER_DAYS,
  type Oracle,
  ORACLE_TODAY_DAY,
  oracleOf,
  randomBranch,
  withSeed,
} from './testOracle';
import type {
  BranchCheck,
  CheckedBranch,
  CheckedItem,
  CheckOptions,
  ItemFinding,
  RedundantReason,
} from './types';

// data-model.md's invariants 1 to 3, checked on every result of this file

/**
 * `checkBranch()`, whose every result is checked against data-model.md's invariants 1 to 3: at
 * most one finding per item; only conflicting findings with the notice `none_can_meet` (FR-005,
 * W4); no finding inside a redundant or always-met group, and no redundant or always-met finding
 * on a conflicting item or inside one (FR-005)
 */
function checkBranch(checked: CheckedBranch, options: CheckOptions): BranchCheck {
  const result = checkBranchOnly(checked, options);
  expectInvariants(checked, result);
  return result;
}

function expectInvariants(checked: CheckedBranch, result: BranchCheck): void {
  const ids = result.findings.map((finding) => finding.itemId);
  expect(new Set(ids).size, 'invariant 1').toBe(ids.length);
  if (result.notice?.kind === 'none_can_meet') {
    expect(
      result.findings.every((finding) => finding.kind === 'conflicting'),
      'invariant 2'
    ).toBe(true);
  }
  const byId = new Map(result.findings.map((finding) => [finding.itemId, finding]));
  const ancestors = ancestorsOf(checked);
  for (const finding of result.findings) {
    const above = (ancestors.get(finding.itemId) ?? []).map((id) => byId.get(id)?.kind);
    expect(
      above.some((kind) => kind === 'redundant' || kind === 'always_met'),
      `invariant 3: ${finding.itemId} is inside a redundant or always-met group`
    ).toBe(false);
    if (finding.kind !== 'conflicting') {
      expect(
        above.includes('conflicting'),
        `invariant 3: ${finding.itemId} is inside a conflicting group`
      ).toBe(false);
    }
  }
}

/** The groups that hold each item, by item id, the innermost first */
function ancestorsOf(checked: CheckedBranch): Map<string, string[]> {
  const ancestors = new Map<string, string[]>();
  const visit = (items: CheckedItem[], above: string[]) => {
    for (const item of items) {
      ancestors.set(item.id, above);
      if (item.type === 'group') {
        visit(item.items, [item.id, ...above]);
      }
    }
  };
  visit(checked.items, []);
  return ancestors;
}

// Hand-built branches

/** The day of the spec's edge cases */
const TODAY = '2026-10-28';

/** A clock that never reaches the deadline */
const IN_TIME: CheckOptions = { deadline: Number.POSITIVE_INFINITY, now: () => 0 };

const HEIGHT = target('mdl', 'height');
const SEX = target('pid', 'sex');
const BIRTH = target('pid', 'birthdate');
const NAME = target('pid', 'family_name');

function on(number: number, ruleTarget: RuleTarget, condition: Condition): RuleItem {
  return rule(number, ruleTarget, condition);
}

const taller = (number: number, value: number) =>
  on(number, HEIGHT, { operator: 'greater_than', value });
const shorter = (number: number, value: number) =>
  on(number, HEIGHT, { operator: 'less_than', value });
const notHeight = (number: number, value: number) =>
  on(number, HEIGHT, { operator: 'not_equal_to', value });
const sexOneOf = (number: number, ...values: number[]) =>
  on(number, SEX, { operator: 'includes_one_of', values });
/** No citizen meets it: every citizen has one of the set's codes */
const noSex = (number: number) =>
  on(number, SEX, { operator: 'includes_none_of', values: [0, 1, 2] });
/** No citizen meets it: no date is before the first date the evaluator reads */
const bornBeforeTime = (number: number) =>
  on(number, BIRTH, { operator: 'before', date: '0001-01-01' });

function group(number: number, items: RuleTreeItem[], operator: Combinator = 'and'): GroupItem {
  return {
    type: 'group',
    id: `group-${number}`,
    name: `Group ${String(number).padStart(2, '0')}`,
    mark: null,
    operator,
    message: null,
    items,
  };
}

/** The checked tree of a main branch with these items at a top level combined with `operator` */
function checkedOf(
  items: RuleTreeItem[],
  operator: Combinator = 'and',
  key = 'branch-1'
): CheckedBranch {
  const branch: BranchInput = { ...mainBranch(items), operator };
  return buildCheckedBranch({ ...branch, key }, CONTEXT, TODAY);
}

function check(items: RuleTreeItem[], operator: Combinator = 'and'): BranchCheck {
  return checkBranch(checkedOf(items, operator), IN_TIME);
}

/** A conflicting finding with these items as its reason */
function withItems(itemId: string, items: string[], today = false): ItemFinding {
  return { itemId, kind: 'conflicting', reason: { type: 'with', items }, today };
}

function rules(count: number, from = 1): string[] {
  return Array.from({ length: count }, (_, index) => `rule-${from + index}`);
}

describe('checkBranch: a branch without checked rules (W13)', () => {
  it('has no notice and no findings, and counts no rules', () => {
    const result = check([]);
    expect(result).toEqual({
      branchKey: 'branch-1',
      fingerprint: checkedOf([]).fingerprint,
      complete: true,
      notice: null,
      findings: [],
      checkedRules: 0,
    });
  });

  it('counts the rules checked, in groups too, and not those left out', () => {
    const incomplete = rule(9, HEIGHT, { operator: 'greater_than', value: null });
    const result = check([taller(1, 100), group(1, [sexOneOf(2, 1), shorter(3, 200)]), incomplete]);
    expect(result).toMatchObject({ complete: true, notice: null, findings: [], checkedRules: 3 });
  });
});

describe('checkBranch, step 1: no citizen can meet the branch (FR-004, FR-008)', () => {
  it('gives the notice when no citizen can meet the top level today, nor later', () => {
    expect(check([taller(1, 180), shorter(2, 150)]).notice).toEqual({
      kind: 'none_can_meet',
      today: false,
    });
  });

  it('adds "who shares today" when a later day could meet it (EC-7)', () => {
    const result = check([
      on(1, BIRTH, { operator: 'after', date: '2010-01-01' }),
      on(2, BIRTH, { operator: 'at_least_years_ago', years: 21 }),
    ]);
    expect(result.notice).toEqual({ kind: 'none_can_meet', today: true });
  });

  it('gives none while the branch can be met, also in a top level combined with OR', () => {
    expect(check([taller(1, 180), sexOneOf(2, 1)]).notice).toBeNull();
    expect(check([group(1, [taller(1, 180), shorter(2, 150)]), sexOneOf(3, 1)], 'or').notice).toBe(
      null
    );
  });
});

describe('checkBranch, step 2: conflicts (FR-003)', () => {
  it('marks two rules that exclude each other, each naming the other (US1-AS1)', () => {
    const result = check([taller(1, 180), shorter(2, 150), sexOneOf(3, 1)]);
    expect(result.findings).toEqual([
      withItems('rule-1', ['rule-2']),
      withItems('rule-2', ['rule-1']),
    ]);
    expect(result.complete).toBe(true);
  });

  it('names a smallest set, ties going to the earlier items in display order', () => {
    const result = check([taller(1, 100), shorter(2, 50), shorter(3, 40)]);
    expect(result.findings).toEqual([
      withItems('rule-1', ['rule-2']),
      withItems('rule-2', ['rule-1']),
      withItems('rule-3', ['rule-1']),
    ]);
  });

  it('names every other rule of four that only together can’t be met (EC-11)', () => {
    // Only 11 and 12 are greater than 10 and less than 13, and each is excluded by one rule
    const result = check([taller(1, 10), shorter(2, 13), notHeight(3, 11), notHeight(4, 12)]);
    const ids = rules(4);
    expect(result.findings).toEqual(
      ids.map((id) =>
        withItems(
          id,
          ids.filter((other) => other !== id)
        )
      )
    );
  });

  it('reads the AND-context along the path to the top level, but not the alternatives', () => {
    // Top level AND: Rule 01, Group 01 (AND: Rule 02, Group 02 (OR: Rule 03, Rule 04))
    const result = check([
      taller(1, 180),
      group(1, [sexOneOf(2, 1), group(2, [shorter(3, 150), shorter(4, 140)], 'or')]),
    ]);
    expect(result.notice).toEqual({ kind: 'none_can_meet', today: false });
    expect(result.findings).toEqual([
      withItems('rule-1', ['group-1']),
      withItems('group-1', ['rule-1']),
      withItems('group-2', ['rule-1']),
      withItems('rule-3', ['rule-1']),
      withItems('rule-4', ['rule-1']),
    ]);
  });

  it('marks no item in an OR level for what its alternatives can’t be met with', () => {
    // Rule 02's alternative Rule 03 can't be met with Rule 01, but Rule 02 can: Group 01 can be met
    const result = check([taller(1, 180), group(1, [sexOneOf(2, 1), shorter(3, 150)], 'or')]);
    expect(result.findings).toEqual([withItems('rule-3', ['rule-1'])]);
    expect(result.notice).toBeNull();
  });

  it('marks a group that can’t be met on its own with the smallest set of its members (F6)', () => {
    const result = check(
      [group(1, [sexOneOf(1, 1), taller(2, 180), shorter(3, 150)]), sexOneOf(4, 2)],
      'or'
    );
    expect(result.findings).toEqual([
      {
        itemId: 'group-1',
        kind: 'conflicting',
        reason: { type: 'members', operator: 'and', items: ['rule-2', 'rule-3'] },
        today: false,
      },
      withItems('rule-2', ['rule-3']),
      withItems('rule-3', ['rule-2']),
    ]);
    expect(result.notice).toBeNull();
  });

  it('marks an OR group none of whose members can be met with all of them, each on its own', () => {
    const result = check([group(1, [noSex(1), bornBeforeTime(2)], 'or'), sexOneOf(3, 1)]);
    expect(result.findings).toEqual([
      {
        itemId: 'group-1',
        kind: 'conflicting',
        reason: { type: 'members', operator: 'or', items: ['rule-1', 'rule-2'] },
        today: false,
      },
      { itemId: 'rule-1', kind: 'conflicting', reason: { type: 'condition' }, today: false },
      { itemId: 'rule-2', kind: 'conflicting', reason: { type: 'condition' }, today: false },
    ]);
  });

  it('never marks an item only because something it is combined with can’t be met on its own', () => {
    // Rule 02 reads the sex, as Rule 01 does, which no citizen can meet
    const result = check([noSex(1), sexOneOf(2, 1), group(1, [noSex(3), taller(4, 100)])]);
    expect(result.notice).toEqual({ kind: 'none_can_meet', today: false });
    expect(result.findings).toEqual([
      { itemId: 'rule-1', kind: 'conflicting', reason: { type: 'condition' }, today: false },
      {
        itemId: 'group-1',
        kind: 'conflicting',
        reason: { type: 'members', operator: 'and', items: ['rule-3'] },
        today: false,
      },
      { itemId: 'rule-3', kind: 'conflicting', reason: { type: 'condition' }, today: false },
    ]);
  });

  it('marks a conflict with a licence class’s date through the classes (US2-AS4)', () => {
    const result = check([
      on(1, target('mdl', 'driving_privileges', 'classes'), {
        operator: 'includes_none_of',
        values: ['B'],
      }),
      on(2, target('mdl', 'driving_privileges', 'issue_date', 'B'), {
        operator: 'at_least_years_ago',
        years: 2,
      }),
    ]);
    expect(result.findings).toEqual([
      withItems('rule-1', ['rule-2']),
      withItems('rule-2', ['rule-1']),
    ]);
  });
});

describe('checkBranch: the today flag (FR-008)', () => {
  it('is set when the finding’s set can be met on a later day (EC-7)', () => {
    const result = check([
      on(1, BIRTH, { operator: 'after', date: '2010-01-01' }),
      on(2, BIRTH, { operator: 'at_least_years_ago', years: 21 }),
      on(3, BIRTH, { operator: 'before', date: '2000-01-01' }),
    ]);
    expect(result.findings).toEqual([
      withItems('rule-1', ['rule-2'], true),
      withItems('rule-2', ['rule-1'], true),
      // Born after 2010 and before 2000: on no day
      withItems('rule-3', ['rule-1']),
    ]);
  });

  it('is set for a rule that can be met on its own on a later day only', () => {
    const result = check([on(1, BIRTH, { operator: 'at_least_years_ago', years: 2100 })]);
    expect(result.findings).toEqual([
      { itemId: 'rule-1', kind: 'conflicting', reason: { type: 'condition' }, today: true },
    ]);
    expect(result.notice).toEqual({ kind: 'none_can_meet', today: true });
  });

  it('is set for a group whose members named can be met together on a later day', () => {
    const result = check(
      [
        group(1, [
          on(1, BIRTH, { operator: 'after', date: '2010-01-01' }),
          on(2, BIRTH, { operator: 'at_least_years_ago', years: 21 }),
        ]),
        sexOneOf(3, 1),
      ],
      'or'
    );
    expect(result.findings[0]).toEqual({
      itemId: 'group-1',
      kind: 'conflicting',
      reason: { type: 'members', operator: 'and', items: ['rule-1', 'rule-2'] },
      today: true,
    });
  });
});

// Steps 3 and 4

const heightIs = (number: number, value: number) =>
  on(number, HEIGHT, { operator: 'equal_to', value });
/** Every citizen meets it: heights are whole numbers */
const anyHeight = (number: number) => notHeight(number, 20.5);

const ALL_MEET = { kind: 'all_meet', today: false };

function redundant(itemId: string, reason: RedundantReason): ItemFinding {
  return { itemId, kind: 'redundant', reason, today: false };
}

function impliedBy(itemId: string, items: string[], orItems: string[] = []): ItemFinding {
  return redundant(itemId, { type: 'implied_by', items, orItems });
}

function implies(itemId: string, items: string[], givenItems: string[] = []): ItemFinding {
  return redundant(itemId, { type: 'implies', items, givenItems });
}

function same(itemId: string, item: string): ItemFinding {
  return redundant(itemId, { type: 'same', item });
}

function alwaysMet(itemId: string): ItemFinding {
  return { itemId, kind: 'always_met', reason: null, today: false };
}

describe('checkBranch, step 3: every citizen meets the branch (FR-006, FR-008)', () => {
  it('gives the notice when no citizen fails the top level on any day from today on', () => {
    const result = check([anyHeight(1)]);
    expect(result).toMatchObject({ complete: true, notice: ALL_MEET });
    expect(result.findings).toEqual([alwaysMet('rule-1')]);
  });

  it('gives it for a top level combined with OR that one item makes always met', () => {
    const result = check([taller(1, 180), anyHeight(2)], 'or');
    expect(result.notice).toEqual(ALL_MEET);
    // Rule 01 makes no difference beside Rule 02, which every citizen meets
    expect(result.findings).toEqual([implies('rule-1', ['rule-2']), alwaysMet('rule-2')]);
  });

  it('gives none while some citizen fails the branch', () => {
    expect(check([taller(1, 100), anyHeight(2)]).notice).toBeNull();
  });

  it('gives none when every citizen meets the branch today but not on a later day', () => {
    // Born before 2024, or less than 5 years ago: everyone today, but from 2029 on, those born in
    // 2024 meet neither
    const result = check([
      group(
        1,
        [
          on(1, BIRTH, { operator: 'before', date: '2024-01-01' }),
          on(2, BIRTH, { operator: 'less_than_years_ago', years: 5 }),
        ],
        'or'
      ),
    ]);
    expect(result).toMatchObject({ complete: true, notice: null, findings: [] });
  });
});

describe('checkBranch, step 4: always met (FR-006)', () => {
  it('marks a rule that every citizen meets, in a level combined with AND', () => {
    const result = check([taller(1, 100), anyHeight(2)]);
    expect(result.findings).toEqual([alwaysMet('rule-2')]);
  });

  it('marks a group that every citizen meets, and nothing inside it', () => {
    // Taller than 100 or shorter than 101; Rule 03 would otherwise make no difference beside …
    const result = check([sexOneOf(1, 1), group(1, [taller(2, 100), shorter(3, 101)], 'or')]);
    expect(result.findings).toEqual([alwaysMet('group-1')]);
  });

  it('marks nothing inside an always-met group, even a duplicate', () => {
    const result = check([sexOneOf(1, 1), group(1, [anyHeight(2), anyHeight(3)])]);
    expect(result.findings).toEqual([alwaysMet('group-1')]);
  });

  it('marks nothing that every citizen meets today only (FR-008)', () => {
    const result = check([
      sexOneOf(1, 1),
      group(
        2,
        [
          on(2, BIRTH, { operator: 'before', date: '2024-01-01' }),
          on(3, BIRTH, { operator: 'less_than_years_ago', years: 5 }),
        ],
        'or'
      ),
    ]);
    expect(result.findings).toEqual([]);
  });
});

describe('checkBranch, step 4: redundant (FR-005)', () => {
  it('marks a rule that another implies in a level combined with AND (implied_by)', () => {
    expect(check([taller(1, 180), taller(2, 150)]).findings).toEqual([
      impliedBy('rule-2', ['rule-1']),
    ]);
    // The earlier rule, when it is the one implied
    expect(check([taller(1, 150), taller(2, 180)]).findings).toEqual([
      impliedBy('rule-1', ['rule-2']),
    ]);
  });

  it('names a smallest set of the AND-context that implies the item', () => {
    // Greater than 10 and less than 12: only 11
    const result = check([taller(1, 10), sexOneOf(4, 1), shorter(2, 12), heightIs(3, 11)]);
    expect(result.findings).toEqual([impliedBy('rule-3', ['rule-1', 'rule-2'])]);
  });

  it('names the AND-context along the path to the top level', () => {
    const result = check([taller(1, 180), group(1, [sexOneOf(2, 1), taller(3, 150)])]);
    expect(result.findings).toEqual([impliedBy('rule-3', ['rule-1'])]);
  });

  it('marks the later of two rules with the same check (same), and only that one', () => {
    expect(check([taller(1, 180), taller(2, 180)]).findings).toEqual([same('rule-2', 'rule-1')]);
    expect(check([taller(1, 180), taller(2, 180)], 'or').findings).toEqual([
      same('rule-2', 'rule-1'),
    ]);
  });

  it('marks every later copy, each the same as the first, in the working tree', () => {
    const result = check([taller(1, 180), taller(2, 180), taller(3, 180)]);
    expect(result.findings).toEqual([same('rule-2', 'rule-1'), same('rule-3', 'rule-1')]);
  });

  it('marks a rule that implies another in a level combined with OR (implies)', () => {
    expect(check([taller(1, 150), taller(2, 180)], 'or').findings).toEqual([
      implies('rule-2', ['rule-1']),
    ]);
  });

  it('names a smallest set of the siblings that the item implies', () => {
    // Sex 1 or 2 is sex 1 or sex 2
    const result = check([sexOneOf(1, 1), taller(2, 180), sexOneOf(3, 2), sexOneOf(4, 1, 2)], 'or');
    expect(result.findings).toEqual([implies('rule-4', ['rule-1', 'rule-3'])]);
  });

  it('marks a redundant group, and nothing inside it', () => {
    // Rule 03 has the same check as Rule 02, inside the group
    const result = check([taller(1, 180), group(1, [taller(2, 150), taller(3, 150)], 'or')]);
    expect(result.findings).toEqual([impliedBy('group-1', ['rule-1'])]);
  });

  it('reasons through an enclosing OR level in a level combined with AND (orItems)', () => {
    // Top OR: Group 01 (AND: sex 1 or 2, sex 1), sex 2. Rule 02 makes no difference: a citizen
    // who meets Rule 01 and not Rule 03 has sex 1
    const result = check([group(1, [sexOneOf(1, 1, 2), sexOneOf(2, 1)]), sexOneOf(3, 2)], 'or');
    expect(result.findings).toEqual([impliedBy('rule-2', ['rule-1'], ['rule-3'])]);
  });

  it('reasons through an enclosing AND level in a level combined with OR (givenItems)', () => {
    // Top AND: sex 0 or 1, Group 01 (OR: sex 1, sex 1 or 2). Rule 03 makes no difference given
    // Rule 01; once it is deleted, Group 01 is Rule 02, which implies Rule 01
    const result = check([sexOneOf(1, 0, 1), group(1, [sexOneOf(2, 1), sexOneOf(3, 1, 2)], 'or')]);
    expect(result.findings).toEqual([
      impliedBy('rule-1', ['rule-2']),
      implies('rule-3', ['rule-2'], ['rule-1']),
    ]);
  });

  it('reads the working tree: a group left with one member is that member', () => {
    // Rule 03 is the same as Rule 02; Group 01 is then Rule 02, the top level's sibling of Rule 01
    const result = check([sexOneOf(1, 1), group(1, [taller(2, 180), taller(3, 180)], 'or')]);
    expect(result.findings).toEqual([same('rule-3', 'rule-2')]);
  });

  it('never marks the top level’s only item, which is redundant only when always met', () => {
    expect(check([taller(1, 180)]).findings).toEqual([]);
    expect(check([taller(1, 180)], 'or').findings).toEqual([]);
    // Once Rule 02 is deleted, Group 01 is Rule 01, the only item left
    expect(check([group(1, [taller(1, 180), taller(2, 180)])]).findings).toEqual([
      same('rule-2', 'rule-1'),
    ]);
  });

  it('marks nothing that is implied today but not on every later day (FR-008)', () => {
    // Born after 2009 is less than 18 years ago today, but not from 2027 on
    const result = check([
      on(1, BIRTH, { operator: 'after', date: '2009-01-01' }),
      on(2, BIRTH, { operator: 'less_than_years_ago', years: 18 }),
    ]);
    expect(result).toMatchObject({ complete: true, notice: null, findings: [] });
  });
});

describe('checkBranch, step 4: what isn’t reported (FR-005, W4)', () => {
  it('reports nothing but conflicts in a branch that no citizen can meet', () => {
    // Rule 04 has the same check as Rule 03
    const result = check([taller(1, 180), shorter(2, 150), sexOneOf(3, 1), sexOneOf(4, 1)]);
    expect(result.notice).toEqual({ kind: 'none_can_meet', today: false });
    expect(result.findings).toEqual([
      withItems('rule-1', ['rule-2']),
      withItems('rule-2', ['rule-1']),
    ]);
  });

  it('reports no redundancy for a conflicting item', () => {
    // Rule 03 implies Rule 02 in the OR group, but both conflict with Rule 01
    const result = check([
      taller(1, 180),
      group(1, [shorter(2, 150), shorter(3, 140), sexOneOf(4, 1)], 'or'),
    ]);
    expect(result).toMatchObject({ complete: true, notice: null });
    expect(result.findings).toEqual([
      withItems('rule-2', ['rule-1']),
      withItems('rule-3', ['rule-1']),
    ]);
  });

  it('reports no redundancy inside a conflicting group', () => {
    // Rule 04 has the same check as Rule 03
    const result = check(
      [group(1, [taller(1, 180), shorter(2, 150), sexOneOf(3, 1), sexOneOf(4, 1)]), sexOneOf(5, 2)],
      'or'
    );
    expect(result.notice).toBeNull();
    expect(result.findings).toEqual([
      {
        itemId: 'group-1',
        kind: 'conflicting',
        reason: { type: 'members', operator: 'and', items: ['rule-1', 'rule-2'] },
        today: false,
      },
      withItems('rule-1', ['rule-2']),
      withItems('rule-2', ['rule-1']),
    ]);
  });

  it('gives a group that holds a conflicting item no finding, but visits its members', () => {
    // Group 01 is always met through Rule 03, and holds Rule 02, which conflicts with Rule 01
    const result = check([taller(1, 180), group(1, [shorter(2, 150), anyHeight(3)], 'or')]);
    expect(result.findings).toEqual([withItems('rule-2', ['rule-1']), alwaysMet('rule-3')]);
  });
});

describe('checkBranch: certainty (FR-010)', () => {
  /** A text field mixing letter case with "contains", which the text theory can't decide (R7) */
  const UNDECIDED = [
    on(1, NAME, { operator: 'contains', value: 'Stutt', match_case: true }),
    on(2, NAME, { operator: 'not_contains', value: 'stutt', match_case: false }),
  ];

  it("keeps the certain findings and isn't complete after an 'unknown' answer", () => {
    const result = check([...UNDECIDED, taller(3, 180), shorter(4, 150)]);
    expect(result.complete).toBe(false);
    expect(result.findings).toEqual([
      withItems('rule-3', ['rule-4']),
      withItems('rule-4', ['rule-3']),
    ]);
    // The branch can't be met whatever the text: an AND is refuted by one part
    expect(result.notice).toEqual({ kind: 'none_can_meet', today: false });
  });

  it("gives no notice when whether the branch can be met is 'unknown'", () => {
    const result = check([...UNDECIDED, taller(3, 180)]);
    expect(result).toMatchObject({ complete: false, notice: null, findings: [] });
  });

  it("reports no redundancy for an item whose conflict answer is 'unknown', nor inside it", () => {
    // Without the text rules, Group 01 implies Rule 06 and Rule 04 is the same as Rule 03
    const rest = [sexOneOf(3, 1), sexOneOf(4, 1), taller(5, 200)];
    expect(check([group(1, rest), taller(6, 180)], 'or')).toMatchObject({
      complete: true,
      findings: [implies('group-1', ['rule-6'])],
    });
    const result = check([group(1, [...UNDECIDED, ...rest]), taller(6, 180)], 'or');
    expect(result).toMatchObject({ complete: false, notice: null, findings: [] });
  });

  it('stops at the deadline, keeping the certain findings it made so far', () => {
    const checked = checkedOf([
      taller(1, 180),
      shorter(2, 150),
      group(1, [sexOneOf(3, 1), sexOneOf(4, 2)]),
      group(2, [noSex(5), taller(6, 100)], 'or'),
      notHeight(7, 160),
    ]);
    const full = checkBranch(checked, IN_TIME);
    expect(full.complete).toBe(true);
    expect(full.findings.length).toBeGreaterThan(3);
    const { result: timed, readings: fullReadings } = withClock(checked, Number.POSITIVE_INFINITY);
    expect(timed).toEqual(full);
    const lengths = new Set<number>();
    for (let deadline = 0; deadline < fullReadings; deadline += 1) {
      const { result, readings } = withClock(checked, deadline);
      expect(result.complete).toBe(false);
      // The clock is read once more past the deadline at most, before the run returns
      expect(readings).toBeLessThanOrEqual(deadline + 2);
      expectPartOf(result, full);
      lengths.add(result.findings.length);
    }
    // Some cuts keep findings, and none keeps them all
    expect(lengths.size).toBeGreaterThan(2);
    expect(Math.max(...lengths)).toBeLessThanOrEqual(full.findings.length);
  });

  it('answers without a question once the deadline has passed at the start', () => {
    const result = checkBranch(checkedOf([taller(1, 180), shorter(2, 150)]), {
      deadline: 0,
      now: () => 0,
    });
    expect(result).toMatchObject({ complete: false, notice: null, findings: [], checkedRules: 2 });
  });

  it('settles for a minimal set past the budget of questions, still a true reason', () => {
    // Greater than 10, less than 20, and not 11 to 19: each needs all ten others
    const items = [taller(1, 10), shorter(2, 20)];
    for (let value = 11; value <= 19; value += 1) {
      items.push(notHeight(value - 8, value));
    }
    const result = check(items);
    const ids = rules(11);
    expect(result.complete).toBe(true);
    expect(result.findings).toEqual(
      ids.map((id) =>
        withItems(
          id,
          ids.filter((other) => other !== id)
        )
      )
    );
  });
  it('takes the candidates that can be met together, in display order, past the budget', () => {
    // As above, with Rule 12 (greater than 500), which can't be met with Rule 02
    const items = [taller(1, 10), shorter(2, 20)];
    for (let value = 11; value <= 19; value += 1) {
      items.push(notHeight(value - 8, value));
    }
    const result = check([...items, taller(12, 500)]);
    expect(result.complete).toBe(true);
    expect(result.findings[0]).toEqual(withItems('rule-1', rules(10, 2)));
    expect(result.findings.at(-1)).toEqual(withItems('rule-12', ['rule-2']));
  });
});

describe('checkBranch: determinism', () => {
  it('gives equal results for equal fingerprints, whatever ran before', () => {
    const items = [taller(1, 180), shorter(2, 150), group(1, [sexOneOf(3, 1), noSex(4)], 'or')];
    const first = checkBranch(checkedOf(items), IN_TIME);
    check([taller(1, 100), shorter(2, 50)]);
    const renamedItems = renameItem(items, 'rule-1', 'Tall enough')?.items ?? [];
    const renamed = checkedOf(renamedItems, 'and', 'branch-2');
    expect(renamed.fingerprint).toBe(first.fingerprint);
    expect(checkBranch(renamed, IN_TIME)).toEqual({ ...first, branchKey: 'branch-2' });
  });

  it('leaves the checked tree as it is', () => {
    const checked = checkedOf([taller(1, 180), group(1, [shorter(2, 150), noSex(3)], 'or')]);
    const copy = structuredClone(checked);
    checkBranch(checked, IN_TIME);
    expect(checked).toEqual(copy);
  });
});

// Against the oracle

/** The seeded branches compared with the oracle */
const SEEDS = 300;

/** The AND-context sets of up to this many items are searched whole within the budget */
const SEARCHED_WHOLE = 6;

/** Time for the whole loop: about 4 s alone on eight cores, more on a shared machine */
const SEEDS_TIMEOUT_MS = 60_000;

describe(`checkBranch against the oracle, for ${SEEDS} seeded branches`, () => {
  it(
    'reports exactly the conflicts and the notices, with smallest reasons, and true redundancies',
    () => {
      const reasons = new Map<string, number>();
      let incomplete = 0;
      for (let seed = 1; seed <= SEEDS; seed += 1) {
        const branch = randomBranch(seed);
        const checked = checkedBranchOf(branch);
        const result = checkBranch(checked, IN_TIME);
        withSeed(seed, () => compareWithOracle(checked, oracleOf(branch), result));
        for (const finding of result.findings) {
          const key = `${finding.reason?.type ?? finding.kind}${finding.today ? ', today' : ''}`;
          reasons.set(key, (reasons.get(key) ?? 0) + 1);
        }
        if (result.notice) {
          reasons.set(result.notice.kind, (reasons.get(result.notice.kind) ?? 0) + 1);
        }
        incomplete += result.complete ? 0 : 1;
        // Deterministic: the same branch again
        expect(checkBranch(checkedBranchOf(branch), IN_TIME)).toEqual(result);
      }
      // Every reason occurs, and the text theory's 'unknown' is rare
      const occurring = ['with', 'with, today', 'members', 'condition'];
      occurring.push('always_met', 'all_meet', 'same', 'implied_by', 'implies');
      for (const key of occurring) {
        expect(reasons.get(key) ?? 0, key).toBeGreaterThan(0);
      }
      expect(incomplete).toBeLessThan(SEEDS / 20);
    },
    SEEDS_TIMEOUT_MS
  );
});

/** An item of a checked tree with its AND-context and its members */
interface Placed {
  item: CheckedItem;
  context: string[];
  members: string[];
}

/** Every item, top-down in display order, with its AND-context in display order */
function placedOf(checked: CheckedBranch): Placed[] {
  const placed: Placed[] = [];
  const order = new Map<string, number>();
  const visit = (items: CheckedItem[], operator: Combinator, outer: string[]) => {
    for (const item of items) {
      const siblings =
        operator === 'and' ? items.filter((each) => each !== item).map((each) => each.id) : [];
      const context = [...outer, ...siblings];
      order.set(item.id, order.size);
      placed.push({
        item,
        context,
        members: item.type === 'group' ? item.items.map((each) => each.id) : [],
      });
      if (item.type === 'group') {
        visit(item.items, item.operator, context);
      }
    }
  };
  visit(checked.items, checked.operator, []);
  for (const each of placed) {
    each.context.sort((first, second) => (order.get(first) ?? 0) - (order.get(second) ?? 0));
  }
  return placed;
}

/** The subsets of `pool` of `size` items, in lexicographic order */
function subsetsOf(pool: string[], size: number): string[][] {
  if (size === 0) {
    return [[]];
  }
  return pool.flatMap((first, index) =>
    subsetsOf(pool.slice(index + 1), size - 1).map((rest) => [first, ...rest])
  );
}

/**
 * The result is sound: its notice and each finding are true, with a reason as research R8 gives
 * it. When it is complete, it is also complete: every conflicting item has its finding, with a
 * smallest reason where the search covers every set within its budget
 */
function compareWithOracle(checked: CheckedBranch, oracle: Oracle, result: BranchCheck): void {
  const today = ORACLE_TODAY_DAY;
  const meetable = oracle.canMeet([BRANCH], today);
  if (result.notice || result.complete) {
    const allMeet = meetable && oracle.alwaysMet([BRANCH], FROM_TODAY);
    expect(result.notice).toEqual(
      meetable
        ? allMeet
          ? { kind: 'all_meet', today: false }
          : null
        : { kind: 'none_can_meet', today: oracle.canMeet([BRANCH], LATER_DAYS) }
    );
  }
  expectDifferences(checked, oracle, result);
  const byItem = new Map(result.findings.map((finding) => [finding.itemId, finding]));
  expect(byItem.size).toBe(result.findings.length);
  const placed = placedOf(checked);
  expect(result.findings.map((finding) => finding.itemId)).toEqual(
    placed.map((each) => each.item.id).filter((id) => byItem.has(id))
  );
  for (const { item, context, members } of placed) {
    const finding = byItem.get(item.id);
    if (!finding && !result.complete) {
      continue;
    }
    if (!oracle.canMeet([item.id], today)) {
      expect(finding?.kind).toBe('conflicting');
      expect(finding?.reason).toMatchObject({
        type: item.type === 'rule' ? 'condition' : 'members',
      });
      if (finding?.reason?.type === 'members') {
        expectMembersReason(oracle, item, members, finding, result.complete);
      } else {
        expectToday(finding, [item.id], oracle, result.complete);
      }
      continue;
    }
    // The smallest T ⊆ A(X) that can be met while T ∧ X can't, the earliest of its size
    let smallest: string[] | null = null;
    for (let size = 1; size <= context.length && !smallest; size += 1) {
      smallest =
        subsetsOf(context, size).find(
          (set) => oracle.canMeet(set, today) && !oracle.canMeet([...set, item.id], today)
        ) ?? null;
    }
    if (!smallest) {
      expect(finding?.kind).not.toBe('conflicting');
      continue;
    }
    expect(finding?.reason?.type).toBe('with');
    const named = finding?.reason?.type === 'with' ? finding.reason.items : [];
    expect(named.every((id) => context.includes(id))).toBe(true);
    expect(oracle.canMeet(named, today)).toBe(true);
    expect(oracle.canMeet([...named, item.id], today)).toBe(false);
    expectToday(finding, [...named, item.id], oracle, result.complete);
    if (context.length <= SEARCHED_WHOLE && result.complete) {
      expect(named).toEqual(smallest);
    } else {
      // Minimal: without any of its items, the rest can be met with the item
      for (const left of named) {
        const rest = named.filter((each) => each !== left);
        expect(oracle.canMeet([...rest, item.id], today)).toBe(true);
      }
    }
  }
}

/**
 * The always-met and redundant findings hold (FR-005, FR-006): an always-met item is met by every
 * citizen on every day from today on; each redundant item, deleted from the working tree in the
 * order step 4 visits them, changes no outcome on any day from today on; and deleting them all at
 * once changes none either (SC-002). With `complete`, every always-met item that may be reported
 * has its finding
 */
function expectDifferences(checked: CheckedBranch, oracle: Oracle, result: BranchCheck): void {
  const byItem = new Map(result.findings.map((finding) => [finding.itemId, finding]));
  const redundant: string[] = [];
  for (const id of visitOrderOf(checked.items)) {
    const finding = byItem.get(id);
    if (finding?.kind === 'always_met') {
      expect(oracle.alwaysMet([id], FROM_TODAY), `${id} is always met`).toBe(true);
    } else if (finding?.kind === 'redundant') {
      expect(oracle.changedOutcome([id], FROM_TODAY, redundant), `${id} is redundant`).toBeNull();
      redundant.push(id);
    }
  }
  expect(oracle.changedOutcome(redundant, FROM_TODAY)).toBeNull();
  if (result.complete && result.notice?.kind !== 'none_can_meet') {
    const ancestors = ancestorsOf(checked);
    for (const id of oracle.itemIds) {
      const reportable = [id, ...(ancestors.get(id) ?? [])].every((each) => !byItem.has(each));
      if (reportable && oracle.alwaysMet([id], FROM_TODAY)) {
        // Unreported only when it holds a conflicting item: it has no finding then
        expect(conflictInside(id, ancestors, result), `${id} is always met`).toBe(true);
      }
    }
  }
}

/** Whether a conflicting item is inside the item */
function conflictInside(
  id: string,
  ancestors: Map<string, string[]>,
  result: BranchCheck
): boolean {
  return result.findings.some(
    (finding) => finding.kind === 'conflicting' && ancestors.get(finding.itemId)?.includes(id)
  );
}

/** The ids in the order step 4 visits them: from the last to the first, each group first */
function visitOrderOf(items: CheckedItem[]): string[] {
  return [...items]
    .reverse()
    .flatMap((item) => [item.id, ...(item.type === 'group' ? visitOrderOf(item.items) : [])]);
}

/**
 * The finding's `today`: whether its set can be met on a later day. An incomplete result may say
 * "who share today" where it couldn't tell, which is true either way
 */
function expectToday(
  finding: ItemFinding | undefined,
  set: string[],
  oracle: Oracle,
  complete: boolean
): void {
  const later = oracle.canMeet(set, LATER_DAYS);
  if (complete || later) {
    expect(finding?.today).toBe(later);
  }
}

/** A group's members reason: an AND group's smallest set that can't be met, an OR's members */
function expectMembersReason(
  oracle: Oracle,
  item: CheckedItem,
  members: string[],
  finding: ItemFinding,
  complete: boolean
): void {
  const today = ORACLE_TODAY_DAY;
  const named = finding.reason?.type === 'members' ? finding.reason.items : [];
  if (item.type === 'group' && item.operator === 'or') {
    expect(named).toEqual(members);
    expectToday(finding, [item.id], oracle, complete);
    return;
  }
  expect(oracle.canMeet(named, today)).toBe(false);
  expectToday(finding, named, oracle, complete);
  let smallest: string[] | undefined;
  for (let size = 1; size <= members.length && !smallest; size += 1) {
    smallest = subsetsOf(members, size).find((set) => !oracle.canMeet(set, today));
  }
  if (complete) {
    expect(named).toEqual(smallest);
  }
}

// The clock

/** A run with a clock that advances by one at each reading */
function withClock(checked: CheckedBranch, deadline: number) {
  let readings = 0;
  const now = () => {
    readings += 1;
    return readings - 1;
  };
  const result = checkBranch(checked, { deadline, now });
  return { result, readings };
}

/**
 * A cut run's result is part of the full run's: each of its findings, and its notice, is the full
 * run's, or the same with `today` set where answering it was cut short
 */
function expectPartOf(cut: BranchCheck, full: BranchCheck): void {
  const fullById = new Map(full.findings.map((finding) => [finding.itemId, finding]));
  for (const finding of cut.findings) {
    const expected = fullById.get(finding.itemId);
    expect(expected).toBeDefined();
    if (finding.today && !expected?.today) {
      expect({ ...finding, today: false }).toEqual(expected);
    } else {
      expect(finding).toEqual(expected);
    }
  }
  if (cut.notice) {
    expect(cut.notice.kind).toBe(full.notice?.kind);
  }
}
