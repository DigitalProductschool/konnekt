// The checks' time budgets (specs/003-rule-consistency-checks, SC-003, FR-010; research R10, R13),
// measured with the real clock, as the worker measures them (frontend/src/workers/checks.ts):
// - a generated branch of 50 rules, groups and sub-groups is checked within 1 second after at
//   least 95 % of a series of single-item changes;
// - a generated branch of 200 items built to be hard returns by the run's deadline, checked
//   completely or not;
// - 20 branches of 200 items stay within the run's 5 seconds when the deadline cuts them short.
//
// The branches are generated from testOracle.ts' seeded branches (`randomBranch()`), whose items
// are joined into one branch (`joinedBranch()`). The hard one adds the pigeonhole principle on the
// six single-valued country fields and four countries (`hardBranch()`): a tableau refutes it only
// by trying every assignment of countries, and research R8's smallest-set searches ask about it
// again for every item. A run is timed as the hook and the worker time it (research R10): from
// the change, through `buildCheckedBranch()` on the main thread, to `checkBranch()` with the
// worker's deadline, `WORKER_STOP_MS` after the change. There is no warm-up, since the hook may
// start a fresh worker for a run
import type {
  BranchInput,
  Combinator,
  GroupItem,
  NumberingBase,
  RuleItem,
  RuleTarget,
  RuleTreeItem,
} from '@konnekt/api-types/form-connections';
import { describe, expect, it } from 'vitest';

import { mainBranch, MDL, PID, rule, target } from '../testData';
import {
  addRule,
  defaultGroupName,
  defaultRuleName,
  deleteItem,
  duplicateRule,
  flattenItems,
  groupIdOf,
  ruleIdOf,
  setOperator,
  updateRule,
} from '../tree';
import type { RuleContext } from '../types';
import { buildCheckedBranch, type KeyedBranch } from './checkedTree';
import { RUN_DEADLINE_MS, WORKER_STOP_MS } from './constants';
import { checkBranch } from './findings';
import { ORACLE_CONTEXT, ORACLE_TODAY, randomBranch } from './testOracle';
import type { BranchCheck, CheckedBranch, CheckedItem } from './types';

// The budgets (SC-003)

/** The items of the branch of the first budget, and of the large ones (spec 002's limit) */
const SMALL_ITEMS = 50;
const LARGE_ITEMS = 200;

/** The single-item changes of the first budget's series */
const CHANGES = 60;

/** The time after a change within which the findings update, and in how many of the changes */
const UPDATE_MS = 1000;
const SHARE_IN_TIME = 0.95;

/** The branches of the third budget, checked in one run */
const BRANCHES = 20;

/** Vitest's time for each case: the series, and a run that the deadline cuts short */
const SERIES_TIMEOUT_MS = 120_000;
const RUN_TIMEOUT_MS = 30_000;

/** The worker's clock (frontend/src/workers/checks.ts) */
function now(): number {
  return performance.timeOrigin + performance.now();
}

// A run

/** A branch of the rules step's state, as `buildCheckedBranch()` reads it */
type Branch = BranchInput & KeyedBranch;

/** What one run gave: each branch's result, and the milliseconds from the change to the last */
interface TimedRun {
  results: BranchCheck[];
  elapsed: number;
}

/**
 * The branches checked in one run after a change: their checked trees built, then each branch
 * checked in turn against the deadline that the hook gives the worker
 */
function timedRun(branches: readonly Branch[], context: RuleContext): TimedRun {
  const start = now();
  const checked = branches.map((branch) => buildCheckedBranch(branch, context, ORACLE_TODAY));
  const options = { deadline: start + WORKER_STOP_MS, now };
  const results = checked.map((each) => checkBranch(each, options));
  return { results, elapsed: now() - start };
}

// The generated branches

/** Rules, groups and sub-groups among the items, at every level */
function itemCount(items: readonly (RuleTreeItem | CheckedItem)[]): number {
  return items.reduce(
    (count, item) => count + 1 + (item.type === 'group' ? itemCount(item.items) : 0),
    0
  );
}

/** The item with new ids and default names from `numbering`, and no mark, its members too */
function renumbered(item: RuleTreeItem, numbering: NumberingBase): RuleTreeItem {
  if (item.type === 'rule') {
    numbering.rule += 1;
    const number = numbering.rule;
    return { ...item, id: ruleIdOf(number), name: defaultRuleName(number), mark: null };
  }
  numbering.group += 1;
  const number = numbering.group;
  return {
    ...item,
    id: groupIdOf(number),
    name: defaultGroupName(number),
    mark: null,
    items: item.items.map((member) => renumbered(member, numbering)),
  };
}

/**
 * The top-level items of `randomBranch()`'s seeds from `firstSeed` on, renumbered, until they hold
 * exactly `size` rules, groups and sub-groups: each seed's top-level items in turn, skipping those
 * that would make too many. Every rule is complete and on a field of `ORACLE_CONTEXT`, and the
 * groups are at most three levels deep, as in the seeds' branches
 */
function joinedItems(size: number, firstSeed: number, numbering: NumberingBase): RuleTreeItem[] {
  const items: RuleTreeItem[] = [];
  let count = 0;
  for (let seed = firstSeed; count < size; seed += 1) {
    for (const item of randomBranch(seed).items) {
      const added = itemCount([item]);
      if (count + added <= size) {
        items.push(renumbered(item, numbering));
        count += added;
      }
    }
  }
  return items;
}

/** The main branch with `size` items joined from the seeds from `firstSeed` on */
function joinedBranch(size: number, operator: Combinator, firstSeed: number): Branch {
  const items = joinedItems(size, firstSeed, { rule: 0, group: 0 });
  return { ...mainBranch(items), operator, key: `joined-${firstSeed}` };
}

/** The six single-valued country fields of backend/app/catalog.py */
const COUNTRY_FIELDS: readonly RuleTarget[] = [
  target('pid', 'address_country'),
  target('pid', 'issuing_country'),
  target('pid', 'place_of_birth', 'country'),
  target('mdl', 'nationality'),
  target('mdl', 'issuing_country'),
  target('mdl', 'resident_country'),
];

/** The countries the hard branch allows: fewer than the fields */
const ALLOWED_COUNTRIES = ['DE', 'AT', 'FR', 'IT'];

/**
 * testData.ts' documents, with the driving licence's issuing and resident country as
 * backend/app/catalog.py has them, `ORACLE_CONTEXT`'s value sets, and more countries than the
 * hard branch allows
 */
const CONTEXT: RuleContext = {
  documents: [
    PID,
    {
      ...MDL,
      fields: [
        ...MDL.fields,
        ...[
          ['issuing_country', 'Issuing country'],
          ['resident_country', 'Resident country'],
        ].map(([key, label]) => ({
          key,
          label,
          kind: 'enum' as const,
          option_set: 'countries',
          date_of_birth: false,
          parts: null,
          multiple_values: false,
        })),
      ],
    },
  ],
  optionSets: [
    ...ORACLE_CONTEXT.optionSets,
    {
      key: 'countries',
      options: [...ALLOWED_COUNTRIES, 'NL', 'BE', 'PL'].map((value) => ({
        value,
        label: value,
        description: null,
      })),
    },
  ],
};

/**
 * A branch of 200 items built to be hard (SC-003): each of the six country fields "includes one
 * of" the four allowed countries, and for each of those countries and each pair of the fields, a
 * group "the first includes none of it, or the second does" (186 items), then items joined from
 * the seeds from `fillerSeed` on. No citizen can meet it: six fields can't hold six different
 * countries out of four (the pigeonhole principle)
 */
function hardBranch(fillerSeed: number): Branch {
  const numbering: NumberingBase = { rule: 0, group: 0 };
  const countryRule = (field: RuleTarget, operator: string, values: string[]): RuleItem => {
    numbering.rule += 1;
    return rule(numbering.rule, field, { operator, values });
  };
  const items: RuleTreeItem[] = COUNTRY_FIELDS.map((field) =>
    countryRule(field, 'includes_one_of', ALLOWED_COUNTRIES)
  );
  for (const country of ALLOWED_COUNTRIES) {
    COUNTRY_FIELDS.forEach((first, index) => {
      for (const second of COUNTRY_FIELDS.slice(index + 1)) {
        numbering.group += 1;
        items.push({
          type: 'group',
          id: groupIdOf(numbering.group),
          name: defaultGroupName(numbering.group),
          mark: null,
          operator: 'or',
          message: null,
          items: [
            countryRule(first, 'includes_none_of', [country]),
            countryRule(second, 'includes_none_of', [country]),
          ],
        });
      }
    });
  }
  items.push(...joinedItems(LARGE_ITEMS - itemCount(items), fillerSeed, numbering));
  return { ...mainBranch(items), operator: 'and', key: `hard-${fillerSeed}` };
}

/** The branch has `size` items, and its checked tree holds every one of them */
function expectCheckedWhole(branch: Branch, size: number): void {
  const checked: CheckedBranch = buildCheckedBranch(branch, CONTEXT, ORACLE_TODAY);
  expect(itemCount(branch.items)).toBe(size);
  expect(checked.leftOut).toEqual([]);
  expect(itemCount(checked.items)).toBe(size);
}

// The series of single-item changes

/** The item at a spread-out place of the list for change `step` */
function pickOf<T>(items: readonly T[], step: number): T {
  return items[(step * 17 + 5) % items.length];
}

/** The value, which a change of the series must have found */
function defined<T>(value: T | null): T {
  if (value === null) {
    throw new Error('The change found no such item');
  }
  return value;
}

/** A rule of seed `seed`'s branch, whose field and condition a changed or added rule takes */
function seededRule(seed: number): RuleItem {
  const rules = flattenItems(randomBranch(seed).items).filter(
    (item): item is RuleItem => item.type === 'rule'
  );
  return pickOf(rules, seed);
}

/**
 * Change `step` of the series: one action of the rules step on one item. A rule's field and
 * condition changed, a rule added to a level, a level's AND/OR switched, a rule deleted, a rule
 * duplicated, a rule deleted. Adding and deleting alternate, so the branch keeps about its size
 */
function changed(branch: Branch, step: number, counters: NumberingBase): Branch {
  const all = flattenItems(branch.items);
  const rules = all.filter((item): item is RuleItem => item.type === 'rule');
  const groups = all.filter((item): item is GroupItem => item.type === 'group');
  // Every other round of six changes adds and switches on the top level, the others in a group
  const atTop = Math.floor(step / 6) % 2 === 0 || groups.length === 0;
  const group = atTop ? null : pickOf(groups, step);
  const fresh = seededRule(1000 + step);
  switch (step % 6) {
    case 0: {
      const id = pickOf(rules, step).id;
      const changes = { target: fresh.target, condition: fresh.condition };
      return { ...branch, items: defined(updateRule(branch.items, id, changes)).items };
    }
    case 1: {
      const number = counters.rule;
      counters.rule += 1;
      const added = { ...fresh, id: ruleIdOf(number), name: defaultRuleName(number) };
      return { ...branch, items: addRule(branch.items, added, group?.id ?? null) };
    }
    case 2: {
      const operator = (group ?? branch).operator === 'and' ? 'or' : 'and';
      return defined(setOperator(branch, group?.id ?? null, operator)).branch;
    }
    case 4: {
      const duplicated = defined(duplicateRule(branch.items, pickOf(rules, step).id, counters));
      counters.rule = duplicated.counters.rule;
      return { ...branch, items: duplicated.items };
    }
    default:
      return { ...branch, items: defined(deleteItem(branch.items, pickOf(rules, step).id)).items };
  }
}

describe('the time budgets of the checks (SC-003)', () => {
  it(
    `checks a ${SMALL_ITEMS}-item branch within 1 s after at least 95 % of single-item changes`,
    () => {
      let branch = joinedBranch(SMALL_ITEMS, 'and', 1);
      expectCheckedWhole(branch, SMALL_ITEMS);
      const counters: NumberingBase = { rule: 1000, group: 1000 };
      const elapsed: number[] = [];
      for (let step = 0; step < CHANGES; step += 1) {
        branch = changed(branch, step, counters);
        const { results, elapsed: time } = timedRun([branch], CONTEXT);
        expect(results[0].checkedRules).toBeGreaterThan(0);
        elapsed.push(time);
      }
      // The series kept the branch at about its size
      expect(Math.abs(itemCount(branch.items) - SMALL_ITEMS)).toBeLessThanOrEqual(5);
      const inTime = elapsed.filter((each) => each <= UPDATE_MS).length;
      expect(inTime, `ms per change: ${elapsed.map(Math.round).join(', ')}`).toBeGreaterThanOrEqual(
        Math.ceil(SHARE_IN_TIME * CHANGES)
      );
    },
    SERIES_TIMEOUT_MS
  );

  it(
    `returns by the deadline for a hard ${LARGE_ITEMS}-item branch, checked completely or not`,
    () => {
      const branch = hardBranch(1);
      expectCheckedWhole(branch, LARGE_ITEMS);
      const { results, elapsed } = timedRun([branch], CONTEXT);
      expect(elapsed).toBeLessThanOrEqual(RUN_DEADLINE_MS);
      // Step 1 finds that no citizen can meet it, before anything else is asked
      expect(results[0].notice?.kind).toBe('none_can_meet');
    },
    RUN_TIMEOUT_MS
  );

  it(
    `checks ${BRANCHES} branches of ${LARGE_ITEMS} items within the run's 5 s, cut short`,
    () => {
      // Joined branches, and a hard one as every fifth tab: the first four are checked in time
      const branches = Array.from({ length: BRANCHES }, (_, index) => {
        const seed = 100 * (index + 1);
        return index % 5 === 4
          ? hardBranch(seed)
          : joinedBranch(LARGE_ITEMS, index % 2 === 0 ? 'and' : 'or', seed);
      });
      branches.forEach((branch) => expectCheckedWhole(branch, LARGE_ITEMS));
      const { results, elapsed } = timedRun(branches, CONTEXT);
      expect(elapsed).toBeLessThanOrEqual(RUN_DEADLINE_MS);
      expect(results.map((result) => result.branchKey)).toEqual(
        branches.map((branch) => branch.key)
      );
      // The deadline cut the run short: the last branch wasn't reached, so it has no findings
      expect(elapsed).toBeGreaterThanOrEqual(WORKER_STOP_MS);
      expect(results[BRANCHES - 1]).toMatchObject({ complete: false, notice: null, findings: [] });
    },
    RUN_TIMEOUT_MS
  );
});
