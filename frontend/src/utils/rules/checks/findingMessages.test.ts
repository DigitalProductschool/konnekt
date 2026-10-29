import { describe, expect, it } from 'vitest';

import type { GroupItem, RuleTreeItem } from '../../../types/form-connections';
import { rule } from '../testData';
import { announcementOf, listOf, namesOf, noteOf, summaryOf, tabLabelOf } from './findingMessages';
import type {
  BranchCheck,
  BranchNotice,
  ConflictingFinding,
  ConflictingReason,
  FindingChange,
  ItemFinding,
  NamedBranch,
} from './types';

function group(
  number: number,
  items: RuleTreeItem[],
  operator: GroupItem['operator'] = 'and',
  name = `Group ${String(number).padStart(2, '0')}`
): GroupItem {
  return { type: 'group', id: `group-${number}`, name, mark: null, operator, message: null, items };
}

// U02's tree: Rule 01, Group 01 (Rule 02, Rule 03), Sub-group 01 inside Group 02 (Rule 04,
// Rule 05), Rule 06; in display order
const TREE: RuleTreeItem[] = [
  rule(1, null, null),
  group(1, [rule(2, null, null), rule(3, null, null)], 'or'),
  group(2, [group(3, [rule(4, null, null), rule(5, null, null)], 'and', 'Sub-group 01')]),
  rule(6, null, null),
];
const NAMES = namesOf(TREE);

const STANDARD: NamedBranch = { key: 'branch-main', name: 'Standard' };
const AMBULANCE: NamedBranch = { key: 'branch-2', name: 'Ambulance' };

function conflicting(itemId: string, reason: ConflictingReason, today = false): ConflictingFinding {
  return { itemId, kind: 'conflicting', reason, today };
}

function withItems(itemId: string, items: string[], today = false): ConflictingFinding {
  return conflicting(itemId, { type: 'with', items }, today);
}

function check(
  findings: ItemFinding[],
  notice: BranchNotice | null = null,
  { complete = true, checkedRules = 6 } = {}
): BranchCheck {
  return { branchKey: STANDARD.key, fingerprint: 'f', complete, notice, findings, checkedRules };
}

const TEXT_TO_FIX = /\b(fix|error|mistake|resolve|correct|wrong)/i;

describe('listOf', () => {
  it('joins without a serial comma (W3)', () => {
    expect(listOf([])).toBe('');
    expect(listOf(['Rule 02'])).toBe('Rule 02');
    expect(listOf(['Rule 02', 'Rule 03'])).toBe('Rule 02 and Rule 03');
    expect(listOf(['Rule 02', 'Rule 03', 'Rule 04'])).toBe('Rule 02, Rule 03 and Rule 04');
    expect(listOf(['Rule 04', 'Rule 05', 'Rule 06'], 'or')).toBe('Rule 04, Rule 05 or Rule 06');
  });
});

describe('namesOf', () => {
  it('names every rule, group and sub-group by id, in display order', () => {
    expect([...NAMES]).toEqual([
      ['rule-1', 'Rule 01'],
      ['group-1', 'Group 01'],
      ['rule-2', 'Rule 02'],
      ['rule-3', 'Rule 03'],
      ['group-2', 'Group 02'],
      ['group-3', 'Sub-group 01'],
      ['rule-4', 'Rule 04'],
      ['rule-5', 'Rule 05'],
      ['rule-6', 'Rule 06'],
    ]);
  });
});

describe('noteOf', () => {
  it('names the items a rule or group can’t be met together with (FR-003, F5)', () => {
    expect(noteOf(withItems('rule-1', ['rule-2']), NAMES)).toBe(
      'Conflicting. Can’t be met together with Rule 02.'
    );
    expect(noteOf(withItems('group-1', ['rule-1']), NAMES)).toBe(
      'Conflicting. Can’t be met together with Rule 01.'
    );
  });

  it('lists several items in display order (EC-11, W3)', () => {
    expect(noteOf(withItems('rule-1', ['rule-2', 'rule-3', 'rule-4']), NAMES)).toBe(
      'Conflicting. Can’t be met together with Rule 02, Rule 03 and Rule 04.'
    );
  });

  it('says when a conflict holds for applicants who share today (FR-008, W5)', () => {
    expect(noteOf(withItems('rule-1', ['rule-2'], true), NAMES)).toBe(
      'Conflicting. Can’t be met together with Rule 02 by applicants who share today.'
    );
  });

  it('names the members of an AND group that can’t be met together (F6)', () => {
    const finding = conflicting('group-3', {
      type: 'members',
      operator: 'and',
      items: ['rule-4', 'rule-5'],
    });
    expect(noteOf(finding, NAMES)).toBe(
      'Conflicting. Rule 04 and Rule 05 in this group can’t be met together.'
    );
    expect(noteOf({ ...finding, today: true }, NAMES)).toBe(
      'Conflicting. Rule 04 and Rule 05 in this group can’t be met together by applicants who ' +
        'share today.'
    );
  });

  it('says that none of an OR group’s members can be met (design-notes.md §2.2)', () => {
    const two = conflicting('group-1', {
      type: 'members',
      operator: 'or',
      items: ['rule-2', 'rule-3'],
    });
    expect(noteOf(two, NAMES)).toBe(
      'Conflicting. Neither Rule 02 nor Rule 03 in this group can be met.'
    );
    expect(noteOf({ ...two, today: true }, NAMES)).toBe(
      'Conflicting. Neither Rule 02 nor Rule 03 in this group can be met by applicants who share ' +
        'today.'
    );
    const three = conflicting('group-2', {
      type: 'members',
      operator: 'or',
      items: ['rule-4', 'rule-5', 'rule-6'],
    });
    expect(noteOf(three, NAMES)).toBe(
      'Conflicting. None of Rule 04, Rule 05 and Rule 06 in this group can be met.'
    );
  });

  it('names a group’s single member that can’t be met (design-notes.md §2.2)', () => {
    const finding = conflicting('group-2', {
      type: 'members',
      operator: 'and',
      items: ['group-3'],
    });
    expect(noteOf(finding, NAMES)).toBe('Conflicting. Sub-group 01 in this group can’t be met.');
    expect(noteOf({ ...finding, today: true }, NAMES)).toBe(
      'Conflicting. Sub-group 01 in this group can’t be met by applicants who share today.'
    );
  });

  it('points at the condition of a rule that can’t be met on its own (design-notes.md §2.3)', () => {
    const finding = conflicting('rule-3', { type: 'condition' });
    expect(noteOf(finding, NAMES)).toBe(
      'Conflicting. No applicant can meet this rule’s condition.'
    );
    expect(noteOf({ ...finding, today: true }, NAMES)).toBe(
      'Conflicting. No applicant who shares today can meet this rule’s condition.'
    );
  });

  it('shows the current names, so that a rename shows at once (FR-011)', () => {
    const renamed = namesOf([rule(1, null, null), rule(2, null, null, 'x', 'Minimum age')]);
    expect(noteOf(withItems('rule-1', ['rule-2']), renamed)).toBe(
      'Conflicting. Can’t be met together with Minimum age.'
    );
  });

  it('leaves out an item without a current name, and never shows an id', () => {
    expect(noteOf(withItems('rule-1', ['rule-2', 'rule-9']), NAMES)).toBe(
      'Conflicting. Can’t be met together with Rule 02.'
    );
    expect(noteOf(withItems('rule-1', ['rule-9']), NAMES)).toBe('Conflicting.');
  });
});

describe('summaryOf', () => {
  it('reads F1’s U01 text', () => {
    const findings = [withItems('rule-1', ['rule-2']), withItems('rule-2', ['rule-1'])];
    expect(
      summaryOf(check(findings, { kind: 'none_can_meet', today: false }), STANDARD, NAMES)
    ).toBe(
      '2 conflicting rules: nobody can meet both Rule 01 and Rule 02. No applicant can meet the ' +
        'rules of Standard.'
    );
  });

  it('counts rules before groups, sub-groups as groups, and explains a group’s own conflict', () => {
    const findings = [
      conflicting('group-3', { type: 'members', operator: 'and', items: ['rule-4', 'rule-5'] }),
      withItems('rule-4', ['rule-5']),
      withItems('rule-5', ['rule-4']),
    ];
    expect(summaryOf(check(findings), STANDARD, NAMES)).toBe(
      '2 conflicting rules and 1 conflicting group: nobody can meet both Rule 04 and Rule 05.'
    );
  });

  it('puts the first conflict’s set in display order (US1-AS5)', () => {
    expect(summaryOf(check([withItems('rule-2', ['rule-1'])]), STANDARD, NAMES)).toBe(
      '1 conflicting rule: nobody can meet both Rule 01 and Rule 02.'
    );
  });

  it('says "all of" for a set of three or more (EC-11)', () => {
    const findings = ['rule-1', 'rule-2', 'rule-3', 'rule-4'].map((id, _, ids) =>
      withItems(
        id,
        ids.filter((other) => other !== id)
      )
    );
    expect(summaryOf(check(findings), STANDARD, NAMES)).toBe(
      '4 conflicting rules: nobody can meet all of Rule 01, Rule 02, Rule 03 and Rule 04.'
    );
  });

  it('says that other conflicts are marked when the first doesn’t cover them', () => {
    const findings = [
      ...['rule-1', 'rule-2', 'rule-3', 'rule-4'].map((id, _, ids) =>
        withItems(
          id,
          ids.filter((other) => other !== id)
        )
      ),
      withItems('rule-5', ['rule-6']),
      withItems('rule-6', ['rule-5']),
    ];
    expect(
      summaryOf(check(findings, { kind: 'none_can_meet', today: false }), STANDARD, NAMES)
    ).toBe(
      '6 conflicting rules: nobody can meet all of Rule 01, Rule 02, Rule 03 and Rule 04. The other ' +
        'conflicts are marked below. No applicant can meet the rules of Standard.'
    );
  });

  it('explains a rule that can’t be met on its own, and an OR group none of whose members can be met', () => {
    expect(summaryOf(check([conflicting('rule-3', { type: 'condition' })]), STANDARD, NAMES)).toBe(
      '1 conflicting rule: nobody can meet Rule 03.'
    );
    const orGroup = conflicting('group-1', {
      type: 'members',
      operator: 'or',
      items: ['rule-2', 'rule-3'],
    });
    expect(summaryOf(check([orGroup]), STANDARD, NAMES)).toBe(
      '1 conflicting group: nobody can meet Rule 02 or Rule 03.'
    );
  });

  it('says when a conflict and the notice hold for applicants who share today (W5)', () => {
    const findings = [withItems('rule-1', ['rule-2'], true), withItems('rule-2', ['rule-1'], true)];
    expect(
      summaryOf(check(findings, { kind: 'none_can_meet', today: true }), STANDARD, NAMES)
    ).toBe(
      '2 conflicting rules: nobody who shares today can meet both Rule 01 and Rule 02. No ' +
        'applicant who shares today can meet the rules of Standard.'
    );
  });

  it('adds FR-010’s sentence after an incomplete check, alone without certain findings (W12)', () => {
    expect(summaryOf(check([], null, { complete: false }), STANDARD, NAMES)).toBe(
      'The rules of Standard couldn’t be checked completely. Only findings that are certain are ' +
        'shown.'
    );
    expect(
      summaryOf(
        check([withItems('rule-1', ['rule-2'])], null, { complete: false }),
        AMBULANCE,
        NAMES
      )
    ).toBe(
      '1 conflicting rule: nobody can meet both Rule 01 and Rule 02. The rules of Ambulance ' +
        'couldn’t be checked completely. Only findings that are certain are shown.'
    );
  });

  it('says nothing without findings, or without checked rules (W13)', () => {
    expect(summaryOf(check([]), STANDARD, NAMES)).toBe('');
    expect(summaryOf(check([], null, { complete: false, checkedRules: 0 }), STANDARD, NAMES)).toBe(
      ''
    );
  });

  it('names the branch by its current name (FR-011)', () => {
    expect(summaryOf(check([], { kind: 'none_can_meet', today: false }), AMBULANCE, NAMES)).toBe(
      'No applicant can meet the rules of Ambulance.'
    );
  });
});

describe('tabLabelOf', () => {
  it('reads "<variant> has findings" (F7)', () => {
    expect(tabLabelOf('Standard')).toBe('Standard has findings');
    expect(tabLabelOf('Ambulance')).toBe('Ambulance has findings');
  });
});

describe('announcementOf', () => {
  function appeared(finding: ItemFinding, branch = STANDARD): FindingChange {
    return { type: 'appeared', branch, finding };
  }

  function gone(finding: ItemFinding, branch = STANDARD): FindingChange {
    return { type: 'gone', branch, finding };
  }

  function announce(change: FindingChange): string {
    return announcementOf(change, NAMES, STANDARD.key);
  }

  it('announces a conflict that appears and goes (FR-015)', () => {
    expect(announce(appeared(withItems('rule-2', ['rule-1'])))).toBe(
      'Rule 02 conflicts with Rule 01.'
    );
    expect(announce(gone(withItems('rule-2', ['rule-1'])))).toBe(
      'Rule 02 no longer conflicts with Rule 01.'
    );
    expect(announce(appeared(withItems('rule-1', ['rule-2', 'rule-3', 'rule-4'])))).toBe(
      'Rule 01 conflicts with Rule 02, Rule 03 and Rule 04.'
    );
  });

  it('says when a new conflict holds for applicants who share today', () => {
    expect(announce(appeared(withItems('rule-2', ['rule-1'], true)))).toBe(
      'Rule 02 conflicts with Rule 01 by applicants who share today.'
    );
  });

  it('words groups as design-notes.md §5 proposes', () => {
    expect(announce(appeared(withItems('group-3', ['rule-1'])))).toBe(
      'Sub-group 01 conflicts with Rule 01.'
    );
    const own = conflicting('group-3', {
      type: 'members',
      operator: 'and',
      items: ['rule-4', 'rule-5'],
    });
    expect(announce(appeared(own))).toBe(
      'Rule 04 and Rule 05 in Sub-group 01 can’t be met together.'
    );
    expect(announce(appeared({ ...own, today: true }))).toBe(
      'Rule 04 and Rule 05 in Sub-group 01 can’t be met together by applicants who share today.'
    );
    const or = conflicting('group-1', {
      type: 'members',
      operator: 'or',
      items: ['rule-2', 'rule-3'],
    });
    expect(announce(appeared(or))).toBe('Neither Rule 02 nor Rule 03 in Group 01 can be met.');
    const orThree = conflicting('group-2', {
      type: 'members',
      operator: 'or',
      items: ['rule-4', 'rule-5', 'rule-6'],
    });
    expect(announce(appeared(orThree))).toBe(
      'None of Rule 04, Rule 05 and Rule 06 in Group 02 can be met.'
    );
    expect(announce(gone(own))).toBe('Sub-group 01 is no longer conflicting.');
  });

  it('words a rule that can’t be met on its own', () => {
    const finding = conflicting('rule-3', { type: 'condition' });
    expect(announce(appeared(finding))).toBe('No applicant can meet Rule 03.');
    expect(announce(appeared({ ...finding, today: true }))).toBe(
      'No applicant who shares today can meet Rule 03.'
    );
    expect(announce(gone(finding))).toBe('Rule 03 is no longer conflicting.');
  });

  it('announces a new notice with its own text, without a prefix', () => {
    expect(
      announce({
        type: 'notice',
        branch: STANDARD,
        notice: { kind: 'none_can_meet', today: false },
      })
    ).toBe('No applicant can meet the rules of Standard.');
    expect(
      announce({
        type: 'notice',
        branch: AMBULANCE,
        notice: { kind: 'none_can_meet', today: true },
      })
    ).toBe('No applicant who shares today can meet the rules of Ambulance.');
  });

  it('starts a finding in another variant with "In <variant>: "', () => {
    expect(announce(appeared(withItems('rule-2', ['rule-5']), AMBULANCE))).toBe(
      'In Ambulance: Rule 02 conflicts with Rule 05.'
    );
    expect(announce(gone(withItems('rule-2', ['rule-5']), AMBULANCE))).toBe(
      'In Ambulance: Rule 02 no longer conflicts with Rule 05.'
    );
  });

  it('leaves out names that are gone, and says nothing of an item without a name', () => {
    expect(announce(gone(withItems('rule-2', ['rule-9'])))).toBe(
      'Rule 02 is no longer conflicting.'
    );
    expect(announce(gone(withItems('rule-9', ['rule-2'])))).toBe('');
    expect(announce(appeared(withItems('rule-9', ['rule-2'])))).toBe('');
  });
});

describe('every text', () => {
  it('never words a finding as something to fix (FR-016)', () => {
    const reasons: ConflictingReason[] = [
      { type: 'with', items: ['rule-2', 'rule-3'] },
      { type: 'members', operator: 'and', items: ['rule-4', 'rule-5'] },
      { type: 'members', operator: 'or', items: ['rule-4', 'rule-5', 'rule-6'] },
      { type: 'condition' },
    ];
    const findings = reasons.flatMap((reason) => [
      conflicting('group-3', reason),
      conflicting('group-3', reason, true),
    ]);
    const texts = [
      ...findings.map((finding) => noteOf(finding, NAMES)),
      ...findings.flatMap((finding) => [
        announcementOf({ type: 'appeared', branch: AMBULANCE, finding }, NAMES, STANDARD.key),
        announcementOf({ type: 'gone', branch: AMBULANCE, finding }, NAMES, STANDARD.key),
      ]),
      summaryOf(
        check(findings, { kind: 'none_can_meet', today: true }, { complete: false }),
        STANDARD,
        NAMES
      ),
    ];
    expect(texts.every((text) => text.length > 0)).toBe(true);
    expect(texts.filter((text) => TEXT_TO_FIX.test(text))).toEqual([]);
  });
});
