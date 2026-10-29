// `checkBranch()` against the brute-force oracle (specs/003-rule-consistency-checks, SC-001;
// research R13): for seeded random branches of testOracle.ts, every finding and notice that the
// checks report must be true for every applicant and every day of sharing, and a complete result
// must miss nothing. The oracle evaluates real applicants with testEvaluator.ts and uses neither
// the theories nor the solver.
//
// Conflicts and the unmeetable branch (US1) come first. T037 raises `ORACLE_SEEDS` and adds the
// redundancy and joint-deletion assertions, as further `expect…` functions called from the same
// loop (`checkSeed()`).
import { describe, expect, it } from 'vitest';

import type { Combinator } from '../../../types/form-connections';
import { checkBranch } from './findings';
import {
  BRANCH,
  checkedBranchOf,
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
} from './types';

/** The seeded branches compared with the oracle: seeds 1 to this */
const ORACLE_SEEDS = 1200;

/** Time for the whole loop: about 10 s on a shared machine with four cores, far less alone */
const ORACLE_TIMEOUT_MS = 120_000;

/** A clock that never reaches the deadline, so that results are complete but for 'unknown' */
const IN_TIME: CheckOptions = { deadline: Number.POSITIVE_INFINITY, now: () => 0 };

/** Today, the day of the conflicts and of the unmeetable branch (research R4) */
const TODAY = ORACLE_TODAY_DAY;

// The tree as the assertions read it

/** An item of a checked tree with its AND-context A(X) and its members, in display order */
interface Placed {
  item: CheckedItem;
  /** A(X): the siblings along the path to the top level whose level combines with AND */
  context: string[];
  /** A group's members; empty for a rule */
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
  const rank = (id: string) => order.get(id) ?? 0;
  for (const each of placed) {
    each.context.sort((first, second) => rank(first) - rank(second));
  }
  return placed;
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

// The assertions

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
 * The notice `none_can_meet` (FR-004, FR-008) appears only when no applicant can meet the branch
 * today, and always then when the result is complete; its `today` says whether a later day can
 */
function expectNotice(result: BranchCheck, oracle: Oracle): void {
  const meetable = oracle.canMeet([BRANCH], TODAY);
  const notice = result.notice?.kind === 'none_can_meet' ? result.notice : null;
  if (meetable) {
    expect(notice).toBeNull();
    return;
  }
  if (result.complete) {
    expect(notice).not.toBeNull();
  }
  if (notice) {
    const later = oracle.canMeet([BRANCH], LATER_DAYS);
    if (later || !notice.today) {
      expect(notice.today).toBe(later);
    }
  }
}

/**
 * The conflicts (FR-003): every conflicting finding holds, at most one finding per item and in
 * display order; with `complete`, every item that the oracle finds conflicting has its finding
 */
function expectConflicts(checked: CheckedBranch, result: BranchCheck, oracle: Oracle): void {
  const placed = placedOf(checked);
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

/** One seed's branch, checked and compared with the oracle */
function checkSeed(seed: number): BranchCheck {
  const branch = randomBranch(seed);
  const checked = checkedBranchOf(branch);
  const result = checkBranch(checked, IN_TIME);
  const oracle = oracleOf(branch);
  withSeed(seed, () => {
    expectNotice(result, oracle);
    expectConflicts(checked, result, oracle);
  });
  return result;
}

describe(`checkBranch against the oracle, for ${ORACLE_SEEDS} seeded branches (SC-001)`, () => {
  it(
    'reports only true conflicts and notices, and misses none when complete',
    () => {
      let incomplete = 0;
      let withConflicts = 0;
      let withNotice = 0;
      for (let seed = 1; seed <= ORACLE_SEEDS; seed += 1) {
        const result = checkSeed(seed);
        incomplete += result.complete ? 0 : 1;
        withConflicts += result.findings.some((each) => each.kind === 'conflicting') ? 1 : 0;
        withNotice += result.notice?.kind === 'none_can_meet' ? 1 : 0;
      }
      // The branches cover both outcomes, and the text theory's 'unknown' stays rare
      expect(withConflicts).toBeGreaterThan(ORACLE_SEEDS / 10);
      expect(withConflicts).toBeLessThan(ORACLE_SEEDS);
      expect(withNotice).toBeGreaterThan(ORACLE_SEEDS / 20);
      expect(incomplete).toBeLessThan(ORACLE_SEEDS / 20);
    },
    ORACLE_TIMEOUT_MS
  );
});
