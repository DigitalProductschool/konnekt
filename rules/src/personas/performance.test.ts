// The generation's and the results' time budgets (specs/004-rule-test-personas, SC-003; research
// R14, R16), measured with the real clock, as the worker and the hook measure them:
// - generation for branches of 50 items, groups and sub-groups ends within 1.5 seconds;
// - `testResultsOf()` for 3 personas × 20 branches × 200 items (spec 002's limits) takes under
//   100 ms;
// - a 200-item branch built to be hard returns by the run's deadline plus one solver step;
// - the vector search with 20 branches that differ stays within `GENERATION_STOP_MS` (R16).
//
// The branches are generated as in checks/performance.test.ts: testOracle.ts' seeded branches
// (`randomBranch()`), whose items are joined into one branch (`joinedBranch()`), and the hard one
// adds the pigeonhole principle on the six single-valued country fields and four countries
// (`hardBranch()`). A run is timed as the hook and the worker time it (research R9): from the
// request, through `checkedBranchesOf()` and `personaFieldsOf()` on the main thread, to
// `generatePersonas()` with the worker's deadline, `GENERATION_STOP_MS` after the request. There is
// no warm-up, since the hook may start a fresh worker for a run, and the results module is loaded
// once and then evaluates after every change, so its first call counts too
import type {
  BranchInput,
  Combinator,
  NumberingBase,
  RuleItem,
  RuleTarget,
  RuleTreeItem,
} from '@connection-portal/api-types/form-connections';
import { describe, expect, it } from 'vitest';

import { changeItem, newBranch } from '../branches';
import type { KeyedBranch } from '../checks/checkedTree';
import { ORACLE_CONTEXT, randomBranch } from '../checks/testOracle';
import type { CheckOptions } from '../checks/types';
import { mainBranch, MDL, PID, rule, target } from '../testData';
import { defaultGroupName, defaultRuleName, flattenItems, groupIdOf, ruleIdOf } from '../tree';
import type { RuleContext } from '../types';
import { GENERATION_STOP_MS, GENERATION_WATCHDOG_MS, PERSONA_IDS } from './constants';
import { generatePersonas } from './generation';
import { goalsOf } from './goals';
import { checkedBranchesOf, personaFieldsOf, testResultsOf } from './results';
import type { GenerationRequest, GenerationResult, Persona } from './types';

// The budgets (SC-003)

/** The test day, the date in Germany */
const TODAY = '2026-11-01';

/** The items of the first budget's branches, and of the large ones (spec 002's limit) */
const SMALL_ITEMS = 50;
const LARGE_ITEMS = 200;

/** The time within which generation for branches of 50 items ends */
const GENERATION_MS = 1500;

/** The branches of the results' budget and of the vector search (spec 002's limit) */
const BRANCHES = 20;

/** The time within which `testResultsOf()` evaluates 3 personas against every branch */
const RESULTS_MS = 100;

/** The calls of `testResultsOf()` timed, the first one included */
const RESULTS_CALLS = 5;

/**
 * The longest a run may go on past its deadline: one solver step. The solver reads the clock
 * before each question, before each theory call and every few search steps between
 * (checks/solver.ts), and generation starts nothing once the deadline has passed, so the
 * overshoot is the longest stretch between two clock reads plus returning the best set found. On
 * the hard branch it measured 0 to 27 ms with deadlines from 5 to 800 ms, with a load average of 2.5
 * to 8 on 4 cores. 100 ms leaves room for that load and stays a tenth of the margin
 * between the worker's stop and the hook's watchdog (`GENERATION_WATCHDOG_MS -
 * GENERATION_STOP_MS`), within which the answer must arrive
 */
const SOLVER_STEP_MS = 100;

/**
 * Short deadlines, from the request, that cut the hard branch's run while it plans: its runs
 * without a deadline took 250 to 1000 ms, so a deadline of 250 ms no longer cut each of them
 */
const SHORT_DEADLINES_MS = [25, 50, 100];

/** The seeds of the generation runs; each also picks the branches' seeds */
const SEEDS = [1, 7, 31, 100];

/** Vitest's time for each case */
const CASE_TIMEOUT_MS = 60_000;

/** The worker's clock (frontend/src/workers/personas.ts) */
function now(): number {
  return performance.timeOrigin + performance.now();
}

// A run

/** A branch of the rules step's state, as `checkedBranchesOf()` reads it */
type Branch = BranchInput & KeyedBranch;

/** What one run gave: the request, the answer, and the milliseconds from the request on */
interface TimedRun {
  request: GenerationRequest;
  result: GenerationResult;
  elapsed: number;
}

/** A request for `branches` with three free slots, built as the hook builds it */
function requestOf(branches: readonly Branch[], seed: number): GenerationRequest {
  return {
    seed,
    today: TODAY,
    branches: checkedBranchesOf(branches, CONTEXT, TODAY),
    fields: personaFieldsOf(branches, CONTEXT),
    context: CONTEXT,
    slots: PERSONA_IDS.map(() => ({ kind: 'free' as const, name: null, values: {} })),
  };
}

/**
 * One run for `branches`: the request built, then generation with the deadline that the hook
 * gives the worker, `stopMs` after the request
 */
function timedRun(branches: readonly Branch[], seed: number, stopMs: number): TimedRun {
  const start = now();
  const request = requestOf(branches, seed);
  const options: CheckOptions = { deadline: start + stopMs, now };
  const result = generatePersonas(request, options);
  return { request, result, elapsed: now() - start };
}

/** Every slot of the answer has a name and a value for every field (three free slots) */
function expectAnswered({ request, result }: TimedRun): void {
  expect(result.slots).toHaveLength(PERSONA_IDS.length);
  const keys = request.fields.map((field) => field.key).sort();
  for (const slot of result.slots) {
    expect(slot.name).toEqual(expect.any(String));
    expect(Object.keys(slot.values).sort()).toEqual(keys);
  }
}

/** The milliseconds, rounded, for an assertion's message */
function shown(times: readonly number[]): string {
  return times.map(Math.round).join(', ');
}

// The generated branches (as in checks/performance.test.ts)

/** Rules, groups and sub-groups among the items, at every level */
function itemCount(items: readonly RuleTreeItem[]): number {
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
 * exactly `size` rules, groups and sub-groups, skipping those that would make too many
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

/**
 * `main` and two variants based on it, as the test step usually sees them: each variant changes
 * one of the main branch's top-level rules to the field and condition of another seed's rule
 */
function withVariants(main: Branch): Branch[] {
  const rules = main.items.filter((item): item is RuleItem => item.type === 'rule');
  const variants = [0, 1].map((index) => {
    const fresh = flattenItems(randomBranch(500 + index).items).filter(
      (item): item is RuleItem => item.type === 'rule'
    )[0];
    const changed = { ...rules[index * 7 + 1], target: fresh.target, condition: fresh.condition };
    const variant = changeItem(
      main,
      newBranch(main, 'based', `Variant ${index + 1}`, null),
      changed
    );
    if (variant === null) {
      throw new Error('The variant has no such rule');
    }
    return { ...variant, key: `variant-${index + 1}` };
  });
  return [main, ...variants];
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
 * A branch of 200 items built to be hard: each of the six country fields "includes one of" the
 * four allowed countries, and for each of those countries and each pair of the fields, a group
 * "the first includes none of it, or the second does" (186 items), then items joined from the
 * seeds from `fillerSeed` on. No applicant can meet it (the pigeonhole principle)
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
  const [{ checked }] = checkedBranchesOf([branch], CONTEXT, TODAY);
  expect(itemCount(branch.items)).toBe(size);
  expect(checked.leftOut).toEqual([]);
}

/**
 * 20 branches that differ: testOracle.ts' seeded branches 1 to 20 over shared variables, some
 * based on a main branch with marks. Most of them can be both met and failed, so the vector
 * search finds many vectors
 */
function differingBranches(): Branch[] {
  return Array.from({ length: BRANCHES }, (_, index) => randomBranch(index + 1));
}

/** Generation for each seed's branches, which must each end within `GENERATION_MS` */
function expectGeneratedInTime(branchesOf: (seed: number) => Branch[]): void {
  const elapsed = SEEDS.map((seed) => {
    const run = timedRun(branchesOf(seed), seed, GENERATION_STOP_MS);
    expectAnswered(run);
    return run.elapsed;
  });
  expect(Math.max(...elapsed), `ms per run: ${shown(elapsed)}`).toBeLessThanOrEqual(GENERATION_MS);
}

describe('the time budgets of generation and results (SC-003)', () => {
  it(
    `generates for one ${SMALL_ITEMS}-item branch within 1.5 s, AND and OR`,
    () => {
      expectCheckedWhole(joinedBranch(SMALL_ITEMS, 'and', 1), SMALL_ITEMS);
      expectGeneratedInTime((seed) => [joinedBranch(SMALL_ITEMS, 'and', seed)]);
      expectGeneratedInTime((seed) => [joinedBranch(SMALL_ITEMS, 'or', seed)]);
    },
    CASE_TIMEOUT_MS
  );

  it(
    `generates for a ${SMALL_ITEMS}-item branch with two variants based on it within 1.5 s`,
    () => {
      expectGeneratedInTime((seed) => withVariants(joinedBranch(SMALL_ITEMS, 'and', seed)));
      expectGeneratedInTime((seed) => withVariants(joinedBranch(SMALL_ITEMS, 'or', seed)));
    },
    CASE_TIMEOUT_MS
  );

  it(
    `generates for three different ${SMALL_ITEMS}-item branches within 1.5 s`,
    () => {
      expectGeneratedInTime((seed) => [
        joinedBranch(SMALL_ITEMS, 'and', seed),
        { ...joinedBranch(SMALL_ITEMS, 'or', seed + 50), key: 'second' },
        { ...joinedBranch(SMALL_ITEMS, 'and', seed + 90), key: 'third' },
      ]);
    },
    CASE_TIMEOUT_MS
  );

  it(
    `evaluates 3 personas × ${BRANCHES} branches × ${LARGE_ITEMS} items in under 100 ms`,
    () => {
      const branches = Array.from({ length: BRANCHES }, (_, index) =>
        joinedBranch(LARGE_ITEMS, index % 2 === 0 ? 'and' : 'or', 100 * (index + 1))
      );
      branches.forEach((branch) => expectCheckedWhole(branch, LARGE_ITEMS));
      // Plausible personas without planning: the fallback set of a run whose deadline has passed
      const request = requestOf(branches, 1);
      const answer = generatePersonas(request, { deadline: 0, now: () => 1 });
      const personas: Persona[] = PERSONA_IDS.map((id, index) => ({
        id,
        name: answer.slots[index].name ?? id,
        values: answer.slots[index].values,
        generated: answer.slots[index].values,
        status: 'ready',
      }));
      const elapsed = Array.from({ length: RESULTS_CALLS }, () => {
        const start = now();
        const results = testResultsOf(personas, request.fields, branches, CONTEXT, TODAY);
        const time = now() - start;
        for (const persona of personas) {
          expect(Object.keys(results[persona.id] ?? {})).toHaveLength(BRANCHES);
        }
        return time;
      });
      expect(Math.max(...elapsed), `ms per call: ${shown(elapsed)}`).toBeLessThan(RESULTS_MS);
    },
    CASE_TIMEOUT_MS
  );

  it(
    `returns by the deadline plus one solver step for a hard ${LARGE_ITEMS}-item branch`,
    () => {
      const branch = hardBranch(1);
      expectCheckedWhole(branch, LARGE_ITEMS);
      // Deadlines that cut the run while it plans: the overshoot past each
      const overshoots = SHORT_DEADLINES_MS.map((stopMs) => {
        const run = timedRun([branch], stopMs, stopMs);
        expectAnswered(run);
        expect(run.elapsed, `cut at ${stopMs} ms`).toBeGreaterThanOrEqual(stopMs);
        return run.elapsed - stopMs;
      });
      expect(
        Math.max(...overshoots),
        `ms past the deadline: ${shown(overshoots)}`
      ).toBeLessThanOrEqual(SOLVER_STEP_MS);
      // The run's own deadline: the answer comes before the hook's watchdog
      const run = timedRun([branch], 1, GENERATION_STOP_MS);
      expectAnswered(run);
      expect(run.elapsed).toBeLessThanOrEqual(GENERATION_STOP_MS + SOLVER_STEP_MS);
      expect(GENERATION_STOP_MS + SOLVER_STEP_MS).toBeLessThan(GENERATION_WATCHDOG_MS);
    },
    CASE_TIMEOUT_MS
  );

  it(
    `returns by the deadline plus one solver step for ${BRANCHES} branches that differ`,
    () => {
      const run = timedRun(differingBranches(), 1, GENERATION_STOP_MS);
      expectAnswered(run);
      expect(run.elapsed).toBeLessThanOrEqual(GENERATION_STOP_MS + SOLVER_STEP_MS);
    },
    CASE_TIMEOUT_MS
  );

  it(
    `searches the vectors of ${BRANCHES} branches that differ within GENERATION_STOP_MS`,
    () => {
      const branches = differingBranches();
      const start = now();
      const request = requestOf(branches, 1);
      const goals = goalsOf(
        request.branches.map((branch) => branch.checked),
        TODAY,
        { deadline: start + GENERATION_STOP_MS, now }
      );
      const elapsed = now() - start;
      expect(goals.vectors.length).toBeGreaterThan(1);
      expect(elapsed).toBeLessThan(GENERATION_STOP_MS);
    },
    CASE_TIMEOUT_MS
  );
});
