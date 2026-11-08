import type { RuleTreeItem } from '@connection-portal/api-types/form-connections';
import { describe, expect, it } from 'vitest';

import { rule } from '../testData';
import { announcementsFor } from './announcements';
import { namesOf } from './findingMessages';
import type {
  AlwaysMetFinding,
  AnnouncementContext,
  BranchCheck,
  BranchNotice,
  ConflictingFinding,
  ItemFinding,
  NamedBranch,
  RedundantFinding,
} from './types';

// Rule 01 to Rule 04, in display order
const TREE: RuleTreeItem[] = [1, 2, 3, 4].map((number) => rule(number, null, null));
const NAMES = namesOf(TREE);

const STANDARD: NamedBranch = { key: 'branch-main', name: 'Standard' };
const AMBULANCE: NamedBranch = { key: 'branch-2', name: 'Ambulance' };

const SHOWN: AnnouncementContext = { branch: STANDARD, names: NAMES, shownBranch: STANDARD.key };

function conflict(itemId: string, items: string[], today = false): ConflictingFinding {
  return { itemId, kind: 'conflicting', reason: { type: 'with', items }, today };
}

function same(itemId: string, item: string): RedundantFinding {
  return { itemId, kind: 'redundant', reason: { type: 'same', item }, today: false };
}

function impliedBy(itemId: string, items: string[]): RedundantFinding {
  return {
    itemId,
    kind: 'redundant',
    reason: { type: 'implied_by', items, orItems: [] },
    today: false,
  };
}

function implies(itemId: string, items: string[], givenItems: string[]): RedundantFinding {
  return {
    itemId,
    kind: 'redundant',
    reason: { type: 'implies', items, givenItems },
    today: false,
  };
}

function alwaysMet(itemId: string): AlwaysMetFinding {
  return { itemId, kind: 'always_met', reason: null, today: false };
}

function check(
  findings: ItemFinding[],
  { notice = null, complete = true }: { notice?: BranchNotice | null; complete?: boolean } = {}
): BranchCheck {
  return {
    branchKey: STANDARD.key,
    fingerprint: 'f',
    complete,
    notice,
    findings,
    checkedRules: 4,
  };
}

const NONE = check([]);

function announce(previous: BranchCheck | null, next: BranchCheck, context = SHOWN): string[] {
  return announcementsFor(previous, next, 'action', context);
}

describe('announcementsFor', () => {
  it('announces a conflict that appears (FR-015)', () => {
    expect(announce(NONE, check([conflict('rule-2', ['rule-1'])]))).toEqual([
      'Rule 02 conflicts with Rule 01.',
    ]);
  });

  it('announces a conflict that goes, with its previous reason', () => {
    expect(announce(check([conflict('rule-2', ['rule-1'])]), NONE)).toEqual([
      'Rule 02 no longer conflicts with Rule 01.',
    ]);
  });

  it('announces nothing for a finding that stays the same', () => {
    const findings = [conflict('rule-2', ['rule-1'])];
    expect(announce(check(findings), check(findings))).toEqual([]);
  });

  it('announces a conflict whose reason changed as if new', () => {
    expect(
      announce(check([conflict('rule-3', ['rule-1'])]), check([conflict('rule-3', ['rule-2'])]))
    ).toEqual(['Rule 03 conflicts with Rule 02.']);
    expect(
      announce(
        check([conflict('rule-3', ['rule-1'])]),
        check([conflict('rule-3', ['rule-1'], true)])
      )
    ).toEqual(['Rule 03 conflicts with Rule 01 at the moment.']);
  });

  it('counts a change of kind as one going and one appearing', () => {
    // A duplicate's conflict is gone: it is now redundant
    expect(
      announce(check([conflict('rule-2', ['rule-1'])]), check([same('rule-2', 'rule-1')]))
    ).toEqual(['Rule 02 no longer conflicts with Rule 01.', 'Rule 02 is the same as Rule 01.']);
    expect(
      announce(check([same('rule-2', 'rule-1')]), check([conflict('rule-2', ['rule-1'])]))
    ).toEqual(['Rule 02 is no longer redundant.', 'Rule 02 conflicts with Rule 01.']);
    expect(
      announce(check([alwaysMet('rule-3')]), check([impliedBy('rule-3', ['rule-1'])]))
    ).toEqual(['Rule 03 is no longer always met.', 'Rule 03 makes no difference beside Rule 01.']);
  });

  it('announces a redundant finding that appears and goes (FR-015)', () => {
    expect(announce(NONE, check([same('rule-4', 'rule-3')]))).toEqual([
      'Rule 04 is the same as Rule 03.',
    ]);
    expect(announce(NONE, check([impliedBy('rule-1', ['rule-2'])]))).toEqual([
      'Rule 01 makes no difference beside Rule 02.',
    ]);
    expect(announce(NONE, check([implies('rule-4', ['rule-1'], ['rule-3'])]))).toEqual([
      'Rule 04 makes no difference beside Rule 01 and Rule 03.',
    ]);
    expect(announce(check([same('rule-4', 'rule-3')]), NONE)).toEqual([
      'Rule 04 is no longer redundant.',
    ]);
    expect(announce(check([impliedBy('rule-1', ['rule-2'])]), NONE)).toEqual([
      'Rule 01 is no longer redundant.',
    ]);
  });

  it('announces a redundant finding whose reason changed as if new', () => {
    expect(
      announce(check([same('rule-4', 'rule-3')]), check([impliedBy('rule-4', ['rule-2'])]))
    ).toEqual(['Rule 04 makes no difference beside Rule 02.']);
    const findings = [same('rule-4', 'rule-3')];
    expect(announce(check(findings), check(findings))).toEqual([]);
  });

  it('announces an always-met finding that appears and goes (FR-015)', () => {
    expect(announce(NONE, check([alwaysMet('rule-3')]))).toEqual(['Every citizen meets Rule 03.']);
    expect(announce(check([alwaysMet('rule-3')]), NONE)).toEqual([
      'Rule 03 is no longer always met.',
    ]);
    expect(announce(check([alwaysMet('rule-3')]), check([alwaysMet('rule-3')]))).toEqual([]);
  });

  it('announces the notice that no citizen can meet the branch when it appears', () => {
    const notice: BranchNotice = { kind: 'none_can_meet', today: false };
    expect(announce(NONE, check([], { notice }))).toEqual([
      'No citizen can meet the rules of Standard.',
    ]);
    expect(announce(check([], { notice }), check([], { notice }))).toEqual([]);
    expect(announce(check([], { notice }), NONE)).toEqual([]);
    expect(
      announce(check([], { notice }), check([], { notice: { kind: 'none_can_meet', today: true } }))
    ).toEqual(['Right now, no citizen can meet the rules of Standard.']);
  });

  it('announces the notice that every citizen meets the branch when it appears', () => {
    const notice: BranchNotice = { kind: 'all_meet', today: false };
    expect(announce(NONE, check([], { notice }))).toEqual([
      'Every citizen meets the rules of Standard.',
    ]);
    expect(announce(check([], { notice }), check([], { notice }))).toEqual([]);
    expect(announce(check([], { notice }), NONE)).toEqual([]);
    expect(
      announce(
        check([], { notice: { kind: 'none_can_meet', today: false } }),
        check([], { notice })
      )
    ).toEqual(['Every citizen meets the rules of Standard.']);
  });

  it('announces in display order, the going before the appearing, then the notice', () => {
    const previous = check([conflict('rule-4', ['rule-1']), conflict('rule-2', ['rule-3'])]);
    const next = check(
      [conflict('rule-1', ['rule-3']), conflict('rule-3', ['rule-1']), same('rule-2', 'rule-3')],
      { notice: { kind: 'none_can_meet', today: false } }
    );
    expect(announce(previous, next)).toEqual([
      'Rule 01 conflicts with Rule 03.',
      'Rule 02 no longer conflicts with Rule 03.',
      'Rule 02 is the same as Rule 03.',
      'Rule 03 conflicts with Rule 01.',
      'Rule 04 no longer conflicts with Rule 01.',
      'No citizen can meet the rules of Standard.',
    ]);
  });

  it('announces no disappearance after an incomplete result', () => {
    const previous = check([conflict('rule-2', ['rule-1'])]);
    expect(announce(previous, check([], { complete: false }))).toEqual([]);
    expect(
      announce(previous, check([conflict('rule-4', ['rule-3'])], { complete: false }))
    ).toEqual(['Rule 04 conflicts with Rule 03.']);
    expect(announce(previous, check([same('rule-2', 'rule-1')], { complete: false }))).toEqual([
      'Rule 02 is the same as Rule 01.',
    ]);
    expect(announce(check([alwaysMet('rule-3')]), check([], { complete: false }))).toEqual([]);
  });

  it('announces nothing on a branch’s first result or on a new day', () => {
    const next = check([conflict('rule-2', ['rule-1'])], {
      notice: { kind: 'none_can_meet', today: false },
    });
    expect(announcementsFor(NONE, next, 'first', SHOWN)).toEqual([]);
    expect(announcementsFor(NONE, next, 'new_day', SHOWN)).toEqual([]);
    expect(announcementsFor(null, next, 'action', SHOWN)).toEqual([]);
  });

  it('says nothing about an item that is gone from the tree', () => {
    const names = namesOf(TREE.slice(0, 1));
    expect(announce(check([conflict('rule-2', ['rule-1'])]), NONE, { ...SHOWN, names })).toEqual(
      []
    );
  });

  describe('in a variant other than the one shown (US3; design-notes.md §5)', () => {
    // Ambulance's own tree: Standard's Rule 01 to Rule 04, then its own Rule 05
    const AMBULANCE_NAMES = namesOf([1, 2, 3, 4, 5].map((number) => rule(number, null, null)));
    const IN_AMBULANCE: AnnouncementContext = {
      branch: AMBULANCE,
      names: AMBULANCE_NAMES,
      shownBranch: STANDARD.key,
    };

    function ambulance(
      findings: ItemFinding[],
      options: { notice?: BranchNotice | null; complete?: boolean } = {}
    ): BranchCheck {
      return { ...check(findings, options), branchKey: AMBULANCE.key };
    }

    it('announces a conflict that a change to Standard causes in Ambulance (US3-AS1)', () => {
      const next = ambulance([conflict('rule-2', ['rule-5']), conflict('rule-5', ['rule-2'])], {
        notice: { kind: 'none_can_meet', today: false },
      });
      expect(announce(ambulance([]), next, IN_AMBULANCE)).toEqual([
        'In Ambulance: Rule 02 conflicts with Rule 05.',
        'In Ambulance: Rule 05 conflicts with Rule 02.',
        'No citizen can meet the rules of Ambulance.',
      ]);
      expect(announce(next, ambulance([]), IN_AMBULANCE)).toEqual([
        'In Ambulance: Rule 02 no longer conflicts with Rule 05.',
        'In Ambulance: Rule 05 no longer conflicts with Rule 02.',
      ]);
    });

    it('announces every kind with the prefix, and a notice with its own text', () => {
      const previous = ambulance([same('rule-4', 'rule-3'), alwaysMet('rule-1')]);
      const next = ambulance([impliedBy('rule-2', ['rule-5'])], {
        notice: { kind: 'all_meet', today: false },
      });
      expect(announce(previous, next, IN_AMBULANCE)).toEqual([
        'In Ambulance: Rule 01 is no longer always met.',
        'In Ambulance: Rule 02 makes no difference beside Rule 05.',
        'In Ambulance: Rule 04 is no longer redundant.',
        'Every citizen meets the rules of Ambulance.',
      ]);
    });

    it('drops the prefix while Ambulance is shown', () => {
      expect(
        announce(ambulance([]), ambulance([conflict('rule-2', ['rule-5'])]), {
          ...IN_AMBULANCE,
          shownBranch: AMBULANCE.key,
        })
      ).toEqual(['Rule 02 conflicts with Rule 05.']);
    });

    it('announces nothing on a new variant’s first result', () => {
      expect(
        announcementsFor(null, ambulance([conflict('rule-2', ['rule-5'])]), 'action', IN_AMBULANCE)
      ).toEqual([]);
    });
  });

  it('names the variant of a finding in a branch other than the one shown', () => {
    const context = { ...SHOWN, branch: AMBULANCE };
    expect(announce(NONE, check([conflict('rule-2', ['rule-1'])]), context)).toEqual([
      'In Ambulance: Rule 02 conflicts with Rule 01.',
    ]);
    expect(announce(NONE, check([alwaysMet('rule-3')]), context)).toEqual([
      'In Ambulance: Every citizen meets Rule 03.',
    ]);
  });
});
