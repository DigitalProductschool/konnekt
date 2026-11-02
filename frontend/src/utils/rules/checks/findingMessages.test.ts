import { describe, expect, it } from 'vitest';

import type { GroupItem, RuleTreeItem } from '../../../types/form-connections';
import { rule } from '../testData';
import {
  announcementOf,
  bannerOf,
  countsOf,
  dialogLineOf,
  kindTextOf,
  listOf,
  namesOf,
  noteOf,
  noticeText,
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
  RedundantFinding,
  RedundantReason,
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

function redundant(itemId: string, reason: RedundantReason): RedundantFinding {
  return { itemId, kind: 'redundant', reason, today: false };
}

function same(itemId: string, item: string): RedundantFinding {
  return redundant(itemId, { type: 'same', item });
}

function impliedBy(itemId: string, items: string[], orItems: string[] = []): RedundantFinding {
  return redundant(itemId, { type: 'implied_by', items, orItems });
}

function implies(itemId: string, items: string[], givenItems: string[] = []): RedundantFinding {
  return redundant(itemId, { type: 'implies', items, givenItems });
}

function alwaysMet(itemId: string): ItemFinding {
  return { itemId, kind: 'always_met', reason: null, today: false };
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

describe('noteOf for redundant and always-met findings (US2)', () => {
  it('reads U02’s and U04’s duplicate note 6171:7510 / 6178:8216 (FR-005, A3)', () => {
    expect(noteOf(same('rule-6', 'rule-3'), NAMES)).toBe(
      'Same as Rule 03. You can delete one of them.'
    );
  });

  it('reads U07’s note 6753:41298 for a covered group (A5)', () => {
    expect(noteOf(impliedBy('group-1', ['rule-1']), NAMES)).toBe(
      'Anyone who meets Rule 01 also meets this group. You can delete the group.'
    );
  });

  it('words a covered rule in an AND level (W6)', () => {
    expect(noteOf(impliedBy('rule-6', ['rule-4', 'rule-1']), NAMES)).toBe(
      'Anyone who meets Rule 01 and Rule 04 also meets this rule. You can delete the rule.'
    );
  });

  it('words an item that implies others in an OR level (W6, W7)', () => {
    expect(noteOf(implies('rule-3', ['rule-2']), NAMES)).toBe(
      'Anyone who meets this rule also meets Rule 02. You can delete the rule.'
    );
    expect(noteOf(implies('group-3', ['rule-6', 'rule-1']), NAMES)).toBe(
      'Anyone who meets this group also meets Rule 01 or Rule 06. You can delete the group.'
    );
  });

  it('takes in an enclosing level (research R8, step 4; design-notes.md §2.4)', () => {
    expect(noteOf(implies('rule-6', ['rule-1'], ['rule-5']), NAMES)).toBe(
      'Anyone who meets this rule and Rule 05 also meets Rule 01. You can delete the rule.'
    );
    expect(noteOf(impliedBy('rule-4', ['rule-2'], ['group-1']), NAMES)).toBe(
      'Anyone who meets Rule 02 also meets this rule or Group 01. You can delete the rule.'
    );
    expect(noteOf(impliedBy('rule-4', [], ['group-1']), NAMES)).toBe(
      'Every applicant meets this rule or Group 01. You can delete the rule.'
    );
  });

  it('reads U06’s note 6753:40824, and a rule’s (W8)', () => {
    expect(noteOf(alwaysMet('group-1'), NAMES)).toBe('Every applicant meets this group.');
    expect(noteOf(alwaysMet('rule-5'), NAMES)).toBe('Every applicant meets this rule.');
  });

  it('never shows an id for an item without a current name', () => {
    expect(noteOf(same('rule-6', 'rule-9'), NAMES)).toBe(
      'Same as another rule. You can delete one of them.'
    );
    expect(noteOf(impliedBy('rule-6', ['rule-9']), NAMES)).toBe(
      'Anyone who meets other rules also meets this rule. You can delete the rule.'
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

  it('reads U02’s counts row 6750:40933 with a duplicate (A2)', () => {
    const findings = [
      conflicting('group-3', { type: 'members', operator: 'and', items: ['rule-4', 'rule-5'] }),
      ...conflictSet(['rule-4', 'rule-5']),
      same('rule-6', 'rule-3'),
    ];
    expect(countsOf(check(findings))).toBe('2 rules can’t be met together · 1 duplicate rule');
  });

  it('counts duplicates, covered and always-met items after the conflicts (§3.4)', () => {
    const findings = [
      alwaysMet('group-1'),
      same('rule-6', 'rule-3'),
      same('group-3', 'rule-1'),
      same('rule-5', 'rule-1'),
      impliedBy('rule-4', ['rule-1']),
      implies('group-2', ['rule-1']),
      conflicting('rule-2', { type: 'condition' }),
    ];
    expect(countsOf(check(findings))).toBe(
      '1 rule can’t be met · 2 duplicate rules and 1 duplicate group · 1 rule and 1 group ' +
        'already covered · 1 group every applicant meets'
    );
    expect(countsOf(check([impliedBy('group-1', ['rule-1'])]))).toBe('1 group already covered');
    expect(countsOf(check([alwaysMet('rule-1'), alwaysMet('rule-6')]))).toBe(
      '2 rules every applicant meets'
    );
  });

  it('is empty without a finding', () => {
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

describe('bannerOf for redundant and always-met findings (US2)', () => {
  it('reads U04’s line 6750:41077 for a duplicate, info (A1, A2)', () => {
    const banner = bannerOf(check([same('rule-6', 'rule-3')]), STANDARD, NAMES);
    expect(banner).toMatchObject({ kind: 'info', counts: '', notice: null, incomplete: null });
    expect(banner?.lines).toEqual([
      { kind: 'redundant', tone: 'info', parts: [ref(6), ' is the same as ', ref(3), '.'] },
    ]);
    expect(head(banner)).toBe('Rule 06 is the same as Rule 03.');
  });

  it('reads U06’s line 6753:40514 for an always-met group', () => {
    const banner = bannerOf(check([alwaysMet('group-1')]), STANDARD, NAMES);
    expect(banner?.kind).toBe('info');
    expect(banner?.lines).toEqual([
      {
        kind: 'always_met',
        tone: 'info',
        parts: [
          'Every applicant meets ',
          { itemId: 'group-1', name: 'Group 01' },
          ', so it doesn’t check anything.',
        ],
      },
    ]);
    expect(head(banner)).toBe('Every applicant meets Group 01, so it doesn’t check anything.');
  });

  it('reads U07’s line 6753:40851 for a covered group', () => {
    const banner = bannerOf(check([impliedBy('group-1', ['rule-1'])]), STANDARD, NAMES);
    expect(banner?.lines).toEqual([
      {
        kind: 'redundant',
        tone: 'info',
        parts: [
          'Anyone who meets ',
          ref(1),
          ' also meets ',
          { itemId: 'group-1', name: 'Group 01' },
          '.',
        ],
      },
    ]);
    expect(head(banner)).toBe('Anyone who meets Rule 01 also meets Group 01.');
  });

  it('words the OR and enclosing-level forms (W6)', () => {
    const line = (finding: ItemFinding): string =>
      head(bannerOf(check([finding]), STANDARD, NAMES));
    expect(line(implies('rule-3', ['rule-2']))).toBe(
      'Anyone who meets Rule 03 also meets Rule 02.'
    );
    expect(line(implies('rule-6', ['rule-4', 'rule-1']))).toBe(
      'Anyone who meets Rule 06 also meets Rule 01 or Rule 04.'
    );
    expect(line(implies('rule-6', ['rule-1'], ['rule-5']))).toBe(
      'Anyone who meets Rule 06 and Rule 05 also meets Rule 01.'
    );
    expect(line(impliedBy('rule-4', ['rule-2'], ['group-1']))).toBe(
      'Anyone who meets Rule 02 also meets Rule 04 or Group 01.'
    );
    expect(line(impliedBy('rule-4', [], ['group-1']))).toBe(
      'Every applicant meets Rule 04 or Group 01.'
    );
  });

  it('reads U02 and U05: warning with a conflict, the duplicate’s line with the info icon', () => {
    const findings = [
      same('rule-6', 'rule-3'),
      conflicting('group-3', { type: 'members', operator: 'and', items: ['rule-4', 'rule-5'] }),
      ...conflictSet(['rule-4', 'rule-5']),
    ];
    const banner = bannerOf(check(findings), STANDARD, NAMES);
    expect(banner?.kind).toBe('warning');
    expect(banner?.counts).toBe('2 rules can’t be met together · 1 duplicate rule');
    expect(head(banner)).toBe('2 rules can’t be met together · 1 duplicate rule');
    expect(banner?.lines.map((line) => [line.kind, line.tone, textOf(line.parts)])).toEqual([
      ['conflicting', 'warning', 'Sub-group 01: Rule 04 and Rule 05 can’t be met together.'],
      ['redundant', 'info', 'Rule 06 is the same as Rule 03.'],
    ]);
  });

  it('orders every line by its item in display order (§3.1)', () => {
    const findings = [
      alwaysMet('rule-6'),
      same('rule-3', 'rule-2'),
      ...conflictSet(['rule-4', 'rule-5']),
    ];
    const banner = bannerOf(check(findings), STANDARD, NAMES);
    expect(banner?.lines.map((line) => textOf(line.parts))).toEqual([
      'Rule 03 is the same as Rule 02.',
      'Rule 04 and Rule 05 can’t be met together.',
      'Every applicant meets Rule 06, so it doesn’t check anything.',
    ]);
  });

  it('adds the all_meet notice after a line, and after the counts row (W8, §3.2)', () => {
    expect(head(bannerOf(check([alwaysMet('rule-1')], ALL_MEET), STANDARD, NAMES))).toBe(
      'Every applicant meets Rule 01, so it doesn’t check anything. Every applicant meets the ' +
        'rules of Standard.'
    );
    const two = bannerOf(
      check([alwaysMet('rule-1'), same('rule-6', 'rule-3')], ALL_MEET),
      STANDARD,
      NAMES
    );
    expect(two?.kind).toBe('info');
    expect(head(two)).toBe(
      '1 duplicate rule · 1 rule every applicant meets. Every applicant meets the rules of Standard.'
    );
  });

  it('leaves out a line without current names, and never shows an id', () => {
    expect(bannerOf(check([same('rule-9', 'rule-3')]), STANDARD, NAMES)).toBeNull();
    expect(bannerOf(check([same('rule-6', 'rule-9')]), STANDARD, NAMES)).toBeNull();
    expect(bannerOf(check([impliedBy('rule-6', ['rule-9'])]), STANDARD, NAMES)).toBeNull();
    expect(bannerOf(check([implies('rule-6', ['rule-9'])]), STANDARD, NAMES)).toBeNull();
    expect(bannerOf(check([alwaysMet('rule-9')]), STANDARD, NAMES)).toBeNull();
  });
});

describe('dialogLineOf (US4; FR-017, FR-019; W10; design-notes.md §6)', () => {
  const u02 = [
    conflicting('group-3', { type: 'members', operator: 'and', items: ['rule-4', 'rule-5'] }),
    ...conflictSet(['rule-4', 'rule-5']),
    same('rule-6', 'rule-3'),
  ];

  it('reads "<variant>: <counts row>" (W10)', () => {
    expect(dialogLineOf(check(u02), 'Ambulance')).toBe(
      'Ambulance: 2 rules can’t be met together · 1 duplicate rule'
    );
    expect(dialogLineOf(check([same('rule-6', 'rule-3')]), 'Standard')).toBe(
      'Standard: 1 duplicate rule'
    );
    expect(dialogLineOf(check([alwaysMet('rule-5')]), 'Standard')).toBe(
      'Standard: 1 rule every applicant meets'
    );
  });

  it('adds that no applicant can meet the variant after the counts (FR-017, A7)', () => {
    expect(dialogLineOf(check(u02, NONE_CAN_MEET), 'Ambulance')).toBe(
      'Ambulance: 2 rules can’t be met together · 1 duplicate rule. ' +
        'No applicant can meet the rules of Ambulance.'
    );
    expect(dialogLineOf(check(u02, NONE_CAN_MEET_TODAY), 'Ambulance')).toBe(
      'Ambulance: 2 rules can’t be met together · 1 duplicate rule. ' +
        'Right now, no applicant can meet the rules of Ambulance.'
    );
  });

  it('says only the notice when the variant has no finding to count', () => {
    expect(dialogLineOf(check([], NONE_CAN_MEET), 'Ambulance')).toBe(
      'No applicant can meet the rules of Ambulance.'
    );
    expect(dialogLineOf(check([], NONE_CAN_MEET_TODAY), 'Ambulance')).toBe(
      'Right now, no applicant can meet the rules of Ambulance.'
    );
    expect(dialogLineOf(check([], ALL_MEET), 'Ambulance')).toBe(
      'Every applicant meets the rules of Ambulance.'
    );
  });

  it('adds that every applicant meets the variant after other findings', () => {
    expect(dialogLineOf(check([same('rule-6', 'rule-3')], ALL_MEET), 'Standard')).toBe(
      'Standard: 1 duplicate rule. Every applicant meets the rules of Standard.'
    );
  });

  it('doesn’t repeat that the check couldn’t finish (§6)', () => {
    expect(dialogLineOf(check(u02, null, { complete: false }), 'Ambulance')).toBe(
      'Ambulance: 2 rules can’t be met together · 1 duplicate rule'
    );
    expect(dialogLineOf(check([], NONE_CAN_MEET, { complete: false }), 'Ambulance')).toBe(
      'No applicant can meet the rules of Ambulance.'
    );
  });

  it('is null for a variant without findings (US4-AS4, W13)', () => {
    expect(dialogLineOf(check([]), 'Standard')).toBeNull();
    expect(dialogLineOf(check([], null, { complete: false }), 'Standard')).toBeNull();
    expect(dialogLineOf(check(u02, NONE_CAN_MEET, { checkedRules: 0 }), 'Standard')).toBeNull();
  });
});

describe('noticeText (spec 004, FR-018)', () => {
  it('words the notice that the test step shows above the results and in the tab', () => {
    expect(noticeText({ kind: 'none_can_meet', today: false }, 'Standard')).toBe(
      'No applicant can meet the rules of Standard.'
    );
  });

  it('keeps its other forms', () => {
    expect(noticeText({ kind: 'none_can_meet', today: true }, 'Standard')).toBe(
      'Right now, no applicant can meet the rules of Standard.'
    );
    expect(noticeText({ kind: 'all_meet', today: false }, 'Standard')).toBe(
      'Every applicant meets the rules of Standard.'
    );
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

  it('reads U11’s tooltip 6758:43967, "1 duplicate: <line>"', () => {
    expect(tabFindingsOf(check([same('rule-6', 'rule-3')]), STANDARD, NAMES)).toEqual({
      kind: 'info',
      text: '1 duplicate: Rule 06 is the same as Rule 03.',
    });
  });

  it('reads "1 finding: <line>" for a covered or always-met item (W20)', () => {
    expect(tabFindingsOf(check([impliedBy('group-1', ['rule-1'])]), STANDARD, NAMES)?.text).toBe(
      '1 finding: Anyone who meets Rule 01 also meets Group 01.'
    );
    expect(tabFindingsOf(check([alwaysMet('group-1')], ALL_MEET), STANDARD, NAMES)).toEqual({
      kind: 'info',
      text:
        '1 finding: Every applicant meets Group 01, so it doesn’t check anything. Every ' +
        'applicant meets the rules of Standard.',
    });
  });

  it('reads U10’s counts row with a duplicate', () => {
    const findings = [...conflictSet(['rule-4', 'rule-5']), same('rule-6', 'rule-3')];
    expect(tabFindingsOf(check(findings), STANDARD, NAMES)).toEqual({
      kind: 'warning',
      text: '2 rules can’t be met together · 1 duplicate rule',
    });
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

  it('announces a redundant finding that appears and goes (FR-015)', () => {
    expect(announce(appeared(same('rule-6', 'rule-3')))).toBe('Rule 06 is the same as Rule 03.');
    expect(announce(appeared(impliedBy('rule-1', ['rule-2'])))).toBe(
      'Rule 01 makes no difference beside Rule 02.'
    );
    expect(announce(appeared(implies('rule-6', ['rule-1'], ['rule-5'])))).toBe(
      'Rule 06 makes no difference beside Rule 01 and Rule 05.'
    );
    expect(announce(appeared(impliedBy('rule-4', [], ['group-1'])))).toBe(
      'Rule 04 makes no difference beside Group 01.'
    );
    expect(announce(gone(same('rule-6', 'rule-3')))).toBe('Rule 06 is no longer redundant.');
    expect(announce(gone(impliedBy('rule-1', ['rule-2'])))).toBe('Rule 01 is no longer redundant.');
  });

  it('announces an always-met finding that appears and goes (FR-015)', () => {
    expect(announce(appeared(alwaysMet('rule-5')))).toBe('Every applicant meets Rule 05.');
    expect(announce(gone(alwaysMet('rule-5')))).toBe('Rule 05 is no longer always met.');
    expect(announce(appeared(alwaysMet('group-1'), AMBULANCE))).toBe(
      'In Ambulance: Every applicant meets Group 01.'
    );
  });

  it('announces the all_meet notice with its own text', () => {
    expect(announce({ type: 'notice', branch: STANDARD, notice: ALL_MEET })).toBe(
      'Every applicant meets the rules of Standard.'
    );
  });

  it('says nothing of a redundant finding whose names are gone', () => {
    expect(announce(appeared(same('rule-6', 'rule-9')))).toBe('');
    expect(announce(appeared(impliedBy('rule-6', ['rule-9'])))).toBe('');
    expect(announce(appeared(alwaysMet('rule-9')))).toBe('');
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

describe('the variants’ findings (US3; FR-014, FR-015)', () => {
  // Ambulance's own tree: Standard's Rule 01 to Rule 05, then its own Rule 06
  const AMBULANCE_NAMES = namesOf([1, 2, 3, 4, 5, 6].map((number) => rule(number, null, null)));

  function ambulance(
    findings: ItemFinding[],
    notice: BranchNotice | null = null,
    options: { complete?: boolean; checkedRules?: number } = {}
  ): BranchCheck {
    return { ...check(findings, notice, options), branchKey: AMBULANCE.key };
  }

  /** US3-AS1: Standard's Rule 02 changed, so that Rule 02 and Rule 05 conflict in Ambulance */
  const AS1 = conflictSet(['rule-2', 'rule-5']);
  /** U03 and U10: the conflict, and a duplicate */
  const U03 = [...AS1, same('rule-6', 'rule-3')];

  it('labels the icon of any variant’s tab, selected or not (A6)', () => {
    expect(tabLabelOf(AMBULANCE.name)).toBe('Ambulance has findings');
    expect(tabLabelOf('Passenger transport (night)')).toBe(
      'Passenger transport (night) has findings'
    );
  });

  it('reads U10’s tooltip segment 6758:43524 for Ambulance, with the warning icon', () => {
    expect(tabFindingsOf(ambulance(U03), AMBULANCE, AMBULANCE_NAMES)).toEqual({
      kind: 'warning',
      text: '2 rules can’t be met together · 1 duplicate rule',
    });
  });

  it('names the variant in the tooltip’s notice and incomplete sentence (W20)', () => {
    expect(tabFindingsOf(ambulance(AS1, NONE_CAN_MEET), AMBULANCE, AMBULANCE_NAMES)).toEqual({
      kind: 'warning',
      text:
        '1 conflict: Rule 02 and Rule 05 can’t be met together. So no applicant can meet the ' +
        'rules of Ambulance.',
    });
    expect(
      tabFindingsOf(ambulance(U03, null, { complete: false }), AMBULANCE, AMBULANCE_NAMES)?.text
    ).toBe('2 rules can’t be met together · 1 duplicate rule · couldn’t be checked completely');
    expect(
      tabFindingsOf(ambulance([same('rule-6', 'rule-3')]), AMBULANCE, AMBULANCE_NAMES)
    ).toEqual({ kind: 'info', text: '1 duplicate: Rule 06 is the same as Rule 03.' });
  });

  it('shows no segment for a variant without checked rules (W13)', () => {
    expect(
      tabFindingsOf(ambulance(AS1, null, { checkedRules: 0 }), AMBULANCE, AMBULANCE_NAMES)
    ).toBeNull();
    expect(tabFindingsOf(ambulance([]), AMBULANCE, AMBULANCE_NAMES)).toBeNull();
  });

  it('reads U03’s banner 6750:41008 without "in this variant"', () => {
    const banner = bannerOf(ambulance(U03), AMBULANCE, AMBULANCE_NAMES);
    expect(banner).toMatchObject({
      kind: 'warning',
      counts: '2 rules can’t be met together · 1 duplicate rule',
      notice: null,
      incomplete: null,
    });
    expect(head(banner)).toBe('2 rules can’t be met together · 1 duplicate rule');
    expect(banner?.lines.map((line) => textOf(line.parts))).toEqual([
      'Rule 02 and Rule 05 can’t be met together.',
      'Rule 06 is the same as Rule 03.',
    ]);
  });

  it('never says "variant" in a variant’s banner or tooltip; the notices name it', () => {
    const findings = [
      ...AS1,
      same('rule-6', 'rule-3'),
      impliedBy('rule-4', ['rule-1']),
      alwaysMet('rule-1'),
    ];
    const notices = [null, NONE_CAN_MEET, NONE_CAN_MEET_TODAY, ALL_MEET];
    const checks = notices.flatMap((notice) =>
      [true, false].flatMap((complete) => [
        ambulance(AS1, notice, { complete }),
        ambulance(findings, notice, { complete }),
      ])
    );
    const texts = checks.flatMap((ambulanceCheck) => {
      const banner = bannerOf(ambulanceCheck, AMBULANCE, AMBULANCE_NAMES);
      return [
        head(banner),
        ...(banner?.lines.map((line) => textOf(line.parts)) ?? []),
        banner?.notice?.text ?? '',
        banner?.incomplete ?? '',
        tabFindingsOf(ambulanceCheck, AMBULANCE, AMBULANCE_NAMES)?.text ?? '',
      ];
    });
    expect(texts.filter((text) => /\bvariants?\b/i.test(text))).toEqual([]);
    expect(texts.filter((text) => TEXT_TO_FIX.test(text))).toEqual([]);
    expect(texts.filter((text) => text.includes('Standard'))).toEqual([]);
    expect(texts).toContain('Right now, no applicant can meet the rules of Ambulance.');
  });

  it('announces a finding in another variant with "In <variant>: " (design-notes.md §5)', () => {
    const announce = (change: FindingChange, shown = STANDARD.key): string =>
      announcementOf(change, AMBULANCE_NAMES, shown);
    const appeared = (finding: ItemFinding): FindingChange => ({
      type: 'appeared',
      branch: AMBULANCE,
      finding,
    });
    const gone = (finding: ItemFinding): FindingChange => ({
      type: 'gone',
      branch: AMBULANCE,
      finding,
    });
    expect(announce(appeared(AS1[0]))).toBe('In Ambulance: Rule 02 conflicts with Rule 05.');
    expect(announce(appeared(withItems('rule-2', ['rule-5'], true)))).toBe(
      'In Ambulance: Rule 02 conflicts with Rule 05 at the moment.'
    );
    expect(announce(gone(AS1[0]))).toBe('In Ambulance: Rule 02 no longer conflicts with Rule 05.');
    expect(announce(appeared(conflicting('rule-3', { type: 'condition' })))).toBe(
      'In Ambulance: No applicant can meet Rule 03.'
    );
    expect(announce(appeared(same('rule-6', 'rule-3')))).toBe(
      'In Ambulance: Rule 06 is the same as Rule 03.'
    );
    expect(announce(gone(same('rule-6', 'rule-3')))).toBe(
      'In Ambulance: Rule 06 is no longer redundant.'
    );
    expect(announce(appeared(impliedBy('rule-4', ['rule-1'])))).toBe(
      'In Ambulance: Rule 04 makes no difference beside Rule 01.'
    );
    expect(announce(gone(alwaysMet('rule-1')))).toBe(
      'In Ambulance: Rule 01 is no longer always met.'
    );
    // A notice names its variant already
    expect(announce({ type: 'notice', branch: AMBULANCE, notice: NONE_CAN_MEET })).toBe(
      'No applicant can meet the rules of Ambulance.'
    );
    // Shown, Ambulance's findings have no prefix, and Standard's have one
    expect(announce(appeared(AS1[0]), AMBULANCE.key)).toBe('Rule 02 conflicts with Rule 05.');
    expect(
      announcementOf(
        { type: 'appeared', branch: STANDARD, finding: withItems('rule-2', ['rule-1']) },
        NAMES,
        AMBULANCE.key
      )
    ).toBe('In Standard: Rule 02 conflicts with Rule 01.');
  });

  it('names a group in another variant by its own name (design-notes.md §5)', () => {
    const own = conflicting('group-3', {
      type: 'members',
      operator: 'and',
      items: ['rule-4', 'rule-5'],
    });
    expect(announcementOf({ type: 'appeared', branch: AMBULANCE, finding: own }, NAMES, '')).toBe(
      'In Ambulance: Rule 04 and Rule 05 in Sub-group 01 can’t be met together.'
    );
    expect(announcementOf({ type: 'gone', branch: AMBULANCE, finding: own }, NAMES, '')).toBe(
      'In Ambulance: Sub-group 01 is no longer conflicting.'
    );
  });

  it('says nothing of a finding in another variant on an item without a name', () => {
    expect(
      announcementOf(
        { type: 'appeared', branch: AMBULANCE, finding: withItems('rule-9', ['rule-2']) },
        AMBULANCE_NAMES,
        STANDARD.key
      )
    ).toBe('');
  });
});

describe('every text', () => {
  const reasons: ConflictingReason[] = [
    { type: 'with', items: ['rule-2', 'rule-3'] },
    { type: 'members', operator: 'and', items: ['rule-4', 'rule-5'] },
    { type: 'members', operator: 'or', items: ['rule-4', 'rule-5', 'rule-6'] },
    { type: 'condition' },
  ];
  const findings: ItemFinding[] = [
    ...reasons.flatMap((reason) => [
      conflicting('group-3', reason),
      conflicting('group-3', reason, true),
    ]),
    same('rule-6', 'rule-3'),
    impliedBy('group-1', ['rule-1']),
    impliedBy('rule-4', ['rule-2'], ['group-1']),
    impliedBy('rule-4', [], ['group-1']),
    implies('rule-3', ['rule-2']),
    implies('rule-6', ['rule-1'], ['rule-5']),
    alwaysMet('group-1'),
    alwaysMet('rule-5'),
  ];
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
          [
            ...conflictSet(['rule-1', 'rule-2']),
            ...conflictSet(['rule-5', 'rule-6']),
            same('rule-4', 'rule-3'),
            alwaysMet('group-1'),
            impliedBy('rule-2', ['rule-1']),
          ],
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
    ...notices.flatMap((notice) => [
      dialogLineOf(check([], notice), AMBULANCE.name) ?? '',
      dialogLineOf(check(findings, notice), AMBULANCE.name) ?? '',
    ]),
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
