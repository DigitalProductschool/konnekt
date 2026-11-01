import { describe, expect, it } from 'vitest';

import type { RuleTreeItem } from '../../../types/form-connections';
import { rule } from '../testData';
import { announcementsFor } from './announcements';
import { namesOf } from './findingMessages';
import type {
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
    // A redundant finding isn't announced yet (T038): only the conflict's going is
    expect(
      announce(check([conflict('rule-2', ['rule-1'])]), check([same('rule-2', 'rule-1')]))
    ).toEqual(['Rule 02 no longer conflicts with Rule 01.']);
    expect(
      announce(check([same('rule-2', 'rule-1')]), check([conflict('rule-2', ['rule-1'])]))
    ).toEqual(['Rule 02 conflicts with Rule 01.']);
  });

  it('announces the notice that no applicant can meet the branch when it appears', () => {
    const notice: BranchNotice = { kind: 'none_can_meet', today: false };
    expect(announce(NONE, check([], { notice }))).toEqual([
      'No applicant can meet the rules of Standard.',
    ]);
    expect(announce(check([], { notice }), check([], { notice }))).toEqual([]);
    expect(announce(check([], { notice }), NONE)).toEqual([]);
    expect(
      announce(check([], { notice }), check([], { notice: { kind: 'none_can_meet', today: true } }))
    ).toEqual(['Right now, no applicant can meet the rules of Standard.']);
  });

  it('leaves out the notice that every applicant meets the branch (T038)', () => {
    expect(announce(NONE, check([], { notice: { kind: 'all_meet', today: false } }))).toEqual([]);
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
      'Rule 03 conflicts with Rule 01.',
      'Rule 04 no longer conflicts with Rule 01.',
      'No applicant can meet the rules of Standard.',
    ]);
  });

  it('announces no disappearance after an incomplete result', () => {
    const previous = check([conflict('rule-2', ['rule-1'])]);
    expect(announce(previous, check([], { complete: false }))).toEqual([]);
    expect(
      announce(previous, check([conflict('rule-4', ['rule-3'])], { complete: false }))
    ).toEqual(['Rule 04 conflicts with Rule 03.']);
    expect(announce(previous, check([same('rule-2', 'rule-1')], { complete: false }))).toEqual([]);
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

  it('names the variant of a finding in a branch other than the one shown', () => {
    const context = { ...SHOWN, branch: AMBULANCE };
    expect(announce(NONE, check([conflict('rule-2', ['rule-1'])]), context)).toEqual([
      'In Ambulance: Rule 02 conflicts with Rule 01.',
    ]);
  });
});
