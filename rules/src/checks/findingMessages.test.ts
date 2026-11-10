import type { GroupItem, RuleTreeItem } from '@connection-portal/api-types/form-connections';
import { describe, expect, it } from 'vitest';

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
  resolutionOf,
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

  it('joins with " und " and " oder " in German (glossary §3)', () => {
    expect(listOf([], 'and', 'de')).toBe('');
    expect(listOf(['Rule 02'], 'and', 'de')).toBe('Rule 02');
    expect(listOf(['Rule 02', 'Rule 03'], 'and', 'de')).toBe('Rule 02 und Rule 03');
    expect(listOf(['Rule 02', 'Rule 03', 'Rule 04'], 'and', 'de')).toBe(
      'Rule 02, Rule 03 und Rule 04'
    );
    expect(listOf(['Rule 04', 'Rule 05', 'Rule 06'], 'or', 'de')).toBe(
      'Rule 04, Rule 05 oder Rule 06'
    );
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

  it('gives the icons’ hidden texts in German (glossary §2)', () => {
    expect(kindTextOf('conflicting', 'de')).toBe('Widersprüchlich:');
    expect(kindTextOf('redundant', 'de')).toBe('Redundant:');
    expect(kindTextOf('always_met', 'de')).toBe('Immer erfüllt:');
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
    expect(noteOf(finding, NAMES)).toBe('Rule 04 and Rule 05 in this group contradict each other.');
    expect(noteOf({ ...finding, today: true }, NAMES)).toBe(
      'Rule 04 and Rule 05 in this group contradict each other at the moment.'
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

  it('says that no citizen can meet a rule on its own (W18, design-notes.md §2.3)', () => {
    const finding = conflicting('rule-3', { type: 'condition' });
    expect(noteOf(finding, NAMES)).toBe('No citizen can meet this rule.');
    expect(noteOf({ ...finding, today: true }, NAMES)).toBe(
      'No citizen can meet this rule at the moment.'
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

  it('reads the conflicts’ notes in German (glossary §3)', () => {
    const de = (finding: ItemFinding, names = NAMES): string => noteOf(finding, names, 'de');
    expect(de(withItems('rule-1', ['rule-2']))).toBe(
      'Kann nicht zusammen mit Rule 02 erfüllt werden.'
    );
    expect(de(withItems('group-1', ['rule-1']))).toBe(
      'Kann nicht zusammen mit Rule 01 erfüllt werden.'
    );
    expect(de(withItems('rule-1', ['rule-4', 'rule-2', 'rule-3']))).toBe(
      'Kann nicht zusammen mit Rule 02, Rule 03 und Rule 04 erfüllt werden.'
    );
    expect(de(withItems('rule-1', ['rule-2'], true))).toBe(
      'Kann im Moment nicht zusammen mit Rule 02 erfüllt werden.'
    );
  });

  it('reads a group’s own conflict in German', () => {
    const de = (finding: ItemFinding): string => noteOf(finding, NAMES, 'de');
    const and = conflicting('group-3', {
      type: 'members',
      operator: 'and',
      items: ['rule-4', 'rule-5'],
    });
    expect(de(and)).toBe('Rule 04 und Rule 05 in dieser Gruppe widersprechen einander.');
    expect(de({ ...and, today: true })).toBe(
      'Rule 04 und Rule 05 in dieser Gruppe widersprechen einander im Moment.'
    );
    const two = conflicting('group-1', {
      type: 'members',
      operator: 'or',
      items: ['rule-2', 'rule-3'],
    });
    expect(de(two)).toBe('Weder Rule 02 noch Rule 03 in dieser Gruppe kann erfüllt werden.');
    expect(de({ ...two, today: true })).toBe(
      'Weder Rule 02 noch Rule 03 in dieser Gruppe kann im Moment erfüllt werden.'
    );
    const three = conflicting('group-2', {
      type: 'members',
      operator: 'or',
      items: ['rule-4', 'rule-5', 'rule-6'],
    });
    expect(de(three)).toBe(
      'Keine von Rule 04, Rule 05 und Rule 06 in dieser Gruppe kann erfüllt werden.'
    );
    const single = conflicting('group-2', {
      type: 'members',
      operator: 'and',
      items: ['group-3'],
    });
    expect(de(single)).toBe('Sub-group 01 in dieser Gruppe kann nicht erfüllt werden.');
    expect(de({ ...single, today: true })).toBe(
      'Sub-group 01 in dieser Gruppe kann im Moment nicht erfüllt werden.'
    );
  });

  it('says that no citizen can meet a rule on its own in German', () => {
    const finding = conflicting('rule-3', { type: 'condition' });
    expect(noteOf(finding, NAMES, 'de')).toBe('Niemand kann diese Regel erfüllen.');
    expect(noteOf({ ...finding, today: true }, NAMES, 'de')).toBe(
      'Niemand kann diese Regel im Moment erfüllen.'
    );
  });

  it('shows the current, stored names in German, and never an id', () => {
    const renamed = namesOf([rule(1, null, null), rule(2, null, null, 'x', 'Minimum age')]);
    expect(noteOf(withItems('rule-1', ['rule-2']), renamed, 'de')).toBe(
      'Kann nicht zusammen mit Minimum age erfüllt werden.'
    );
    expect(noteOf(withItems('rule-1', ['rule-2', 'rule-9']), NAMES, 'de')).toBe(
      'Kann nicht zusammen mit Rule 02 erfüllt werden.'
    );
    expect(noteOf(withItems('rule-1', ['rule-9']), NAMES, 'de')).toBe(
      'Kann nicht zusammen mit anderen Regeln erfüllt werden.'
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
      'Every citizen meets this rule or Group 01. You can delete the rule.'
    );
  });

  it('reads U06’s note 6753:40824, and a rule’s (W8)', () => {
    expect(noteOf(alwaysMet('group-1'), NAMES)).toBe('Every citizen meets this group.');
    expect(noteOf(alwaysMet('rule-5'), NAMES)).toBe('Every citizen meets this rule.');
  });

  it('never shows an id for an item without a current name', () => {
    expect(noteOf(same('rule-6', 'rule-9'), NAMES)).toBe(
      'Same as another rule. You can delete one of them.'
    );
    expect(noteOf(impliedBy('rule-6', ['rule-9']), NAMES)).toBe(
      'Anyone who meets other rules also meets this rule. You can delete the rule.'
    );
  });

  it('reads the duplicate’s and the always-met notes in German (glossary §3)', () => {
    expect(noteOf(same('rule-6', 'rule-3'), NAMES, 'de')).toBe(
      'Identisch mit Rule 03. Sie können eine der beiden löschen.'
    );
    expect(noteOf(alwaysMet('group-1'), NAMES, 'de')).toBe('Alle erfüllen diese Gruppe.');
    expect(noteOf(alwaysMet('rule-5'), NAMES, 'de')).toBe('Alle erfüllen diese Regel.');
  });

  it('words covered items in German, in every level’s form', () => {
    const de = (finding: ItemFinding): string => noteOf(finding, NAMES, 'de');
    expect(de(impliedBy('group-1', ['rule-1']))).toBe(
      'Wer Rule 01 erfüllt, erfüllt auch diese Gruppe. Sie können die Gruppe löschen.'
    );
    expect(de(impliedBy('rule-6', ['rule-4', 'rule-1']))).toBe(
      'Wer Rule 01 und Rule 04 erfüllt, erfüllt auch diese Regel. Sie können die Regel löschen.'
    );
    expect(de(implies('rule-3', ['rule-2']))).toBe(
      'Wer diese Regel erfüllt, erfüllt auch Rule 02. Sie können die Regel löschen.'
    );
    expect(de(implies('group-3', ['rule-6', 'rule-1']))).toBe(
      'Wer diese Gruppe erfüllt, erfüllt auch Rule 01 oder Rule 06. Sie können die Gruppe löschen.'
    );
    expect(de(implies('rule-6', ['rule-1'], ['rule-5']))).toBe(
      'Wer diese Regel und Rule 05 erfüllt, erfüllt auch Rule 01. Sie können die Regel löschen.'
    );
    expect(de(impliedBy('rule-4', ['rule-2'], ['group-1']))).toBe(
      'Wer Rule 02 erfüllt, erfüllt auch diese Regel oder Group 01. Sie können die Regel löschen.'
    );
    expect(de(impliedBy('rule-4', [], ['group-1']))).toBe(
      'Alle erfüllen diese Regel oder Group 01. Sie können die Regel löschen.'
    );
  });

  it('never shows an id in German either', () => {
    expect(noteOf(same('rule-6', 'rule-9'), NAMES, 'de')).toBe(
      'Identisch mit einer anderen Regel. Sie können eine der beiden löschen.'
    );
    expect(noteOf(impliedBy('rule-6', ['rule-9']), NAMES, 'de')).toBe(
      'Wer andere Regeln erfüllt, erfüllt auch diese Regel. Sie können die Regel löschen.'
    );
  });
});

describe('countsOf', () => {
  it('counts the rules of conflict sets (U02 6750:40933, A2)', () => {
    expect(countsOf(check(conflictSet(['rule-1', 'rule-2'])))).toBe(
      '2 rules contradict each other'
    );
    expect(countsOf(check(conflictSet(['rule-1', 'group-1'])))).toBe(
      '1 rule and 1 group contradict each other'
    );
  });

  it('doesn’t count a group whose own conflict names its members (§3.4)', () => {
    const findings = [
      conflicting('group-3', { type: 'members', operator: 'and', items: ['rule-4', 'rule-5'] }),
      ...conflictSet(['rule-4', 'rule-5']),
    ];
    expect(countsOf(check(findings))).toBe('2 rules contradict each other');
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
    expect(countsOf(check(findings))).toBe(
      '2 rules contradict each other, and 2 rules can’t be met'
    );
  });

  it('reads U02’s counts row 6750:40933 with a duplicate (A2)', () => {
    const findings = [
      conflicting('group-3', { type: 'members', operator: 'and', items: ['rule-4', 'rule-5'] }),
      ...conflictSet(['rule-4', 'rule-5']),
      same('rule-6', 'rule-3'),
    ];
    expect(countsOf(check(findings))).toBe(
      '2 rules contradict each other, and 1 rule is a duplicate'
    );
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
      '1 rule can’t be met, 2 rules and 1 group are duplicates, 1 rule and 1 group ' +
        'already covered, and 1 group every citizen meets'
    );
    expect(countsOf(check([impliedBy('group-1', ['rule-1'])]))).toBe('1 group already covered');
    expect(countsOf(check([alwaysMet('rule-1'), alwaysMet('rule-6')]))).toBe(
      '2 rules every citizen meets'
    );
  });

  it('is empty without a finding', () => {
    expect(countsOf(check([]))).toBe('');
  });

  it('counts in German with explicit plural forms (glossary §3 "counts")', () => {
    const de = (findings: ItemFinding[]): string => countsOf(check(findings), 'de');
    expect(de(conflictSet(['rule-1', 'rule-2']))).toBe('2 Regeln widersprechen einander');
    expect(de(conflictSet(['rule-1', 'group-1']))).toBe(
      '1 Regel und 1 Gruppe widersprechen einander'
    );
    expect(
      de([
        conflicting('group-3', { type: 'members', operator: 'and', items: ['rule-4', 'rule-5'] }),
        ...conflictSet(['rule-4', 'rule-5']),
      ])
    ).toBe('2 Regeln widersprechen einander');
    expect(de([conflicting('rule-3', { type: 'condition' })])).toBe(
      '1 Regel kann nicht erfüllt werden'
    );
    expect(
      de([
        ...conflictSet(['rule-1', 'rule-2']),
        conflicting('rule-3', { type: 'condition' }),
        conflicting('rule-6', { type: 'condition' }),
      ])
    ).toBe('2 Regeln widersprechen einander, und 2 Regeln können nicht erfüllt werden');
    expect(de([]).length).toBe(0);
  });

  it('reads U02’s counts row in German, word for word (glossary §3)', () => {
    const findings = [
      conflicting('group-3', { type: 'members', operator: 'and', items: ['rule-4', 'rule-5'] }),
      ...conflictSet(['rule-4', 'rule-5']),
      same('rule-6', 'rule-3'),
    ];
    expect(countsOf(check(findings), 'de')).toBe(
      '2 Regeln widersprechen einander, und 1 Regel ist ein Duplikat'
    );
  });

  it('counts duplicates, covered and always-met items in German', () => {
    const findings = [
      alwaysMet('group-1'),
      same('rule-6', 'rule-3'),
      same('group-3', 'rule-1'),
      same('rule-5', 'rule-1'),
      impliedBy('rule-4', ['rule-1']),
      implies('group-2', ['rule-1']),
      conflicting('rule-2', { type: 'condition' }),
    ];
    expect(countsOf(check(findings), 'de')).toBe(
      '1 Regel kann nicht erfüllt werden, 2 Regeln und 1 Gruppe sind Duplikate, 1 Regel und ' +
        '1 Gruppe sind bereits abgedeckt, und 1 Gruppe ist immer erfüllt'
    );
    expect(countsOf(check([impliedBy('group-1', ['rule-1'])]), 'de')).toBe(
      '1 Gruppe ist bereits abgedeckt'
    );
    expect(countsOf(check([alwaysMet('rule-1'), alwaysMet('rule-6')]), 'de')).toBe(
      '2 Regeln sind immer erfüllt'
    );
  });
});

describe('bannerOf', () => {
  it('reads U01’s banner 6750:40882 (spec 008 U44): one sentence, line and notice (A1, A2; C4)', () => {
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
          parts: [ref(1), ' and ', ref(2), ' contradict each other.'],
        },
      ],
      counts: '',
      notice: {
        tone: 'warning',
        text: 'No citizen can meet the rules of Standard.',
        appended: 'So no citizen can meet the rules of Standard.',
      },
      incomplete: null,
      head: [
        ref(1),
        ' and ',
        ref(2),
        ' contradict each other, so no citizen can meet the rules of Standard.',
      ],
    });
    expect(head(banner)).toBe(
      'Rule 01 and Rule 02 contradict each other, so no citizen can meet the rules of Standard.'
    );
  });

  it('reads U08’s banner 6753:41324 (spec 008 U46) for a conflict that holds today (A7; C4)', () => {
    const banner = bannerOf(
      check(conflictSet(['rule-1', 'rule-2'], true), NONE_CAN_MEET_TODAY),
      STANDARD,
      NAMES
    );
    expect(head(banner)).toBe(
      'Rule 01 and Rule 02 contradict each other, so right now no citizen can ' +
        'meet the rules of Standard.'
    );
    expect(banner?.notice?.text).toBe('Right now, no citizen can meet the rules of Standard.');
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
          ' contradict each other.',
        ],
      },
    ]);
    expect(head(banner)).toBe('Sub-group 01: Rule 04 and Rule 05 contradict each other.');
  });

  it('puts the four rules of EC-11 on one line (W3)', () => {
    const banner = bannerOf(
      check(conflictSet(['rule-1', 'rule-2', 'rule-3', 'rule-4']), NONE_CAN_MEET),
      STANDARD,
      NAMES
    );
    expect(banner?.lines).toHaveLength(1);
    expect(head(banner)).toBe(
      'Rule 01, Rule 02, Rule 03 and Rule 04 contradict each other, so no citizen can meet the ' +
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
      'Rule 01, Rule 02, Rule 03 and Rule 04 contradict each other.',
      'Rule 05 and Rule 06 contradict each other.',
    ]);
    expect(banner?.counts).toBe('6 rules contradict each other');
    expect(head(banner)).toBe(
      '6 rules contradict each other. So no citizen can meet the rules of Standard.'
    );
    expect(head(bannerOf(check(findings), STANDARD, NAMES))).toBe('6 rules contradict each other');
  });

  it('orders the lines by their first item in display order, whatever the findings’ order', () => {
    const findings = [withItems('rule-6', ['rule-5']), withItems('rule-2', ['rule-1'])];
    expect(
      bannerOf(check(findings), STANDARD, NAMES)?.lines.map((line) => textOf(line.parts))
    ).toEqual([
      'Rule 01 and Rule 02 contradict each other.',
      'Rule 05 and Rule 06 contradict each other.',
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
    expect(banner?.lines[0].parts).toEqual(['No citizen can meet ', ref(1), '.']);
    expect(head(banner)).toBe(
      'No citizen can meet Rule 01. So no citizen can meet the rules of Standard.'
    );
    expect(
      head(bannerOf(check([conflicting('rule-1', { type: 'condition' }, true)]), STANDARD, NAMES))
    ).toBe('No citizen can meet Rule 01 at the moment.');
  });

  it('shows the notice alone as its own item (W17)', () => {
    const banner = bannerOf(check([], NONE_CAN_MEET), AMBULANCE, NAMES);
    expect(banner).toMatchObject({ kind: 'warning', lines: [], counts: '' });
    expect(head(banner)).toBe('No citizen can meet the rules of Ambulance.');
  });

  it('is info when every citizen meets the variant (W8)', () => {
    const banner = bannerOf(check([], ALL_MEET), STANDARD, NAMES);
    expect(banner).toMatchObject({
      kind: 'info',
      notice: {
        tone: 'info',
        text: 'Every citizen meets the rules of Standard.',
        appended: 'Every citizen meets the rules of Standard.',
      },
    });
    expect(head(banner)).toBe('Every citizen meets the rules of Standard.');
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
      'Rule 01 and Rule 02 contradict each other. The rules of Ambulance couldn’t be checked ' +
        'completely. Only findings that are certain are shown.'
    );
  });

  it('ends the counts row with " · couldn’t be checked completely" (§3.2)', () => {
    const findings = [...conflictSet(['rule-1', 'rule-2']), ...conflictSet(['rule-5', 'rule-6'])];
    const banner = bannerOf(check(findings, NONE_CAN_MEET, { complete: false }), STANDARD, NAMES);
    expect(banner?.counts).toBe('4 rules contradict each other');
    expect(banner?.incomplete).toBe(
      'The rules of Standard couldn’t be checked completely. Only findings that are certain are ' +
        'shown.'
    );
    expect(head(banner)).toBe(
      '4 rules contradict each other · couldn’t be checked completely. So no citizen can meet ' +
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
      'Rule 01 and Minimum age contradict each other, so no citizen can meet the rules of ' +
        'Ambulance.'
    );
  });

  it('leaves out a line without current names, and never shows an id', () => {
    expect(bannerOf(check([withItems('rule-1', ['rule-9'])]), STANDARD, NAMES)).toBeNull();
  });

  it('reads U01’s banner in German: one sentence, sliced on the German fragment (C4)', () => {
    const banner = bannerOf(
      check(conflictSet(['rule-1', 'rule-2']), NONE_CAN_MEET),
      STANDARD,
      NAMES,
      'de'
    );
    expect(banner).toEqual({
      kind: 'warning',
      lines: [
        {
          kind: 'conflicting',
          tone: 'warning',
          parts: [ref(1), ' und ', ref(2), ' widersprechen einander.'],
        },
      ],
      counts: '',
      notice: {
        tone: 'warning',
        text: 'Niemand kann die Regeln von Standard erfüllen.',
        appended: 'Daher kann niemand die Regeln von Standard erfüllen.',
      },
      incomplete: null,
      head: [
        ref(1),
        ' und ',
        ref(2),
        ' widersprechen einander, daher kann niemand die Regeln von Standard erfüllen.',
      ],
    });
  });

  it('reads U08’s banner in German for a conflict that holds today (glossary §3)', () => {
    const banner = bannerOf(
      check(conflictSet(['rule-1', 'rule-2'], true), NONE_CAN_MEET_TODAY),
      STANDARD,
      NAMES,
      'de'
    );
    expect(head(banner)).toBe(
      'Rule 01 und Rule 02 widersprechen einander, daher kann derzeit niemand die Regeln von ' +
        'Standard erfüllen.'
    );
    expect(banner?.notice?.text).toBe('Derzeit kann niemand die Regeln von Standard erfüllen.');
    expect(
      head(bannerOf(check(conflictSet(['rule-1', 'rule-2'], true)), STANDARD, NAMES, 'de'))
    ).toBe('Rule 01 und Rule 02 widersprechen einander im Moment.');
  });

  it('words a group’s, EC-11’s and the collapsed lines in German', () => {
    const own = [
      conflicting('group-3', { type: 'members', operator: 'and', items: ['rule-4', 'rule-5'] }),
      ...conflictSet(['rule-4', 'rule-5']),
    ];
    expect(head(bannerOf(check(own), STANDARD, NAMES, 'de'))).toBe(
      'Sub-group 01: Rule 04 und Rule 05 widersprechen einander.'
    );
    expect(
      head(
        bannerOf(
          check(conflictSet(['rule-1', 'rule-2', 'rule-3', 'rule-4']), NONE_CAN_MEET),
          STANDARD,
          NAMES,
          'de'
        )
      )
    ).toBe(
      'Rule 01, Rule 02, Rule 03 und Rule 04 widersprechen einander, daher kann niemand die ' +
        'Regeln von Standard erfüllen.'
    );
    const two = [
      ...conflictSet(['rule-1', 'rule-2', 'rule-3', 'rule-4']),
      ...conflictSet(['rule-5', 'rule-6']),
    ];
    const banner = bannerOf(check(two, NONE_CAN_MEET), STANDARD, NAMES, 'de');
    expect(banner?.counts).toBe('6 Regeln widersprechen einander');
    expect(head(banner)).toBe(
      '6 Regeln widersprechen einander. Daher kann niemand die Regeln von Standard erfüllen.'
    );
  });

  it('words an OR group’s and a one-member group’s own conflict in German', () => {
    const lineOf = (finding: ConflictingFinding): string =>
      textOf(bannerOf(check([finding]), STANDARD, NAMES, 'de')?.lines[0]?.parts ?? []);
    expect(
      lineOf(
        conflicting('group-1', { type: 'members', operator: 'or', items: ['rule-2', 'rule-3'] })
      )
    ).toBe('Group 01: weder Rule 02 noch Rule 03 kann erfüllt werden.');
    expect(
      lineOf(
        conflicting('group-2', {
          type: 'members',
          operator: 'or',
          items: ['rule-4', 'rule-5', 'rule-6'],
        })
      )
    ).toBe('Group 02: keine von Rule 04, Rule 05 und Rule 06 kann erfüllt werden.');
    expect(
      lineOf(conflicting('group-2', { type: 'members', operator: 'and', items: ['group-3'] }, true))
    ).toBe('Group 02: Sub-group 01 kann im Moment nicht erfüllt werden.');
  });

  it('words a rule that can’t be met on its own, and the notices alone, in German', () => {
    const banner = bannerOf(
      check([conflicting('rule-1', { type: 'condition' })], NONE_CAN_MEET),
      STANDARD,
      NAMES,
      'de'
    );
    expect(banner?.lines[0].parts).toEqual(['Niemand kann ', ref(1), ' erfüllen.']);
    expect(head(banner)).toBe(
      'Niemand kann Rule 01 erfüllen. Daher kann niemand die Regeln von Standard erfüllen.'
    );
    expect(
      head(
        bannerOf(check([conflicting('rule-1', { type: 'condition' }, true)]), STANDARD, NAMES, 'de')
      )
    ).toBe('Niemand kann Rule 01 im Moment erfüllen.');
    expect(head(bannerOf(check([], NONE_CAN_MEET), AMBULANCE, NAMES, 'de'))).toBe(
      'Niemand kann die Regeln von Ambulance erfüllen.'
    );
    expect(head(bannerOf(check([], ALL_MEET), STANDARD, NAMES, 'de'))).toBe(
      'Alle erfüllen die Regeln von Standard.'
    );
  });

  it('adds FR-010’s sentence in German, and after the counts row (§3.2)', () => {
    expect(head(bannerOf(check([], null, { complete: false }), STANDARD, NAMES, 'de'))).toBe(
      'Die Regeln von Standard konnten nicht vollständig geprüft werden. Nur sichere Befunde ' +
        'werden angezeigt.'
    );
    expect(
      head(
        bannerOf(
          check(conflictSet(['rule-1', 'rule-2']), null, { complete: false }),
          AMBULANCE,
          NAMES,
          'de'
        )
      )
    ).toBe(
      'Rule 01 und Rule 02 widersprechen einander. Die Regeln von Ambulance konnten nicht ' +
        'vollständig geprüft werden. Nur sichere Befunde werden angezeigt.'
    );
    const findings = [...conflictSet(['rule-1', 'rule-2']), ...conflictSet(['rule-5', 'rule-6'])];
    expect(
      head(bannerOf(check(findings, NONE_CAN_MEET, { complete: false }), STANDARD, NAMES, 'de'))
    ).toBe(
      '4 Regeln widersprechen einander · nicht vollständig geprüft. Daher kann niemand die ' +
        'Regeln von Standard erfüllen.'
    );
  });

  it('names the items and the variant by their current names in German (FR-007, FR-011)', () => {
    const renamed = namesOf([rule(1, null, null), rule(2, null, null, 'x', 'Minimum age')]);
    expect(
      head(
        bannerOf(check(conflictSet(['rule-1', 'rule-2']), NONE_CAN_MEET), AMBULANCE, renamed, 'de')
      )
    ).toBe(
      'Rule 01 und Minimum age widersprechen einander, daher kann niemand die Regeln von ' +
        'Ambulance erfüllen.'
    );
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
          'Every citizen meets ',
          { itemId: 'group-1', name: 'Group 01' },
          ', so it doesn’t check anything.',
        ],
      },
    ]);
    expect(head(banner)).toBe('Every citizen meets Group 01, so it doesn’t check anything.');
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
      'Every citizen meets Rule 04 or Group 01.'
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
    expect(banner?.counts).toBe('2 rules contradict each other, and 1 rule is a duplicate');
    expect(head(banner)).toBe('2 rules contradict each other, and 1 rule is a duplicate');
    expect(banner?.lines.map((line) => [line.kind, line.tone, textOf(line.parts)])).toEqual([
      ['conflicting', 'warning', 'Sub-group 01: Rule 04 and Rule 05 contradict each other.'],
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
      'Rule 04 and Rule 05 contradict each other.',
      'Every citizen meets Rule 06, so it doesn’t check anything.',
    ]);
  });

  it('adds the all_meet notice after a line, and after the counts row (W8, §3.2)', () => {
    expect(head(bannerOf(check([alwaysMet('rule-1')], ALL_MEET), STANDARD, NAMES))).toBe(
      'Every citizen meets Rule 01, so it doesn’t check anything. Every citizen meets the ' +
        'rules of Standard.'
    );
    const two = bannerOf(
      check([alwaysMet('rule-1'), same('rule-6', 'rule-3')], ALL_MEET),
      STANDARD,
      NAMES
    );
    expect(two?.kind).toBe('info');
    expect(head(two)).toBe(
      '1 rule is a duplicate, and 1 rule every citizen meets. Every citizen meets the rules of Standard.'
    );
  });

  it('leaves out a line without current names, and never shows an id', () => {
    expect(bannerOf(check([same('rule-9', 'rule-3')]), STANDARD, NAMES)).toBeNull();
    expect(bannerOf(check([same('rule-6', 'rule-9')]), STANDARD, NAMES)).toBeNull();
    expect(bannerOf(check([impliedBy('rule-6', ['rule-9'])]), STANDARD, NAMES)).toBeNull();
    expect(bannerOf(check([implies('rule-6', ['rule-9'])]), STANDARD, NAMES)).toBeNull();
    expect(bannerOf(check([alwaysMet('rule-9')]), STANDARD, NAMES)).toBeNull();
  });

  it('reads the duplicate’s, always-met and covered lines in German', () => {
    expect(bannerOf(check([same('rule-6', 'rule-3')]), STANDARD, NAMES, 'de')?.lines).toEqual([
      { kind: 'redundant', tone: 'info', parts: [ref(6), ' ist identisch mit ', ref(3), '.'] },
    ]);
    expect(bannerOf(check([alwaysMet('group-1')]), STANDARD, NAMES, 'de')?.lines).toEqual([
      {
        kind: 'always_met',
        tone: 'info',
        parts: [
          'Alle erfüllen ',
          { itemId: 'group-1', name: 'Group 01' },
          ', daher prüft sie nichts.',
        ],
      },
    ]);
    expect(
      bannerOf(check([impliedBy('group-1', ['rule-1'])]), STANDARD, NAMES, 'de')?.lines
    ).toEqual([
      {
        kind: 'redundant',
        tone: 'info',
        parts: [
          'Wer ',
          ref(1),
          ' erfüllt, erfüllt auch ',
          { itemId: 'group-1', name: 'Group 01' },
          '.',
        ],
      },
    ]);
  });

  it('words the OR and enclosing-level forms in German (W6)', () => {
    const line = (finding: ItemFinding): string =>
      head(bannerOf(check([finding]), STANDARD, NAMES, 'de'));
    expect(line(implies('rule-3', ['rule-2']))).toBe('Wer Rule 03 erfüllt, erfüllt auch Rule 02.');
    expect(line(implies('rule-6', ['rule-4', 'rule-1']))).toBe(
      'Wer Rule 06 erfüllt, erfüllt auch Rule 01 oder Rule 04.'
    );
    expect(line(implies('rule-6', ['rule-1'], ['rule-5']))).toBe(
      'Wer Rule 06 und Rule 05 erfüllt, erfüllt auch Rule 01.'
    );
    expect(line(impliedBy('rule-4', ['rule-2'], ['group-1']))).toBe(
      'Wer Rule 02 erfüllt, erfüllt auch Rule 04 oder Group 01.'
    );
    expect(line(impliedBy('rule-4', [], ['group-1']))).toBe('Alle erfüllen Rule 04 oder Group 01.');
  });

  it('reads U02 and U05 in German, and adds the all_meet notice (W8, §3.2)', () => {
    const findings = [
      same('rule-6', 'rule-3'),
      conflicting('group-3', { type: 'members', operator: 'and', items: ['rule-4', 'rule-5'] }),
      ...conflictSet(['rule-4', 'rule-5']),
    ];
    const banner = bannerOf(check(findings), STANDARD, NAMES, 'de');
    expect(head(banner)).toBe('2 Regeln widersprechen einander, und 1 Regel ist ein Duplikat');
    expect(banner?.lines.map((line) => textOf(line.parts))).toEqual([
      'Sub-group 01: Rule 04 und Rule 05 widersprechen einander.',
      'Rule 06 ist identisch mit Rule 03.',
    ]);
    expect(head(bannerOf(check([alwaysMet('rule-1')], ALL_MEET), STANDARD, NAMES, 'de'))).toBe(
      'Alle erfüllen Rule 01, daher prüft sie nichts. Alle erfüllen die Regeln von Standard.'
    );
    expect(
      head(
        bannerOf(
          check([alwaysMet('rule-1'), same('rule-6', 'rule-3')], ALL_MEET),
          STANDARD,
          NAMES,
          'de'
        )
      )
    ).toBe(
      '1 Regel ist ein Duplikat, und 1 Regel ist immer erfüllt. Alle erfüllen die Regeln von ' +
        'Standard.'
    );
  });
});

describe('dialogLineOf (US4; FR-017, FR-019; W10; design-notes.md §6)', () => {
  const u02 = [
    conflicting('group-3', { type: 'members', operator: 'and', items: ['rule-4', 'rule-5'] }),
    ...conflictSet(['rule-4', 'rule-5']),
    same('rule-6', 'rule-3'),
  ];

  it('reads "<variant>: <counts row>." (W10; spec 008 C4, U77 6760:47979)', () => {
    expect(dialogLineOf(check(u02), 'Ambulance')).toBe(
      'Ambulance: 2 rules contradict each other, and 1 rule is a duplicate.'
    );
    expect(dialogLineOf(check([same('rule-6', 'rule-3')]), 'Standard')).toBe(
      'Standard: 1 rule is a duplicate.'
    );
    expect(dialogLineOf(check([alwaysMet('rule-5')]), 'Standard')).toBe(
      'Standard: 1 rule every citizen meets.'
    );
  });

  it('says that no citizen can meet the rules before the counts (U63 7112:48859, U77 6760:47979)', () => {
    expect(dialogLineOf(check(u02, NONE_CAN_MEET), 'Ambulance')).toBe(
      'Ambulance: no citizen can meet these rules. ' +
        '2 rules contradict each other, and 1 rule is a duplicate.'
    );
    expect(dialogLineOf(check(u02, NONE_CAN_MEET_TODAY), 'Ambulance')).toBe(
      'Ambulance: right now no citizen can meet these rules. ' +
        '2 rules contradict each other, and 1 rule is a duplicate.'
    );
  });

  it('says only the notice when the variant has no finding to count', () => {
    expect(dialogLineOf(check([], NONE_CAN_MEET), 'Ambulance')).toBe(
      'Ambulance: no citizen can meet these rules.'
    );
    expect(dialogLineOf(check([], NONE_CAN_MEET_TODAY), 'Ambulance')).toBe(
      'Ambulance: right now no citizen can meet these rules.'
    );
    expect(dialogLineOf(check([], ALL_MEET), 'Ambulance')).toBe(
      'Ambulance: every citizen meets these rules.'
    );
  });

  it('says that every citizen meets the variant before other findings', () => {
    expect(dialogLineOf(check([same('rule-6', 'rule-3')], ALL_MEET), 'Standard')).toBe(
      'Standard: every citizen meets these rules. 1 rule is a duplicate.'
    );
  });

  it('doesn’t repeat that the check couldn’t finish (§6)', () => {
    expect(dialogLineOf(check(u02, null, { complete: false }), 'Ambulance')).toBe(
      'Ambulance: 2 rules contradict each other, and 1 rule is a duplicate.'
    );
    expect(dialogLineOf(check([], NONE_CAN_MEET, { complete: false }), 'Ambulance')).toBe(
      'Ambulance: no citizen can meet these rules.'
    );
  });

  it('is null for a variant without findings (US4-AS4, W13)', () => {
    expect(dialogLineOf(check([]), 'Standard')).toBeNull();
    expect(dialogLineOf(check([], null, { complete: false }), 'Standard')).toBeNull();
    expect(dialogLineOf(check(u02, NONE_CAN_MEET, { checkedRules: 0 }), 'Standard')).toBeNull();
  });

  it('reads the dialog’s lines in German, a full sentence after "<variant>: "', () => {
    expect(dialogLineOf(check(u02), 'Ambulance', 'de')).toBe(
      'Ambulance: 2 Regeln widersprechen einander, und 1 Regel ist ein Duplikat.'
    );
    expect(dialogLineOf(check([same('rule-6', 'rule-3')]), 'Standard', 'de')).toBe(
      'Standard: 1 Regel ist ein Duplikat.'
    );
    expect(dialogLineOf(check([alwaysMet('rule-5')]), 'Standard', 'de')).toBe(
      'Standard: 1 Regel ist immer erfüllt.'
    );
    expect(dialogLineOf(check(u02, NONE_CAN_MEET), 'Ambulance', 'de')).toBe(
      'Ambulance: Niemand kann diese Regeln erfüllen. ' +
        '2 Regeln widersprechen einander, und 1 Regel ist ein Duplikat.'
    );
    expect(dialogLineOf(check(u02, NONE_CAN_MEET_TODAY), 'Ambulance', 'de')).toBe(
      'Ambulance: Derzeit kann niemand diese Regeln erfüllen. ' +
        '2 Regeln widersprechen einander, und 1 Regel ist ein Duplikat.'
    );
    expect(dialogLineOf(check([], ALL_MEET), 'Ambulance', 'de')).toBe(
      'Ambulance: Alle erfüllen diese Regeln.'
    );
    expect(dialogLineOf(check([same('rule-6', 'rule-3')], ALL_MEET), 'Standard', 'de')).toBe(
      'Standard: Alle erfüllen diese Regeln. 1 Regel ist ein Duplikat.'
    );
    expect(dialogLineOf(check([]), 'Standard', 'de')).toBeNull();
  });
});

describe('noticeText (spec 004, FR-018)', () => {
  it('words the notice that the test step shows above the results and in the tab', () => {
    expect(noticeText({ kind: 'none_can_meet', today: false }, 'Standard')).toBe(
      'No citizen can meet the rules of Standard.'
    );
  });

  it('keeps its other forms', () => {
    expect(noticeText({ kind: 'none_can_meet', today: true }, 'Standard')).toBe(
      'Right now, no citizen can meet the rules of Standard.'
    );
    expect(noticeText({ kind: 'all_meet', today: false }, 'Standard')).toBe(
      'Every citizen meets the rules of Standard.'
    );
  });

  it('words the notices in German (glossary §3)', () => {
    expect(noticeText({ kind: 'none_can_meet', today: false }, 'Standard', 'de')).toBe(
      'Niemand kann die Regeln von Standard erfüllen.'
    );
    expect(noticeText({ kind: 'none_can_meet', today: true }, 'Standard', 'de')).toBe(
      'Derzeit kann niemand die Regeln von Standard erfüllen.'
    );
    expect(noticeText({ kind: 'all_meet', today: false }, 'Standard', 'de')).toBe(
      'Alle erfüllen die Regeln von Standard.'
    );
  });
});

describe('tabLabelOf', () => {
  it('reads "<variant> has findings" (A6)', () => {
    expect(tabLabelOf('Standard')).toBe('Standard has findings');
    expect(tabLabelOf('Ambulance')).toBe('Ambulance has findings');
  });

  it('reads "<variant> hat Befunde" in German (glossary §2)', () => {
    expect(tabLabelOf('Standard', 'de')).toBe('Standard hat Befunde');
    expect(tabLabelOf('Ambulance', 'de')).toBe('Ambulance hat Befunde');
  });
});

describe('tabFindingsOf', () => {
  it('reads "1 conflict: <line>" for one line, with the notice (W20)', () => {
    expect(
      tabFindingsOf(check(conflictSet(['rule-1', 'rule-2']), NONE_CAN_MEET), STANDARD, NAMES)
    ).toEqual({
      kind: 'warning',
      text:
        '1 conflict: Rule 01 and Rule 02 contradict each other, so no citizen can meet the ' +
        'rules of Standard.',
    });
  });

  it('reads the counts row for two or more lines (U10 6758:43524)', () => {
    const findings = [...conflictSet(['rule-1', 'rule-2']), ...conflictSet(['rule-5', 'rule-6'])];
    expect(tabFindingsOf(check(findings), STANDARD, NAMES)).toEqual({
      kind: 'warning',
      text: '4 rules contradict each other',
    });
  });

  it('reads a notice or FR-010’s sentence alone', () => {
    expect(tabFindingsOf(check([], ALL_MEET), STANDARD, NAMES)).toEqual({
      kind: 'info',
      text: 'Every citizen meets the rules of Standard.',
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
        '1 finding: Every citizen meets Group 01, so it doesn’t check anything. Every ' +
        'citizen meets the rules of Standard.',
    });
  });

  it('reads U10’s counts row with a duplicate', () => {
    const findings = [...conflictSet(['rule-4', 'rule-5']), same('rule-6', 'rule-3')];
    expect(tabFindingsOf(check(findings), STANDARD, NAMES)).toEqual({
      kind: 'warning',
      text: '2 rules contradict each other, and 1 rule is a duplicate',
    });
  });

  it('is null without a banner', () => {
    expect(tabFindingsOf(check([]), STANDARD, NAMES)).toBeNull();
  });

  it('reads the tooltip’s segment in German, with the one line’s label (W20)', () => {
    expect(
      tabFindingsOf(check(conflictSet(['rule-1', 'rule-2']), NONE_CAN_MEET), STANDARD, NAMES, 'de')
    ).toEqual({
      kind: 'warning',
      text:
        '1 Widerspruch: Rule 01 und Rule 02 widersprechen einander, daher kann niemand die ' +
        'Regeln von Standard erfüllen.',
    });
    const findings = [...conflictSet(['rule-1', 'rule-2']), ...conflictSet(['rule-5', 'rule-6'])];
    expect(tabFindingsOf(check(findings), STANDARD, NAMES, 'de')?.text).toBe(
      '4 Regeln widersprechen einander'
    );
    expect(tabFindingsOf(check([same('rule-6', 'rule-3')]), STANDARD, NAMES, 'de')?.text).toBe(
      '1 Duplikat: Rule 06 ist identisch mit Rule 03.'
    );
    expect(
      tabFindingsOf(check([impliedBy('group-1', ['rule-1'])]), STANDARD, NAMES, 'de')?.text
    ).toBe('1 Befund: Wer Rule 01 erfüllt, erfüllt auch Group 01.');
    expect(tabFindingsOf(check([alwaysMet('group-1')], ALL_MEET), STANDARD, NAMES, 'de')).toEqual({
      kind: 'info',
      text:
        '1 Befund: Alle erfüllen Group 01, daher prüft sie nichts. Alle erfüllen die Regeln ' +
        'von Standard.',
    });
    expect(tabFindingsOf(check([], null, { complete: false }), AMBULANCE, NAMES, 'de')?.text).toBe(
      'Die Regeln von Ambulance konnten nicht vollständig geprüft werden. Nur sichere Befunde ' +
        'werden angezeigt.'
    );
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
      'Rule 04 and Rule 05 in Sub-group 01 contradict each other.'
    );
    expect(announce(appeared({ ...own, today: true }))).toBe(
      'Rule 04 and Rule 05 in Sub-group 01 contradict each other at the moment.'
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
    expect(announce(appeared(finding))).toBe('No citizen can meet Rule 03.');
    expect(announce(appeared({ ...finding, today: true }))).toBe(
      'Right now, no citizen can meet Rule 03.'
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
    expect(announce(appeared(alwaysMet('rule-5')))).toBe('Every citizen meets Rule 05.');
    expect(announce(gone(alwaysMet('rule-5')))).toBe('Rule 05 is no longer always met.');
    expect(announce(appeared(alwaysMet('group-1'), AMBULANCE))).toBe(
      'In Ambulance: Every citizen meets Group 01.'
    );
  });

  it('announces the all_meet notice with its own text', () => {
    expect(announce({ type: 'notice', branch: STANDARD, notice: ALL_MEET })).toBe(
      'Every citizen meets the rules of Standard.'
    );
  });

  it('says nothing of a redundant finding whose names are gone', () => {
    expect(announce(appeared(same('rule-6', 'rule-9')))).toBe('');
    expect(announce(appeared(impliedBy('rule-6', ['rule-9'])))).toBe('');
    expect(announce(appeared(alwaysMet('rule-9')))).toBe('');
  });

  it('announces a new notice with its own text, without a prefix', () => {
    expect(announce({ type: 'notice', branch: STANDARD, notice: NONE_CAN_MEET })).toBe(
      'No citizen can meet the rules of Standard.'
    );
    expect(announce({ type: 'notice', branch: AMBULANCE, notice: NONE_CAN_MEET_TODAY })).toBe(
      'Right now, no citizen can meet the rules of Ambulance.'
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

  function announceDe(change: FindingChange): string {
    return announcementOf(change, NAMES, STANDARD.key, 'de');
  }

  it('announces conflicts in German (FR-015)', () => {
    expect(announceDe(appeared(withItems('rule-2', ['rule-1'])))).toBe(
      'Rule 02 widerspricht Rule 01.'
    );
    expect(announceDe(gone(withItems('rule-2', ['rule-1'])))).toBe(
      'Rule 02 widerspricht Rule 01 nicht mehr.'
    );
    expect(announceDe(appeared(withItems('rule-1', ['rule-2', 'rule-3', 'rule-4'])))).toBe(
      'Rule 01 widerspricht Rule 02, Rule 03 und Rule 04.'
    );
    expect(announceDe(appeared(withItems('rule-2', ['rule-1'], true)))).toBe(
      'Rule 02 widerspricht Rule 01 im Moment.'
    );
    const finding = conflicting('rule-3', { type: 'condition' });
    expect(announceDe(appeared(finding))).toBe('Niemand kann Rule 03 erfüllen.');
    expect(announceDe(appeared({ ...finding, today: true }))).toBe(
      'Derzeit kann niemand Rule 03 erfüllen.'
    );
    expect(announceDe(gone(finding))).toBe('Rule 03 ist nicht mehr widersprüchlich.');
  });

  it('words groups in German as design-notes.md §5 says', () => {
    expect(announceDe(appeared(withItems('group-3', ['rule-1'])))).toBe(
      'Sub-group 01 widerspricht Rule 01.'
    );
    const own = conflicting('group-3', {
      type: 'members',
      operator: 'and',
      items: ['rule-4', 'rule-5'],
    });
    expect(announceDe(appeared(own))).toBe(
      'Rule 04 und Rule 05 in Sub-group 01 widersprechen einander.'
    );
    expect(announceDe(appeared({ ...own, today: true }))).toBe(
      'Rule 04 und Rule 05 in Sub-group 01 widersprechen einander im Moment.'
    );
    expect(
      announceDe(
        appeared(
          conflicting('group-1', { type: 'members', operator: 'or', items: ['rule-2', 'rule-3'] })
        )
      )
    ).toBe('Weder Rule 02 noch Rule 03 in Group 01 kann erfüllt werden.');
    expect(
      announceDe(
        appeared(
          conflicting('group-2', {
            type: 'members',
            operator: 'or',
            items: ['rule-4', 'rule-5', 'rule-6'],
          })
        )
      )
    ).toBe('Keine von Rule 04, Rule 05 und Rule 06 in Group 02 kann erfüllt werden.');
    expect(announceDe(gone(own))).toBe('Sub-group 01 ist nicht mehr widersprüchlich.');
  });

  it('announces redundant and always-met findings and the notices in German', () => {
    expect(announceDe(appeared(same('rule-6', 'rule-3')))).toBe(
      'Rule 06 ist identisch mit Rule 03.'
    );
    expect(announceDe(appeared(impliedBy('rule-1', ['rule-2'])))).toBe(
      'Rule 01 macht neben Rule 02 keinen Unterschied.'
    );
    expect(announceDe(appeared(implies('rule-6', ['rule-1'], ['rule-5'])))).toBe(
      'Rule 06 macht neben Rule 01 und Rule 05 keinen Unterschied.'
    );
    expect(announceDe(gone(same('rule-6', 'rule-3')))).toBe('Rule 06 ist nicht mehr redundant.');
    expect(announceDe(appeared(alwaysMet('rule-5')))).toBe('Alle erfüllen Rule 05.');
    expect(announceDe(gone(alwaysMet('rule-5')))).toBe('Rule 05 ist nicht mehr immer erfüllt.');
    expect(announceDe({ type: 'notice', branch: STANDARD, notice: ALL_MEET })).toBe(
      'Alle erfüllen die Regeln von Standard.'
    );
    expect(announceDe({ type: 'notice', branch: STANDARD, notice: NONE_CAN_MEET })).toBe(
      'Niemand kann die Regeln von Standard erfüllen.'
    );
    expect(announceDe({ type: 'notice', branch: AMBULANCE, notice: NONE_CAN_MEET_TODAY })).toBe(
      'Derzeit kann niemand die Regeln von Ambulance erfüllen.'
    );
  });

  it('starts a finding in another variant with "In <variant>: " in German too', () => {
    expect(announceDe(appeared(withItems('rule-2', ['rule-5']), AMBULANCE))).toBe(
      'In Ambulance: Rule 02 widerspricht Rule 05.'
    );
    expect(announceDe(appeared(alwaysMet('group-1'), AMBULANCE))).toBe(
      'In Ambulance: Alle erfüllen Group 01.'
    );
  });

  it('leaves out names that are gone in German, and says nothing without a name', () => {
    expect(announceDe(gone(withItems('rule-2', ['rule-9'])))).toBe(
      'Rule 02 ist nicht mehr widersprüchlich.'
    );
    expect(announceDe(appeared(withItems('rule-9', ['rule-2'])))).toBe('');
    expect(announceDe(appeared(same('rule-6', 'rule-9')))).toBe('');
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

  it('reads U10’s tooltip segment 6758:43524 (spec 008 U46) for Ambulance, word for word (C4)', () => {
    expect(tabFindingsOf(ambulance(U03), AMBULANCE, AMBULANCE_NAMES)).toEqual({
      kind: 'warning',
      text: '2 rules contradict each other, and 1 rule is a duplicate',
    });
  });

  it('names the variant in the tooltip’s notice and incomplete sentence (W20)', () => {
    expect(tabFindingsOf(ambulance(AS1, NONE_CAN_MEET), AMBULANCE, AMBULANCE_NAMES)).toEqual({
      kind: 'warning',
      text:
        '1 conflict: Rule 02 and Rule 05 contradict each other, so no citizen can meet the ' +
        'rules of Ambulance.',
    });
    expect(
      tabFindingsOf(ambulance(U03, null, { complete: false }), AMBULANCE, AMBULANCE_NAMES)?.text
    ).toBe(
      '2 rules contradict each other, and 1 rule is a duplicate · couldn’t be checked completely'
    );
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
      counts: '2 rules contradict each other, and 1 rule is a duplicate',
      notice: null,
      incomplete: null,
    });
    expect(head(banner)).toBe('2 rules contradict each other, and 1 rule is a duplicate');
    expect(banner?.lines.map((line) => textOf(line.parts))).toEqual([
      'Rule 02 and Rule 05 contradict each other.',
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
    expect(texts).toContain('Right now, no citizen can meet the rules of Ambulance.');
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
      'In Ambulance: No citizen can meet Rule 03.'
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
      'No citizen can meet the rules of Ambulance.'
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
      'In Ambulance: Rule 04 and Rule 05 in Sub-group 01 contradict each other.'
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

  it('reads Ambulance’s tab, tooltip and banner in German, its stored names unchanged', () => {
    expect(tabLabelOf(AMBULANCE.name, 'de')).toBe('Ambulance hat Befunde');
    expect(tabFindingsOf(ambulance(U03), AMBULANCE, AMBULANCE_NAMES, 'de')).toEqual({
      kind: 'warning',
      text: '2 Regeln widersprechen einander, und 1 Regel ist ein Duplikat',
    });
    expect(
      tabFindingsOf(ambulance(U03, null, { complete: false }), AMBULANCE, AMBULANCE_NAMES, 'de')
        ?.text
    ).toBe(
      '2 Regeln widersprechen einander, und 1 Regel ist ein Duplikat · nicht vollständig geprüft'
    );
    const banner = bannerOf(ambulance(U03), AMBULANCE, AMBULANCE_NAMES, 'de');
    expect(banner?.lines.map((line) => textOf(line.parts))).toEqual([
      'Rule 02 und Rule 05 widersprechen einander.',
      'Rule 06 ist identisch mit Rule 03.',
    ]);
  });

  it('announces a finding in another variant in German (design-notes.md §5)', () => {
    const appearedIn = (finding: ItemFinding): FindingChange => ({
      type: 'appeared',
      branch: AMBULANCE,
      finding,
    });
    expect(announcementOf(appearedIn(AS1[0]), AMBULANCE_NAMES, STANDARD.key, 'de')).toBe(
      'In Ambulance: Rule 02 widerspricht Rule 05.'
    );
    expect(
      announcementOf(
        appearedIn(impliedBy('rule-4', ['rule-1'])),
        AMBULANCE_NAMES,
        STANDARD.key,
        'de'
      )
    ).toBe('In Ambulance: Rule 04 macht neben Rule 01 keinen Unterschied.');
    expect(announcementOf(appearedIn(AS1[0]), AMBULANCE_NAMES, AMBULANCE.key, 'de')).toBe(
      'Rule 02 widerspricht Rule 05.'
    );
  });
});

describe('resolutionOf (spec 007, FR-032; research R14)', () => {
  it('says which of the items that contradict each other to change or delete', () => {
    expect(resolutionOf(withItems('rule-3', ['rule-2']), NAMES)).toBe(
      'Change or delete one of Rule 02 and Rule 03; they contradict each other.'
    );
    expect(resolutionOf(withItems('rule-1', ['rule-4', 'rule-2']), NAMES)).toBe(
      'Change or delete one of Rule 01, Rule 02 and Rule 04; they contradict each other.'
    );
    expect(resolutionOf(withItems('rule-1', ['rule-2'], true), NAMES)).toBe(
      'Change or delete one of Rule 01 and Rule 02; they contradict each other at the moment.'
    );
  });

  it('words a group’s own conflict by its members and its combination', () => {
    const and = conflicting('group-3', {
      type: 'members',
      operator: 'and',
      items: ['rule-4', 'rule-5'],
    });
    expect(resolutionOf(and, NAMES)).toBe(
      'Change or delete one of Rule 04 and Rule 05; they contradict each other.'
    );
    const or = conflicting('group-1', {
      type: 'members',
      operator: 'or',
      items: ['rule-2', 'rule-3'],
    });
    expect(resolutionOf(or, NAMES)).toBe(
      'Change one of Rule 02 and Rule 03 so that it can be met, or delete Group 01; none of ' +
        'them can be met.'
    );
    const single = conflicting(
      'group-2',
      { type: 'members', operator: 'and', items: ['group-3'] },
      true
    );
    expect(resolutionOf(single, NAMES)).toBe(
      'Change or delete Sub-group 01; it can’t be met at the moment.'
    );
  });

  it('says to change or delete a rule that no citizen can meet on its own', () => {
    expect(resolutionOf(conflicting('rule-3', { type: 'condition' }), NAMES)).toBe(
      'Change or delete Rule 03; no citizen can meet it.'
    );
    expect(resolutionOf(conflicting('rule-3', { type: 'condition' }, true), NAMES)).toBe(
      'Change or delete Rule 03; no citizen can meet it at the moment.'
    );
  });

  it('offers the deletion of a redundant item, naming what covers it', () => {
    expect(resolutionOf(same('rule-6', 'rule-3'), NAMES)).toBe(
      'You can delete Rule 06; Rule 03 already covers it.'
    );
    expect(resolutionOf(impliedBy('group-1', ['rule-1']), NAMES)).toBe(
      'You can delete Group 01; Rule 01 already covers it.'
    );
    expect(resolutionOf(impliedBy('rule-6', ['rule-4', 'rule-1']), NAMES)).toBe(
      'You can delete Rule 06; Rule 01 and Rule 04 already cover it.'
    );
    expect(resolutionOf(implies('rule-3', ['rule-2']), NAMES)).toBe(
      'You can delete Rule 03; Rule 02 already covers it.'
    );
  });

  it('names an enclosing level’s items too, such as the covering group (research R8, step 4)', () => {
    expect(resolutionOf(impliedBy('rule-4', ['rule-2'], ['group-1']), NAMES)).toBe(
      'You can delete Rule 04; Group 01 and Rule 02 already cover it.'
    );
    expect(resolutionOf(impliedBy('rule-4', [], ['group-1']), NAMES)).toBe(
      'You can delete Rule 04; Group 01 already covers it.'
    );
    expect(resolutionOf(implies('rule-6', ['rule-1'], ['rule-5']), NAMES)).toBe(
      'You can delete Rule 06; Rule 01 and Rule 05 already cover it.'
    );
  });

  it('says to delete an always-met item or make it stricter', () => {
    expect(resolutionOf(alwaysMet('rule-5'), NAMES)).toBe(
      'Rule 05’s condition is always met; delete it or make it stricter.'
    );
    expect(resolutionOf(alwaysMet('group-1'), NAMES)).toBe(
      'Group 01’s condition is always met; delete it or make it stricter.'
    );
  });

  it('gives a variant’s notice its resolution (FR-032: one for every kind)', () => {
    expect(resolutionOf(NONE_CAN_MEET)).toBe(
      'Loosen or delete one of the rules that no citizen can meet together.'
    );
    expect(resolutionOf(NONE_CAN_MEET_TODAY)).toBe(
      'Loosen or delete one of the rules that no citizen can meet together at the moment.'
    );
    expect(resolutionOf(ALL_MEET)).toBe(
      'Add a rule or make one stricter; as it is, the variant accepts every citizen.'
    );
  });

  it('shows the current names, so that a rename shows at once (FR-011)', () => {
    const renamed = namesOf([rule(1, null, null), rule(2, null, null, 'x', 'Minimum age')]);
    expect(resolutionOf(withItems('rule-1', ['rule-2']), renamed)).toBe(
      'Change or delete one of Rule 01 and Minimum age; they contradict each other.'
    );
    expect(resolutionOf(alwaysMet('rule-2'), renamed)).toBe(
      'Minimum age’s condition is always met; delete it or make it stricter.'
    );
  });

  it('never shows an id for an item without a current name', () => {
    expect(resolutionOf(withItems('rule-1', ['rule-9']), NAMES)).toBe(
      'Change or delete one of Rule 01 and other rules; they contradict each other.'
    );
    expect(resolutionOf(same('rule-6', 'rule-9'), NAMES)).toBe(
      'You can delete Rule 06; another rule already covers it.'
    );
    expect(resolutionOf(impliedBy('rule-6', ['rule-9']), NAMES)).toBe(
      'You can delete Rule 06; other rules already cover it.'
    );
    expect(resolutionOf(alwaysMet('group-9'), NAMES)).toBe(
      'The group’s condition is always met; delete it or make it stricter.'
    );
    expect(resolutionOf(conflicting('rule-9', { type: 'condition' }), NAMES)).toBe(
      'Change or delete the rule; no citizen can meet it.'
    );
    const unnamedMembers = conflicting('group-1', {
      type: 'members',
      operator: 'and',
      items: ['rule-8', 'rule-9'],
    });
    expect(resolutionOf(unnamedMembers, NAMES)).toBe('Change or delete Group 01; it can’t be met.');
  });

  it('use typographic apostrophes and never show an id (design-notes.md §1)', () => {
    const reasons: ConflictingReason[] = [
      { type: 'with', items: ['rule-2', 'rule-3'] },
      { type: 'members', operator: 'and', items: ['rule-4', 'rule-5'] },
      { type: 'members', operator: 'or', items: ['rule-4', 'rule-5', 'rule-6'] },
      { type: 'members', operator: 'and', items: ['group-3'] },
      { type: 'condition' },
    ];
    const findings: ItemFinding[] = [
      ...reasons.flatMap((reason) => [
        conflicting('group-2', reason),
        conflicting('group-2', reason, true),
      ]),
      same('rule-6', 'rule-3'),
      impliedBy('group-1', ['rule-1']),
      impliedBy('rule-4', [], ['group-1']),
      implies('rule-6', ['rule-1'], ['rule-5']),
      alwaysMet('group-1'),
    ];
    const texts = [
      ...findings.map((finding) => resolutionOf(finding, NAMES)),
      ...[NONE_CAN_MEET, NONE_CAN_MEET_TODAY, ALL_MEET].map((notice) => resolutionOf(notice)),
    ];
    expect(texts.filter((text) => text.length === 0)).toEqual([]);
    expect(texts.filter((text) => text.includes("'") || /\b(rule|group)-\d/.test(text))).toEqual(
      []
    );
  });

  it('words the resolutions in German when asked, though agents get English (FR-017)', () => {
    const de = (finding: ItemFinding, names = NAMES): string => resolutionOf(finding, names, 'de');
    expect(de(withItems('rule-3', ['rule-2']))).toBe(
      'Ändern oder löschen Sie eine von Rule 02 und Rule 03; sie widersprechen einander.'
    );
    expect(de(withItems('rule-1', ['rule-2'], true))).toBe(
      'Ändern oder löschen Sie eine von Rule 01 und Rule 02; sie widersprechen einander im Moment.'
    );
    expect(
      de(conflicting('group-1', { type: 'members', operator: 'or', items: ['rule-2', 'rule-3'] }))
    ).toBe(
      'Ändern Sie eine von Rule 02 und Rule 03 so, dass sie erfüllt werden kann, oder löschen ' +
        'Sie Group 01; keine davon kann erfüllt werden.'
    );
    expect(
      de(conflicting('group-2', { type: 'members', operator: 'and', items: ['group-3'] }, true))
    ).toBe('Ändern oder löschen Sie Sub-group 01; sie kann im Moment nicht erfüllt werden.');
    expect(de(conflicting('rule-3', { type: 'condition' }))).toBe(
      'Ändern oder löschen Sie Rule 03; niemand kann sie erfüllen.'
    );
    expect(de(same('rule-6', 'rule-3'))).toBe(
      'Sie können Rule 06 löschen; Rule 03 deckt sie bereits ab.'
    );
    expect(de(impliedBy('rule-6', ['rule-4', 'rule-1']))).toBe(
      'Sie können Rule 06 löschen; Rule 01 und Rule 04 decken sie bereits ab.'
    );
    expect(de(impliedBy('rule-4', ['rule-2'], ['group-1']))).toBe(
      'Sie können Rule 04 löschen; Group 01 und Rule 02 decken sie bereits ab.'
    );
    expect(de(alwaysMet('rule-5'))).toBe(
      'Die Bedingung von Rule 05 ist immer erfüllt; löschen Sie sie oder machen Sie sie strenger.'
    );
    expect(resolutionOf(NONE_CAN_MEET, 'de')).toBe(
      'Lockern oder löschen Sie eine der Regeln, die niemand zusammen erfüllen kann.'
    );
    expect(resolutionOf(NONE_CAN_MEET_TODAY, 'de')).toBe(
      'Lockern oder löschen Sie eine der Regeln, die im Moment niemand zusammen erfüllen kann.'
    );
    expect(resolutionOf(ALL_MEET, 'de')).toBe(
      'Fügen Sie eine Regel hinzu oder machen Sie eine strenger; in der jetzigen Form ' +
        'akzeptiert die Variante alle.'
    );
  });

  it('never shows an id in German either', () => {
    const de = (finding: ItemFinding): string => resolutionOf(finding, NAMES, 'de');
    expect(de(withItems('rule-1', ['rule-9']))).toBe(
      'Ändern oder löschen Sie eine von Rule 01 und anderen Regeln; sie widersprechen einander.'
    );
    expect(de(same('rule-6', 'rule-9'))).toBe(
      'Sie können Rule 06 löschen; eine andere Regel deckt sie bereits ab.'
    );
    expect(de(impliedBy('rule-6', ['rule-9']))).toBe(
      'Sie können Rule 06 löschen; andere Regeln decken sie bereits ab.'
    );
    expect(de(alwaysMet('group-9'))).toBe(
      'Die Bedingung der Gruppe ist immer erfüllt; löschen Sie sie oder machen Sie sie strenger.'
    );
    expect(de(conflicting('rule-9', { type: 'condition' }))).toBe(
      'Ändern oder löschen Sie die Regel; niemand kann sie erfüllen.'
    );
    expect(
      de(conflicting('group-1', { type: 'members', operator: 'and', items: ['rule-8', 'rule-9'] }))
    ).toBe('Ändern oder löschen Sie Group 01; sie kann nicht erfüllt werden.');
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

  // The same texts in German (spec 009, FR-006): every one there, none the English one, and
  // no English word left in them; the stored names ("Rule 01", "Standard") stay as they are
  const textsDe = [
    ...findings.map((finding) => noteOf(finding, NAMES, 'de')),
    ...findings.flatMap((finding) => [
      announcementOf({ type: 'appeared', branch: AMBULANCE, finding }, NAMES, STANDARD.key, 'de'),
      announcementOf({ type: 'gone', branch: AMBULANCE, finding }, NAMES, STANDARD.key, 'de'),
    ]),
    ...notices.map((notice) =>
      announcementOf({ type: 'notice', branch: STANDARD, notice }, NAMES, STANDARD.key, 'de')
    ),
    ...notices.flatMap((notice) =>
      [true, false].flatMap((complete) => {
        const banner = bannerOf(
          check(
            [
              ...conflictSet(['rule-1', 'rule-2']),
              ...conflictSet(['rule-5', 'rule-6']),
              same('rule-4', 'rule-3'),
              alwaysMet('group-1'),
              impliedBy('rule-2', ['rule-1']),
            ],
            notice,
            { complete }
          ),
          STANDARD,
          NAMES,
          'de'
        );
        return [
          head(banner),
          ...(banner?.lines.map((line) => textOf(line.parts)) ?? []),
          banner?.notice?.text ?? '',
        ];
      })
    ),
    ...findings.map(
      (finding) => tabFindingsOf(check([finding]), STANDARD, NAMES, 'de')?.text ?? ''
    ),
    ...notices.flatMap((notice) => [
      dialogLineOf(check([], notice), AMBULANCE.name, 'de') ?? '',
      dialogLineOf(check(findings, notice), AMBULANCE.name, 'de') ?? '',
    ]),
  ];
  const ENGLISH_WORDS =
    /\b(citizen|meets|contradict|conflicts?|also|already|the|and|or|no longer)\b|can’t/;

  it('are all there in German, in German', () => {
    expect(textsDe.filter((text) => text.length === 0)).toEqual([]);
    expect(textsDe.filter((text) => ENGLISH_WORDS.test(text) || text.includes("'"))).toEqual([]);
    expect(textsDe.filter((text) => texts.includes(text))).toEqual([]);
  });
});
