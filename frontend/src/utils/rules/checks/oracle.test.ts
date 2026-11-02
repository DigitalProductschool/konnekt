// `checkBranch()` against the brute-force oracle (specs/003-rule-consistency-checks, SC-001,
// SC-002; research R13): for seeded random branches of testOracle.ts, every finding and notice
// that the checks report must be true for every applicant and every day of sharing, and a complete
// result must miss nothing. The oracle evaluates real applicants with ../evaluation.ts and uses
// neither the theories nor the solver.
//
// Each seed's branch is checked once (`checkSeed()`), and its result compared with the oracle:
// - the notices (FR-004, FR-006) and the conflicts (FR-003, US1);
// - data-model.md's invariants 2 and 3, on where findings may be;
// - the always-met and redundant findings (FR-005, FR-006, US2): each holds, deleting every
//   redundant item at once changes no outcome (SC-002, invariant 4), and with `complete` every
//   always-met item is reported and every other item makes a difference (invariant 5).
import { describe, expect, it } from 'vitest';

import type { Combinator } from '../../../types/form-connections';
import { checkBranch } from './findings';
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
  ConflictingFinding,
  ItemFinding,
  RedundantFinding,
} from './types';

/** The seeded branches compared with the oracle: seeds 1 to this (T037: at least 5,000) */
const ORACLE_SEEDS = 5000;

/** Time for the whole loop: about 17 s alone on four cores, more on a shared machine */
const ORACLE_TIMEOUT_MS = 300_000;

/** A clock that never reaches the deadline, so that results are complete but for 'unknown' */
const IN_TIME: CheckOptions = { deadline: Number.POSITIVE_INFINITY, now: () => 0 };

/** Today, the day of the conflicts and of the unmeetable branch (research R4) */
const TODAY = ORACLE_TODAY_DAY;

// The tree as the assertions read it

/** An item of a checked tree with its AND-context A(X), its members and its enclosing groups */
interface Placed {
  item: CheckedItem;
  /** A(X): the siblings along the path to the top level whose level combines with AND */
  context: string[];
  /** A group's members; empty for a rule */
  members: string[];
  /** The groups the item is inside, from the top level down */
  ancestors: string[];
}

/** Every item, top-down in display order, with its AND-context in display order */
function placedOf(checked: CheckedBranch): Placed[] {
  const placed: Placed[] = [];
  const order = new Map<string, number>();
  const visit = (
    items: CheckedItem[],
    operator: Combinator,
    outer: string[],
    ancestors: string[]
  ) => {
    for (const item of items) {
      const siblings =
        operator === 'and' ? items.filter((each) => each !== item).map((each) => each.id) : [];
      const context = [...outer, ...siblings];
      order.set(item.id, order.size);
      placed.push({
        item,
        context,
        members: item.type === 'group' ? item.items.map((each) => each.id) : [],
        ancestors,
      });
      if (item.type === 'group') {
        visit(item.items, item.operator, context, [...ancestors, item.id]);
      }
    }
  };
  visit(checked.items, checked.operator, [], []);
  const rank = (id: string) => order.get(id) ?? 0;
  for (const each of placed) {
    each.context.sort((first, second) => rank(first) - rank(second));
  }
  return placed;
}

/**
 * The items in the order step 4 visits them (research R8): from the last in display order to the
 * first, each group before its members
 */
function visitOrderOf(placed: readonly Placed[]): Placed[] {
  const byId = new Map(placed.map((each) => [each.item.id, each]));
  const visit = (items: CheckedItem[]): Placed[] =>
    [...items].reverse().flatMap((item) => {
      const entry = byId.get(item.id);
      const inside = item.type === 'group' ? visit(item.items) : [];
      return entry ? [entry, ...inside] : inside;
    });
  const top = placed.filter((each) => each.ancestors.length === 0).map((each) => each.item);
  return visit(top);
}

/** The subsets of `pool` of `size` items, in pool order */
function* subsetsOf(pool: readonly string[], size: number): Generator<string[]> {
  if (size === 0) {
    yield [];
    return;
  }
  for (let index = 0; index <= pool.length - size; index += 1) {
    for (const rest of subsetsOf(pool.slice(index + 1), size - 1)) {
      yield [pool[index], ...rest];
    }
  }
}

/**
 * Whether the oracle finds X conflicting (FR-003): no applicant meets it today on its own, or some
 * T ⊆ A(X) that some applicant meets today is met by none together with X. A T that works stays
 * one when items that can be met with it are added, so the search may stop at the first
 */
function conflictingByOracle(oracle: Oracle, { item, context }: Placed): boolean {
  if (!oracle.canMeet([item.id], TODAY)) {
    return true;
  }
  for (let size = 1; size <= context.length; size += 1) {
    for (const set of subsetsOf(context, size)) {
      if (oracle.canMeet(set, TODAY) && !oracle.canMeet([...set, item.id], TODAY)) {
        return true;
      }
    }
  }
  return false;
}

// The assertions: conflicts and notices (US1)

/**
 * The finding's `today` (FR-008): whether `set` can be met on a later day. Where the run couldn't
 * tell, the finding may say "who share today" anyway, which is true either way
 */
function expectToday(finding: ConflictingFinding, set: string[], oracle: Oracle): void {
  const later = oracle.canMeet(set, LATER_DAYS);
  if (later || !finding.today) {
    expect(finding.today, `today of ${finding.itemId}`).toBe(later);
  }
}

/** A conflicting finding holds: its reason is true, and its `today` too */
function expectConflictHolds(finding: ConflictingFinding, placed: Placed, oracle: Oracle): void {
  const { item, context, members } = placed;
  const { reason } = finding;
  switch (reason.type) {
    case 'with': {
      // T ⊆ A(X), T can be met today, T ∧ X can't
      expect(reason.items.length).toBeGreaterThan(0);
      expect(reason.items.every((id) => context.includes(id))).toBe(true);
      expect(oracle.canMeet(reason.items, TODAY)).toBe(true);
      expect(oracle.canMeet([...reason.items, item.id], TODAY)).toBe(false);
      expectToday(finding, [...reason.items, item.id], oracle);
      return;
    }
    case 'condition': {
      // T = ∅: the rule can't be met today on its own
      expect(item.type).toBe('rule');
      expect(oracle.canMeet([item.id], TODAY)).toBe(false);
      expectToday(finding, [item.id], oracle);
      return;
    }
    case 'members': {
      // T = ∅: the group can't be met today on its own, because of the members named
      expect(item.type).toBe('group');
      expect(item.type === 'group' && item.operator).toBe(reason.operator);
      expect(oracle.canMeet([item.id], TODAY)).toBe(false);
      expect(reason.items.length).toBeGreaterThan(0);
      expect(reason.items.every((id) => members.includes(id))).toBe(true);
      if (reason.operator === 'or') {
        expect(reason.items).toEqual(members);
        for (const member of reason.items) {
          expect(oracle.canMeet([member], TODAY)).toBe(false);
        }
        expectToday(finding, [item.id], oracle);
      } else {
        expect(oracle.canMeet(reason.items, TODAY)).toBe(false);
        expectToday(finding, reason.items, oracle);
      }
      return;
    }
  }
}

/**
 * The notices (FR-004, FR-006, FR-008): `none_can_meet` appears only when no applicant can meet
 * the branch today, and its `today` says whether a later day can; `all_meet` only when every
 * applicant meets it on every day from today on. With `complete`, the one that holds appears
 */
function expectNotice(result: BranchCheck, oracle: Oracle): void {
  const meetable = oracle.canMeet([BRANCH], TODAY);
  const allMeet = meetable && oracle.alwaysMet([BRANCH], FROM_TODAY);
  const { notice } = result;
  if (result.complete) {
    expect(notice?.kind ?? null).toBe(meetable ? (allMeet ? 'all_meet' : null) : 'none_can_meet');
  }
  if (notice?.kind === 'none_can_meet') {
    expect(meetable).toBe(false);
    const later = oracle.canMeet([BRANCH], LATER_DAYS);
    if (later || !notice.today) {
      expect(notice.today).toBe(later);
    }
  } else if (notice?.kind === 'all_meet') {
    expect(allMeet, 'every applicant meets the branch').toBe(true);
    expect(notice.today).toBe(false);
  }
}

/**
 * The conflicts (FR-003): every conflicting finding holds, at most one finding per item and in
 * display order (invariant 1); with `complete`, every item that the oracle finds conflicting has
 * its finding
 */
function expectConflicts(placed: Placed[], result: BranchCheck, oracle: Oracle): void {
  const ids = placed.map((each) => each.item.id);
  const found = result.findings.map((finding) => finding.itemId);
  expect(new Set(found).size).toBe(found.length);
  expect(found).toEqual(ids.filter((id) => found.includes(id)));
  const conflicts = new Map(
    result.findings
      .filter((finding): finding is ConflictingFinding => finding.kind === 'conflicting')
      .map((finding) => [finding.itemId, finding])
  );
  for (const each of placed) {
    const finding = conflicts.get(each.item.id);
    if (finding) {
      expectConflictHolds(finding, each, oracle);
    } else if (result.complete) {
      expect(conflictingByOracle(oracle, each), `${each.item.id} is conflicting`).toBe(false);
    }
  }
}

// The assertions: where findings may be (data-model.md, invariants 2 and 3)

/**
 * Invariant 2: a branch that no applicant can meet has only conflicting findings (FR-005, W4).
 * Invariant 3: no finding inside a redundant or always-met group, and no redundant or always-met
 * finding inside a conflicting item (on one is ruled out by invariant 1)
 */
function expectPlaces(placed: Placed[], byItem: Map<string, ItemFinding>, result: BranchCheck) {
  if (result.notice?.kind === 'none_can_meet') {
    expect(result.findings.every((finding) => finding.kind === 'conflicting')).toBe(true);
  }
  for (const { item, ancestors } of placed) {
    const finding = byItem.get(item.id);
    if (!finding) {
      continue;
    }
    for (const ancestor of ancestors) {
      const outer = byItem.get(ancestor)?.kind;
      expect(outer === 'redundant' || outer === 'always_met', `${item.id} inside ${ancestor}`).toBe(
        false
      );
      if (finding.kind !== 'conflicting') {
        expect(outer, `${item.id} inside ${ancestor}`).not.toBe('conflicting');
      }
    }
  }
}

// The assertions: always met and redundant (US2)

/**
 * Whether step 4 may report the item (FR-005, FR-006; data-model.md, invariant 3): it is visited,
 * since no group it is inside has a finding (conflicting: not visited; redundant: deleted; always
 * met: its members skipped), and it is no conflicting item nor holds one, since a finding on it
 * would put the conflict inside a redundant or always-met group. `conflictsIn` holds the groups
 * that a conflicting item is inside
 */
function reportable(
  { item, ancestors }: Placed,
  byItem: Map<string, ItemFinding>,
  conflictsIn: Set<string>
): boolean {
  return (
    ancestors.every((ancestor) => !byItem.has(ancestor)) &&
    byItem.get(item.id)?.kind !== 'conflicting' &&
    !conflictsIn.has(item.id)
  );
}

/** Every id that a redundant finding's reason names */
function reasonIds(finding: RedundantFinding): string[] {
  const { reason } = finding;
  switch (reason.type) {
    case 'same':
      return [reason.item];
    case 'implied_by':
      return [...reason.items, ...reason.orItems];
    case 'implies':
      return [...reason.items, ...reason.givenItems];
  }
}

/** What step 4's assertions counted for one branch */
interface Differences {
  /** Items whose difference in the working tree was asked of the oracle (invariant 5) */
  differences: number;
}

/**
 * The always-met and redundant findings (FR-005, FR-006, SC-002), walked in step 4's visit order
 * (research R8), with the working tree as the branch without the items found redundant so far:
 * - an always-met item is met by every applicant on every day from today on;
 * - a redundant item names items of the tree other than itself and those already deleted, and
 *   deleting it from the working tree changes no outcome on any day from today on;
 * - deleting every redundant item at once changes no outcome either (invariant 4);
 * - with `complete`, in a branch that some applicant can meet, every item that step 4 may report
 *   (`reportable()`) that is always met has that finding, and every other one without a finding
 *   changes an outcome when deleted from the working tree (invariant 5). That is the working tree
 *   of its visit: after later deletions, it may no longer, as in seed 236, OR(AND(Rule 01 always
 *   met, Rule 02), Rule 04, Rule 05), where deleting Rule 04 and Rule 02 leaves Rule 05 beside
 *   the always-met Rule 01
 */
function expectDifferences(placed: Placed[], result: BranchCheck, oracle: Oracle): Differences {
  const byItem = new Map(result.findings.map((finding) => [finding.itemId, finding]));
  expectPlaces(placed, byItem, result);
  const ids = new Set(placed.map((each) => each.item.id));
  const conflictsIn = new Set(
    placed.flatMap((each) =>
      byItem.get(each.item.id)?.kind === 'conflicting' ? each.ancestors : []
    )
  );
  const thorough = result.complete && result.notice?.kind !== 'none_can_meet';
  const deleted: string[] = [];
  let differences = 0;
  for (const entry of visitOrderOf(placed)) {
    const id = entry.item.id;
    const finding = byItem.get(id);
    if (finding?.kind === 'always_met') {
      expect(finding.reason).toBeNull();
      expect(oracle.alwaysMet([id], FROM_TODAY), `${id} is always met`).toBe(true);
    } else if (finding?.kind === 'redundant') {
      const named = reasonIds(finding);
      expect(named.length, `${id}'s reason`).toBeGreaterThan(0);
      for (const other of named) {
        expect(
          ids.has(other) && other !== id && !deleted.includes(other),
          `${id} names ${other}`
        ).toBe(true);
      }
      expect(oracle.changedOutcome([id], FROM_TODAY, deleted), `${id} is redundant`).toBeNull();
      deleted.push(id);
    } else if (thorough && !finding && reportable(entry, byItem, conflictsIn)) {
      expect(oracle.alwaysMet([id], FROM_TODAY), `${id} is always met, without its finding`).toBe(
        false
      );
      const changed = oracle.changedOutcome([id], FROM_TODAY, deleted);
      expect(changed, `${id} makes a difference`).not.toBeNull();
      differences += 1;
    }
  }
  expect(oracle.changedOutcome(deleted, FROM_TODAY), 'deleting every redundant item').toBeNull();
  return { differences };
}

// One seed

/** What one seed's branch gave */
interface SeedOutcome extends Differences {
  result: BranchCheck;
}

/** One seed's branch, checked and compared with the oracle */
function checkSeed(seed: number): SeedOutcome {
  const branch = randomBranch(seed);
  const checked = checkedBranchOf(branch);
  const result = checkBranch(checked, IN_TIME);
  const oracle = oracleOf(branch);
  return withSeed(seed, () => {
    const placed = placedOf(checked);
    expectNotice(result, oracle);
    expectConflicts(placed, result, oracle);
    return { result, ...expectDifferences(placed, result, oracle) };
  });
}

/** How many of the seeds' results have each finding kind, notice, and other count */
type Tally = Record<
  'incomplete' | 'conflicting' | 'redundant' | 'always_met' | 'none_can_meet' | 'all_meet',
  number
> &
  Differences;

describe(`checkBranch against the oracle, for ${ORACLE_SEEDS} seeded branches (SC-001, SC-002)`, () => {
  it(
    'reports only true findings and notices, misses none when complete, and deletes safely',
    () => {
      const tally: Tally = {
        incomplete: 0,
        conflicting: 0,
        redundant: 0,
        always_met: 0,
        none_can_meet: 0,
        all_meet: 0,
        differences: 0,
      };
      for (let seed = 1; seed <= ORACLE_SEEDS; seed += 1) {
        const { result, differences } = checkSeed(seed);
        tally.incomplete += result.complete ? 0 : 1;
        for (const kind of ['conflicting', 'redundant', 'always_met'] as const) {
          tally[kind] += result.findings.some((each) => each.kind === kind) ? 1 : 0;
        }
        if (result.notice) {
          tally[result.notice.kind] += 1;
        }
        tally.differences += differences;
      }
      // The branches cover every kind, and the text theory's 'unknown' stays rare
      expect(tally.conflicting).toBeGreaterThan(ORACLE_SEEDS / 10);
      expect(tally.conflicting).toBeLessThan(ORACLE_SEEDS);
      expect(tally.none_can_meet).toBeGreaterThan(ORACLE_SEEDS / 20);
      expect(tally.redundant).toBeGreaterThan(ORACLE_SEEDS / 10);
      expect(tally.always_met).toBeGreaterThan(0);
      expect(tally.all_meet).toBeGreaterThan(0);
      expect(tally.differences).toBeGreaterThan(ORACLE_SEEDS);
      expect(tally.incomplete).toBeLessThan(ORACLE_SEEDS / 20);
    },
    ORACLE_TIMEOUT_MS
  );
});
