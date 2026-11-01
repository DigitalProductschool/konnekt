import { describe, expect, it } from 'vitest';

import type { GroupItem, RuleTreeItem } from '../../../types/form-connections';
import { rule } from '../testData';
import {
  announcementOf,
  bannerOf,
  countsOf,
  kindTextOf,
  listOf,
  namesOf,
  noteOf,
  tabFindingsOf,
  tabLabelOf,
  textOf,
} from './findingMessages';
import type {
  BranchCheck,
  BranchNotice,
  ConflictingFinding,
  ConflictingReason,
  FindingChange,
  FindingsBanner,
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

const NONE_CAN_MEET: BranchNotice = { kind: 'none_can_meet', today: false };
const NONE_CAN_MEET_TODAY: BranchNotice = { kind: 'none_can_meet', today: true };
const ALL_MEET: BranchNotice = { kind: 'all_meet', today: false };

function conflicting(itemId: string, reason: ConflictingReason, today = false): ConflictingFinding {
  return { itemId, kind: 'conflicting', reason, today };
}

function withItems(itemId: string, items: string[], today = false): ConflictingFinding {
  return conflicting(itemId, { type: 'with', items }, today);
}

/** Each of `ids` conflicting with the others, as the checks report a conflict set */
function conflictSet(ids: string[], today = false): ConflictingFinding[] {
  return ids.map((id) =>
    withItems(
      id,
      ids.filter((other) => other !== id),
      today
    )
  );
}

function check(
  findings: ItemFinding[],
  notice: BranchNotice | null = null,
  { complete = true, checkedRules = 6 } = {}
): BranchCheck {
  return { branchKey: STANDARD.key, fingerprint: 'f', complete, notice, findings, checkedRules };
}

/** The banner's single or collapsed text, its names as they read */
function head(banner: FindingsBanner | null): string {
  return banner ? textOf(banner.head) : '';
}

function ref(number: number): { itemId: string; name: string } {
  return { itemId: `rule-${number}`, name: `Rule ${String(number).padStart(2, '0')}` };
}

const TEXT_TO_FIX = /\b(fix|error|mistake|resolve|correct|wrong)/i;
/** The voice of 2026-10-28, which the redesign replaced */
const OLD_VOICE = /Conflicting\.|nobody|who share|conflicting rule|conflicting group/;

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

describe('kindTextOf', () => {
  it('gives the icons’ hidden texts (A3, W19)', () => {
    expect(kindTextOf('conflicting')).toBe('Conflicting:');
    expect(kindTextOf('redundant')).toBe('Redundant:');
    expect(kindTextOf('always_met')).toBe('Always met:');
  });
});

describe('noteOf', () => {
  it('reads U01’s note 6171:7010, without a kind (FR-003, A3)', () => {
    expect(noteOf(withItems('rule-1', ['rule-2']), NAMES)).toBe(
      'Can’t be met together with Rule 02.'
    );
    expect(noteOf(withItems('group-1', ['rule-1']), NAMES)).toBe(
      'Can’t be met together with Rule 01.'
    );
  });

  it('lists several items in display order (EC-11, W3)', () => {
    expect(noteOf(withItems('rule-1', ['rule-4', 'rule-2', 'rule-3']), NAMES)).toBe(
      'Can’t be met together with Rule 02, Rule 03 and Rule 04.'
    );
  });

  it('reads U08’s note 6753:41332 for a conflict that holds today (FR-008, A7)', () => {
    expect(noteOf(withItems('rule-1', ['rule-2'], true), NAMES)).toBe(
      'Can’t be met together with Rule 02 at the moment.'
    );
  });

  it('reads U02’s group note 6750:41000 for an AND group’s members (A5)', () => {
    const finding = conflicting('group-3', {
      type: 'members',
      operator: 'and',
      items: ['rule-4', 'rule-5'],
    });
    expect(noteOf(finding, NAMES)).toBe('Rule 04 and Rule 05 in this group can’t be met together.');
    expect(noteOf({ ...finding, today: true }, NAMES)).toBe(
      'Rule 04 and Rule 05 in this group can’t be met together at the moment.'
    );
  });

  it('says that none of an OR group’s members can be met (W18)', () => {
    const two = conflicting('group-1', {
      type: 'members',
      operator: 'or',
      items: ['rule-2', 'rule-3'],
    });
    expect(noteOf(two, NAMES)).toBe('Neither Rule 02 nor Rule 03 in this group can be met.');
    expect(noteOf({ ...two, today: true }, NAMES)).toBe(
      'Neither Rule 02 nor Rule 03 in this group can be met at the moment.'
    );
    const three = conflicting('group-2', {
      type: 'members',
      operator: 'or',
      items: ['rule-4', 'rule-5', 'rule-6'],
    });
    expect(noteOf(three, NAMES)).toBe(
      'None of Rule 04, Rule 05 and Rule 06 in this group can be met.'
    );
  });

  it('names a group’s single member that can’t be met (design-notes.md §2.2)', () => {
    const finding = conflicting('group-2', {
      type: 'members',
      operator: 'and',
      items: ['group-3'],
    });
    expect(noteOf(finding, NAMES)).toBe('Sub-group 01 in this group can’t be met.');
    expect(noteOf({ ...finding, today: true }, NAMES)).toBe(
      'Sub-group 01 in this group can’t be met at the moment.'
    );
  });

  it('says that no applicant can meet a rule on its own (W18, design-notes.md §2.3)', () => {
    const finding = conflicting('rule-3', { type: 'condition' });
    expect(noteOf(finding, NAMES)).toBe('No applicant can meet this rule.');
    expect(noteOf({ ...finding, today: true }, NAMES)).toBe(
      'No applicant can meet this rule at the moment.'
    );
  });

  it('shows the current names, so that a rename shows at once (FR-011)', () => {
    const renamed = namesOf([rule(1, null, null), rule(2, null, null, 'x', 'Minimum age')]);
    expect(noteOf(withItems('rule-1', ['rule-2']), renamed)).toBe(
      'Can’t be met together with Minimum age.'
    );
  });

  it('leaves out an item without a current name, and never shows an id', () => {
    expect(noteOf(withItems('rule-1', ['rule-2', 'rule-9']), NAMES)).toBe(
      'Can’t be met together with Rule 02.'
    );
    expect(noteOf(withItems('rule-1', ['rule-9']), NAMES)).toBe(
      'Can’t be met together with other rules.'
    );
  });
});

describe('countsOf', () => {
  it('counts the rules of conflict sets (U02 6750:40933, A2)', () => {
    expect(countsOf(check(conflictSet(['rule-1', 'rule-2'])))).toBe(
      '2 rules can’t be met together'
    );
    expect(countsOf(check(conflictSet(['rule-1', 'group-1'])))).toBe(
      '1 rule and 1 group can’t be met together'
    );
  });

  it('doesn’t count a group whose own conflict names its members (§3.4)', () => {
    const findings = [
      conflicting('group-3', { type: 'members', operator: 'and', items: ['rule-4', 'rule-5'] }),
      ...conflictSet(['rule-4', 'rule-5']),
    ];
    expect(countsOf(check(findings))).toBe('2 rules can’t be met together');
  });

  it('counts the rules that can’t be met on their own after the sets', () => {
    expect(countsOf(check([conflicting('rule-3', { type: 'condition' })]))).toBe(
      '1 rule can’t be met'
    );
    const findings = [
      ...conflictSet(['rule-1', 'rule-2']),
      conflicting('rule-3', { type: 'condition' }),
      conflicting('rule-6', { type: 'condition' }),
    ];
    expect(countsOf(check(findings))).toBe('2 rules can’t be met together · 2 rules can’t be met');
  });

  it('is empty without a conflict', () => {
    expect(countsOf(check([]))).toBe('');
  });
});

describe('bannerOf', () => {
  it('reads U01’s banner 6750:40882: one line and the notice (A1, A2)', () => {
    const banner = bannerOf(
      check(conflictSet(['rule-1', 'rule-2']), NONE_CAN_MEET),
      STANDARD,
      NAMES
    );
    expect(banner).toEqual({
      kind: 'warning',
      lines: [
        {
          kind: 'conflicting',
          tone: 'warning',
          parts: [ref(1), ' and ', ref(2), ' can’t be met together.'],
        },
      ],
      counts: '',
      notice: {
        tone: 'warning',
        text: 'No applicant can meet the rules of Standard.',
        appended: 'So no applicant can meet the rules of Standard.',
      },
      incomplete: null,
      head: [
        ref(1),
        ' and ',
        ref(2),
        ' can’t be met together. So no applicant can meet the rules of Standard.',
      ],
    });
    expect(head(banner)).toBe(
      'Rule 01 and Rule 02 can’t be met together. So no applicant can meet the rules of Standard.'
    );
  });

  it('reads U08’s banner 6753:41324 for a conflict that holds today (FR-008, A7)', () => {
    const banner = bannerOf(
      check(conflictSet(['rule-1', 'rule-2'], true), NONE_CAN_MEET_TODAY),
      STANDARD,
      NAMES
    );
    expect(head(banner)).toBe(
      'Rule 01 and Rule 02 can’t be met together at the moment. Right now, no applicant can ' +
        'meet the rules of Standard.'
    );
    expect(banner?.notice?.text).toBe('Right now, no applicant can meet the rules of Standard.');
  });

  it('reads U05’s line 6753:40144: a set within a group’s own conflict goes on its line', () => {
    const findings = [
      conflicting('group-3', { type: 'members', operator: 'and', items: ['rule-4', 'rule-5'] }),
      ...conflictSet(['rule-4', 'rule-5']),
    ];
    const banner = bannerOf(check(findings), STANDARD, NAMES);
    expect(banner?.lines).toEqual([
      {
        kind: 'conflicting',
        tone: 'warning',
        parts: [
          { itemId: 'group-3', name: 'Sub-group 01' },
          ': ',
          ref(4),
          ' and ',
          ref(5),
          ' can’t be met together.',
        ],
      },
    ]);
    expect(head(banner)).toBe('Sub-group 01: Rule 04 and Rule 05 can’t be met together.');
  });

  it('puts the four rules of EC-11 on one line (W3)', () => {
    const banner = bannerOf(
      check(conflictSet(['rule-1', 'rule-2', 'rule-3', 'rule-4']), NONE_CAN_MEET),
      STANDARD,
      NAMES
    );
    expect(banner?.lines).toHaveLength(1);
    expect(head(banner)).toBe(
      'Rule 01, Rule 02, Rule 03 and Rule 04 can’t be met together. So no applicant can meet the ' +
        'rules of Standard.'
    );
  });

  it('collapses two or more lines into the counts row (§3.3, §3.5)', () => {
    const findings = [
      ...conflictSet(['rule-1', 'rule-2', 'rule-3', 'rule-4']),
      ...conflictSet(['rule-5', 'rule-6']),
    ];
    const banner = bannerOf(check(findings, NONE_CAN_MEET), STANDARD, NAMES);
    expect(banner?.lines.map((line) => textOf(line.parts))).toEqual([
      'Rule 01, Rule 02, Rule 03 and Rule 04 can’t be met together.',
      'Rule 05 and Rule 06 can’t be met together.',
    ]);
    expect(banner?.counts).toBe('6 rules can’t be met together');
    expect(head(banner)).toBe(
      '6 rules can’t be met together. So no applicant can meet the rules of Standard.'
    );
    expect(head(bannerOf(check(findings), STANDARD, NAMES))).toBe('6 rules can’t be met together');
  });

  it('orders the lines by their first item in display order, whatever the findings’ order', () => {
    const findings = [withItems('rule-6', ['rule-5']), withItems('rule-2', ['rule-1'])];
    expect(
      bannerOf(check(findings), STANDARD, NAMES)?.lines.map((line) => textOf(line.parts))
    ).toEqual([
      'Rule 01 and Rule 02 can’t be met together.',
      'Rule 05 and Rule 06 can’t be met together.',
    ]);
  });

  it('words an OR group’s and a one-member group’s own conflict (W18)', () => {
    const lineOf = (finding: ConflictingFinding): string =>
      textOf(bannerOf(check([finding]), STANDARD, NAMES)?.lines[0]?.parts ?? []);
    expect(
      lineOf(
        conflicting('group-1', { type: 'members', operator: 'or', items: ['rule-2', 'rule-3'] })
      )
    ).toBe('Group 01: neither Rule 02 nor Rule 03 can be met.');
    expect(
      lineOf(
        conflicting('group-2', {
          type: 'members',
          operator: 'or',
          items: ['rule-4', 'rule-5', 'rule-6'],
        })
      )
    ).toBe('Group 02: none of Rule 04, Rule 05 and Rule 06 can be met.');
    expect(
      lineOf(conflicting('group-2', { type: 'members', operator: 'and', items: ['group-3'] }, true))
    ).toBe('Group 02: Sub-group 01 can’t be met at the moment.');
  });

  it('puts the rules that can’t be met on their own on an OR group’s line', () => {
    const findings = [
      conflicting('group-1', { type: 'members', operator: 'or', items: ['rule-2', 'rule-3'] }),
      conflicting('rule-2', { type: 'condition' }),
      conflicting('rule-3', { type: 'condition' }),
    ];
    const banner = bannerOf(check(findings), STANDARD, NAMES);
    expect(banner?.lines).toHaveLength(1);
    expect(head(banner)).toBe('Group 01: neither Rule 02 nor Rule 03 can be met.');
  });

  it('words a rule that can’t be met on its own (W18)', () => {
    const banner = bannerOf(
      check([conflicting('rule-1', { type: 'condition' })], NONE_CAN_MEET),
      STANDARD,
      NAMES
    );
    expect(banner?.lines[0].parts).toEqual(['No applicant can meet ', ref(1), '.']);
    expect(head(banner)).toBe(
      'No applicant can meet Rule 01. So no applicant can meet the rules of Standard.'
    );
    expect(
      head(bannerOf(check([conflicting('rule-1', { type: 'condition' }, true)]), STANDARD, NAMES))
    ).toBe('No applicant can meet Rule 01 at the moment.');
  });

  it('shows the notice alone as its own item (W17)', () => {
    const banner = bannerOf(check([], NONE_CAN_MEET), AMBULANCE, NAMES);
    expect(banner).toMatchObject({ kind: 'warning', lines: [], counts: '' });
    expect(head(banner)).toBe('No applicant can meet the rules of Ambulance.');
  });

  it('is info when every applicant meets the variant (W8)', () => {
    const banner = bannerOf(check([], ALL_MEET), STANDARD, NAMES);
    expect(banner).toMatchObject({
      kind: 'info',
      notice: {
        tone: 'info',
        text: 'Every applicant meets the rules of Standard.',
        appended: 'Every applicant meets the rules of Standard.',
      },
    });
    expect(head(banner)).toBe('Every applicant meets the rules of Standard.');
  });

  it('adds FR-010’s sentence after an incomplete check, alone without certain findings (W12)', () => {
    const alone = bannerOf(check([], null, { complete: false }), STANDARD, NAMES);
    expect(alone).toMatchObject({ kind: 'info', lines: [] });
    expect(head(alone)).toBe(
      'The rules of Standard couldn’t be checked completely. Only findings that are certain are ' +
        'shown.'
    );
    expect(
      head(
        bannerOf(
          check(conflictSet(['rule-1', 'rule-2']), null, { complete: false }),
          AMBULANCE,
          NAMES
        )
      )
    ).toBe(
      'Rule 01 and Rule 02 can’t be met together. The rules of Ambulance couldn’t be checked ' +
        'completely. Only findings that are certain are shown.'
    );
  });

  it('ends the counts row with " · couldn’t be checked completely" (§3.2)', () => {
    const findings = [...conflictSet(['rule-1', 'rule-2']), ...conflictSet(['rule-5', 'rule-6'])];
    const banner = bannerOf(check(findings, NONE_CAN_MEET, { complete: false }), STANDARD, NAMES);
    expect(banner?.counts).toBe('4 rules can’t be met together');
    expect(banner?.incomplete).toBe(
      'The rules of Standard couldn’t be checked completely. Only findings that are certain are ' +
        'shown.'
    );
    expect(head(banner)).toBe(
      '4 rules can’t be met together · couldn’t be checked completely. So no applicant can meet ' +
        'the rules of Standard.'
    );
  });

  it('is null without findings, or without checked rules (W13)', () => {
    expect(bannerOf(check([]), STANDARD, NAMES)).toBeNull();
    expect(
      bannerOf(check([], NONE_CAN_MEET, { complete: false, checkedRules: 0 }), STANDARD, NAMES)
    ).toBeNull();
  });

  it('names the items and the variant by their current names (FR-011)', () => {
    const renamed = namesOf([rule(1, null, null), rule(2, null, null, 'x', 'Minimum age')]);
    expect(
      head(bannerOf(check(conflictSet(['rule-1', 'rule-2']), NONE_CAN_MEET), AMBULANCE, renamed))
    ).toBe(
      'Rule 01 and Minimum age can’t be met together. So no applicant can meet the rules of ' +
        'Ambulance.'
    );
  });

  it('leaves out a line without current names, and never shows an id', () => {
    expect(bannerOf(check([withItems('rule-1', ['rule-9'])]), STANDARD, NAMES)).toBeNull();
  });
});

describe('tabLabelOf', () => {
  it('reads "<variant> has findings" (A6)', () => {
    expect(tabLabelOf('Standard')).toBe('Standard has findings');
    expect(tabLabelOf('Ambulance')).toBe('Ambulance has findings');
  });
});

describe('tabFindingsOf', () => {
  it('reads "1 conflict: <line>" for one line, with the notice (W20)', () => {
    expect(
      tabFindingsOf(check(conflictSet(['rule-1', 'rule-2']), NONE_CAN_MEET), STANDARD, NAMES)
    ).toEqual({
      kind: 'warning',
      text:
        '1 conflict: Rule 01 and Rule 02 can’t be met together. So no applicant can meet the ' +
        'rules of Standard.',
    });
  });

  it('reads the counts row for two or more lines (U10 6758:43524)', () => {
    const findings = [...conflictSet(['rule-1', 'rule-2']), ...conflictSet(['rule-5', 'rule-6'])];
    expect(tabFindingsOf(check(findings), STANDARD, NAMES)).toEqual({
      kind: 'warning',
      text: '4 rules can’t be met together',
    });
  });

  it('reads a notice or FR-010’s sentence alone', () => {
    expect(tabFindingsOf(check([], ALL_MEET), STANDARD, NAMES)).toEqual({
      kind: 'info',
      text: 'Every applicant meets the rules of Standard.',
    });
    expect(tabFindingsOf(check([], null, { complete: false }), AMBULANCE, NAMES)?.text).toBe(
      'The rules of Ambulance couldn’t be checked completely. Only findings that are certain are ' +
        'shown.'
    );
  });

  it('is null without a banner', () => {
    expect(tabFindingsOf(check([]), STANDARD, NAMES)).toBeNull();
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

  it('says "at the moment" for a new conflict that holds today (A7)', () => {
    expect(announce(appeared(withItems('rule-2', ['rule-1'], true)))).toBe(
      'Rule 02 conflicts with Rule 01 at the moment.'
    );
  });

  it('words groups as design-notes.md §5 says', () => {
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
      'Rule 04 and Rule 05 in Sub-group 01 can’t be met together at the moment.'
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
      'Right now, no applicant can meet Rule 03.'
    );
    expect(announce(gone(finding))).toBe('Rule 03 is no longer conflicting.');
  });

  it('announces a new notice with its own text, without a prefix', () => {
    expect(announce({ type: 'notice', branch: STANDARD, notice: NONE_CAN_MEET })).toBe(
      'No applicant can meet the rules of Standard.'
    );
    expect(announce({ type: 'notice', branch: AMBULANCE, notice: NONE_CAN_MEET_TODAY })).toBe(
      'Right now, no applicant can meet the rules of Ambulance.'
    );
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
  const notices = [NONE_CAN_MEET, NONE_CAN_MEET_TODAY, ALL_MEET];
  const banners = notices.flatMap((notice) =>
    [true, false].flatMap((complete) => [
      bannerOf(
        check([...conflictSet(['rule-1', 'rule-2'])], notice, { complete }),
        STANDARD,
        NAMES
      ),
      bannerOf(
        check(
          [...conflictSet(['rule-1', 'rule-2']), ...conflictSet(['rule-5', 'rule-6'])],
          notice,
          {
            complete,
          }
        ),
        STANDARD,
        NAMES
      ),
    ])
  );
  const texts = [
    ...findings.map((finding) => noteOf(finding, NAMES)),
    ...findings.flatMap((finding) => [
      announcementOf({ type: 'appeared', branch: AMBULANCE, finding }, NAMES, STANDARD.key),
      announcementOf({ type: 'gone', branch: AMBULANCE, finding }, NAMES, STANDARD.key),
    ]),
    ...notices.map((notice) =>
      announcementOf({ type: 'notice', branch: STANDARD, notice }, NAMES, STANDARD.key)
    ),
    ...banners.flatMap((banner) => [
      head(banner),
      ...(banner?.lines.map((line) => textOf(line.parts)) ?? []),
      banner?.notice?.text ?? '',
      banner?.incomplete ?? 'complete',
    ]),
    ...findings.map((finding) => tabFindingsOf(check([finding]), STANDARD, NAMES)?.text ?? ''),
  ];

  it('are all there', () => {
    expect(texts.filter((text) => text.length === 0)).toEqual([]);
  });

  it('never word a finding as something to fix (FR-016)', () => {
    expect(texts.filter((text) => TEXT_TO_FIX.test(text))).toEqual([]);
  });

  it('use the redesign’s voice, with typographic apostrophes (design-notes.md §1)', () => {
    expect(texts.filter((text) => OLD_VOICE.test(text) || text.includes("'"))).toEqual([]);
  });
});
