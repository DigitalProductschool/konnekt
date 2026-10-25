import { describe, expect, it } from 'vitest';

import type { BranchInput, GroupItem, RuleItem, RuleTreeItem } from '../../types/form-connections';
import { requestedRuleDocuments } from './conditions';
import { CONTEXT, mainBranch, MDL, OPTION_SETS, PID, rule, target, US1_RULES } from './testData';
import type { RuleContext } from './types';
import {
  checksUnrequestedData,
  firstProblem,
  foldName,
  nameProblem,
  reservedNameProblem,
  unrequestedRules,
} from './validation';

function group(number: number, items: RuleTreeItem[], name = `Group 0${number}`): GroupItem {
  return {
    type: 'group',
    id: `group-${number}`,
    name,
    mark: null,
    operator: 'and',
    message: null,
    items,
  };
}

function branch(name: string, items: RuleTreeItem[], origin: BranchInput['origin'] = 'empty') {
  return { ...mainBranch(items), id: null, name, origin };
}

/** The first problem's message of a main branch with these items. */
function problemOf(items: RuleTreeItem[], context: RuleContext = CONTEXT): string | undefined {
  return firstProblem([mainBranch(items)], context)?.message;
}

/** US1's first rule with changes. */
function ageRule(changes: Partial<RuleItem> = {}): RuleItem {
  return { ...US1_RULES[0], ...changes };
}

describe('firstProblem', () => {
  it('accepts US1’s rules, and a main branch without rules', () => {
    expect(firstProblem([mainBranch()], CONTEXT)).toBeNull();
    expect(firstProblem([mainBranch([])], CONTEXT)).toBeNull();
  });

  describe('the branches', () => {
    it('allows at most 20 variants', () => {
      const others = Array.from({ length: 20 }, (_, index) => branch(`Variant ${index}`, []));
      expect(firstProblem([mainBranch(), ...others.slice(0, 19)], CONTEXT)).toBeNull();
      expect(firstProblem([mainBranch(), ...others], CONTEXT)).toEqual({
        message: 'A connection can have at most 20 variants.',
        branchIndex: null,
        itemId: null,
      });
    });

    it.each([
      ['no main branch', [branch('Ambulance', [])]],
      ['a main branch that isn’t first', [branch('Ambulance', []), mainBranch()]],
      ['two main branches', [mainBranch(), { ...mainBranch([]), name: 'Other' }]],
      ['no branch', []],
    ])('needs exactly one main branch, first: %s', (_name, branches) => {
      expect(firstProblem(branches, CONTEXT)?.message).toBe(
        'The rules need exactly one main branch.'
      );
    });

    it('needs a name for every variant', () => {
      expect(firstProblem([mainBranch(), branch('  ', [])], CONTEXT)).toEqual({
        message: 'Enter a name for every variant.',
        branchIndex: 1,
        itemId: null,
      });
      expect(firstProblem([mainBranch(), branch('x'.repeat(101), [])], CONTEXT)?.message).toBe(
        'A variant’s name can have at most 100 characters.'
      );
      expect(firstProblem([mainBranch(), branch('x'.repeat(100), [])], CONTEXT)).toBeNull();
    });

    it('refuses two variants of the same name, ignoring letter case and outer spaces', () => {
      expect(
        firstProblem([mainBranch(), branch('Ambulance', []), branch(' AMBULANCE ', [])], CONTEXT)
      ).toEqual({
        message: 'Two variants are called AMBULANCE. Give each variant its own name.',
        branchIndex: 2,
        itemId: null,
      });
    });

    it('limits descriptions to 500 characters after trimming', () => {
      const long = { ...mainBranch(), description: `  ${'d'.repeat(501)}  ` };
      expect(firstProblem([long], CONTEXT)?.message).toBe(
        'The description of Standard can have at most 500 characters.'
      );
      expect(firstProblem([{ ...long, description: `${'d'.repeat(500)} ` }], CONTEXT)).toBeNull();
    });

    it('limits a branch to 200 rules and groups, members and removed ones included', () => {
      const rules = Array.from({ length: 198 }, (_, index) => ({
        ...rule(index + 1, US1_RULES[0].target, US1_RULES[0].condition),
        mark: index === 0 ? ('removed' as const) : null,
      }));
      const twoHundred = [group(1, rules.slice(0, 2)), ...rules.slice(2), rule(199, null, null)];
      expect(firstProblem([branch('Taxi', twoHundred, 'main')], CONTEXT)?.message).not.toContain(
        'at most 200'
      );
      expect(
        firstProblem([branch('Taxi', [...twoHundred, rule(200, null, null)], 'main')], CONTEXT)
      ).toEqual({
        message: 'Taxi can have at most 200 rules and groups.',
        branchIndex: 0,
        itemId: null,
      });
    });

    it.each([
      ['a leading zero', 'rule-01'],
      ['zero', 'rule-0'],
      ['a capital letter', 'Rule-1'],
      ['a group’s prefix', 'group-1'],
      ['no number', 'rule-'],
    ])('refuses an identifier with %s', (_name, id) => {
      expect(problemOf([ageRule({ id, name: 'Old enough' })])).toBe(
        'The rules contain an invalid identifier. Reload the connection and try again.'
      );
    });

    it('refuses an identifier twice in a branch, but not in two branches', () => {
      expect(problemOf([ageRule(), ageRule({ name: 'Copy' })])).toBe(
        'The rules contain an invalid identifier. Reload the connection and try again.'
      );
      expect(problemOf([group(1, US1_RULES.slice(0, 2)), { ...group(1, []), name: 'Again' }])).toBe(
        'The rules contain an invalid identifier. Reload the connection and try again.'
      );
      expect(firstProblem([mainBranch(), branch('Ambulance', US1_RULES)], CONTEXT)).toBeNull();
    });
  });

  describe('names', () => {
    it('needs a name for every rule, group and sub-group', () => {
      expect(firstProblem([mainBranch([ageRule({ name: ' ' })])], CONTEXT)).toEqual({
        message: 'Enter a name for every rule in Standard.',
        branchIndex: 0,
        itemId: 'rule-1',
      });
      expect(problemOf([group(1, US1_RULES.slice(0, 2), '')])).toBe(
        'Enter a name for every group in Standard.'
      );
      expect(problemOf([group(1, [US1_RULES[0], group(2, US1_RULES.slice(1), '  ')])])).toBe(
        'Enter a name for every sub-group in Standard.'
      );
    });

    it('limits names to 100 characters', () => {
      expect(problemOf([ageRule({ name: 'n'.repeat(101) })])).toBe(
        'A rule in Standard has a name longer than 100 characters.'
      );
      expect(problemOf([ageRule({ name: 'n'.repeat(100) })])).toBeUndefined();
    });

    it('refuses a name twice in a branch, ignoring letter case and outer spaces (F12)', () => {
      const items = [ageRule({ name: 'Old enough' }), { ...US1_RULES[1], name: ' OLD ENOUGH ' }];
      expect(firstProblem([mainBranch(items)], CONTEXT)).toEqual({
        message: 'Another rule in Standard is already called Old enough.',
        branchIndex: 0,
        itemId: 'rule-2',
      });
    });

    it('names the earlier item’s kind', () => {
      expect(
        problemOf([
          group(1, US1_RULES.slice(0, 2), 'Licence'),
          { ...US1_RULES[2], name: 'licence' },
        ])
      ).toBe('Another group in Standard is already called Licence.');
      expect(
        problemOf([
          group(1, [US1_RULES[0], group(2, US1_RULES.slice(1), 'Held B')]),
          { ...rule(4, US1_RULES[0].target, US1_RULES[0].condition), name: 'Held b' },
        ])
      ).toBe('Another sub-group in Standard is already called Held B.');
    });

    it('allows the same name in two branches', () => {
      expect(firstProblem([mainBranch(), branch('Ambulance', US1_RULES)], CONTEXT)).toBeNull();
    });

    it.each([
      ['Rule 8', 'Rule 8 is kept for the rule numbered 08.'],
      ['Rule 08', 'Rule 08 is kept for the rule numbered 08.'],
      ['rule 2', 'rule 2 is kept for the rule numbered 02.'],
      ['Group 1', 'Group 1 is kept for the group numbered 01.'],
      ['Sub-group 12', 'Sub-group 12 is kept for the sub-group numbered 12.'],
      ['Rule 0', 'Rule 0 is kept for the rule numbered 00.'],
    ])('keeps "%s" for its own item (FR-005)', (name, message) => {
      expect(problemOf([ageRule({ name: ` ${name} ` })])).toBe(message);
    });

    it.each(['Rule 1', 'rule 01', 'RULE 001', 'Rule  8', 'Rule 8b', 'Rules 8'])(
      'lets rule-1 be called "%s"',
      (name) => {
        expect(problemOf([ageRule({ name })])).toBeUndefined();
      }
    );

    it('lets a group be called "Group NN" or "Sub-group NN" with its own number', () => {
      expect(problemOf([group(3, US1_RULES.slice(0, 2), 'Sub-group 03')])).toBeUndefined();
      expect(problemOf([group(3, US1_RULES.slice(0, 2), 'Rule 3')])).toBe(
        'Rule 3 is kept for the rule numbered 03.'
      );
    });
  });

  describe('targets', () => {
    const requested = (documents: { document_type: string; fields: string[] }[]) => ({
      documents: requestedRuleDocuments([PID, MDL], documents),
      optionSets: OPTION_SETS,
    });

    it('needs the data to check', () => {
      expect(problemOf([ageRule({ target: null })])).toBe(
        'Rule 01 in Standard: choose the data to check.'
      );
      expect(problemOf([ageRule({ target: target('mdl', 'driving_privileges') })])).toBe(
        'Rule 01 in Standard: choose the data to check.'
      );
      expect(
        problemOf([ageRule({ target: target('mdl', 'driving_privileges', 'issue_date') })])
      ).toBe('Rule 01 in Standard: choose the data to check.');
    });

    it('refuses data that is no longer requested (F11)', () => {
      const context = requested([{ document_type: 'mdl', fields: ['driving_privileges'] }]);
      expect(firstProblem([mainBranch()], context)).toEqual({
        message: 'Rule 01 in Standard checks data that’s no longer requested.',
        branchIndex: 0,
        itemId: 'rule-1',
      });
      const withoutClasses = requested([{ document_type: 'pid', fields: ['birthdate'] }]);
      expect(problemOf(US1_RULES, withoutClasses)).toBe(
        'Rule 02 in Standard checks data that’s no longer requested.'
      );
    });

    it('refuses images and unknown fields', () => {
      expect(problemOf([ageRule({ target: target('pid', 'picture') })])).toBe(
        'Rule 01 in Standard checks data that’s no longer requested.'
      );
      expect(problemOf([ageRule({ target: target('pid', 'shoe_size') })])).toBe(
        'Rule 01 in Standard checks data that’s no longer requested.'
      );
    });

    it.each([
      ['an unknown part', target('mdl', 'driving_privileges', 'codes'), 'Licence classes'],
      [
        'an unknown class',
        target('mdl', 'driving_privileges', 'issue_date', 'Z'),
        'Licence classes',
      ],
      [
        'a class on the classes held',
        target('mdl', 'driving_privileges', 'classes', 'B'),
        'Licence classes',
      ],
      ['a part on a field without parts', target('pid', 'birthdate', 'country'), 'Date of birth'],
      ['a class on a field without parts', target('pid', 'birthdate', null, 'B'), 'Date of birth'],
    ])('refuses %s', (_name, ruleTarget, field) => {
      expect(problemOf([ageRule({ target: ruleTarget })])).toBe(
        `Rule 01 in Standard checks a part that ${field} doesn’t have.`
      );
    });

    it('accepts every class of the set, and any class before the sets load', () => {
      const rules = [ageRule({ target: target('mdl', 'driving_privileges', 'issue_date', 'BE') })];
      expect(problemOf(rules)).toBeUndefined();
      const unknown = [ageRule({ target: target('mdl', 'driving_privileges', 'issue_date', 'Z') })];
      expect(problemOf(unknown, { documents: CONTEXT.documents, optionSets: [] })).toBeUndefined();
    });
  });

  describe('conditions', () => {
    it.each([
      ['no check', target('pid', 'birthdate'), null, 'choose a check.'],
      [
        'another kind’s check',
        target('mdl', 'height'),
        { operator: 'contains', value: 'x' },
        'choose a check.',
      ],
      [
        'no number',
        target('mdl', 'height'),
        { operator: 'less_than', value: null },
        'enter a number.',
      ],
      [
        'spaces only',
        target('pid', 'address_locality'),
        { operator: 'equal_to', value: '  ', match_case: false },
        'enter a text to compare with.',
      ],
      [
        'no value',
        target('pid', 'nationalities'),
        { operator: 'includes_one_of', values: [] },
        'choose at least one value.',
      ],
      [
        'a value outside the set',
        target('pid', 'nationalities'),
        { operator: 'includes_one_of', values: ['DE', 'XX'] },
        'choose values from the list.',
      ],
      [
        'a value twice',
        target('pid', 'nationalities'),
        { operator: 'includes_one_of', values: ['DE', 'DE'] },
        'choose each value only once.',
      ],
      [
        'an invalid date',
        target('pid', 'birthdate'),
        { operator: 'before', date: '2023-02-29' },
        'enter a date.',
      ],
      [
        '0 years',
        target('pid', 'birthdate'),
        { operator: 'at_least_years_ago', years: 0 },
        'enter a number of years of at least 1.',
      ],
      [
        '1.5 years',
        target('pid', 'birthdate'),
        { operator: 'exactly_years_ago', years: 1.5 },
        'enter a number of years of at least 1.',
      ],
      [
        'no unit',
        target('mdl', 'expiry_date'),
        { operator: 'at_least_from_now', amount: 6, unit: null },
        'choose years or months.',
      ],
      [
        '0 months',
        target('mdl', 'expiry_date'),
        { operator: 'at_least_from_now', amount: 0, unit: 'months' as const },
        'enter a number of months of at least 1.',
      ],
      [
        'no years from now',
        target('mdl', 'expiry_date'),
        { operator: 'less_than_from_now', amount: null, unit: 'years' as const },
        'enter a number of years of at least 1.',
      ],
    ])('refuses %s', (_name, ruleTarget, condition, problem) => {
      expect(problemOf([ageRule({ target: ruleTarget, condition })])).toBe(
        `Rule 01 in Standard: ${problem}`
      );
    });

    it('checks the classes held against the licence classes', () => {
      expect(
        problemOf([
          ageRule({
            target: target('mdl', 'driving_privileges', 'classes'),
            condition: { operator: 'includes_one_of', values: ['B', 'XL'] },
          }),
        ])
      ).toBe('Rule 01 in Standard: choose values from the list.');
    });
  });

  describe('messages', () => {
    it('needs an error message (FR-004)', () => {
      expect(problemOf([ageRule({ message: ' \n ' })])).toBe(
        'Rule 01 in Standard has no error message.'
      );
    });

    it('limits it to 500 characters after trimming', () => {
      expect(problemOf([ageRule({ message: 'm'.repeat(501) })])).toBe(
        'The error message of Rule 01 in Standard can have at most 500 characters.'
      );
      expect(problemOf([ageRule({ message: ` ${'m'.repeat(500)} ` })])).toBeUndefined();
    });

    it('counts characters, not UTF-16 units', () => {
      expect(problemOf([ageRule({ message: '😀'.repeat(500) })])).toBeUndefined();
    });
  });

  describe('order', () => {
    it('reports the first problem only: the name before the target, rules in order', () => {
      expect(
        problemOf([ageRule({ name: '', target: null }), { ...US1_RULES[1], message: '' }])
      ).toBe('Enter a name for every rule in Standard.');
      expect(
        problemOf([
          US1_RULES[0],
          { ...US1_RULES[1], message: '' },
          { ...US1_RULES[2], target: null },
        ])
      ).toBe('Rule 02 in Standard has no error message.');
    });

    it('checks a group’s members after the group, and names each with its branch', () => {
      expect(
        firstProblem(
          [
            mainBranch(),
            branch('Ambulance', [group(1, [US1_RULES[0], { ...US1_RULES[1], condition: null }])]),
          ],
          CONTEXT
        )
      ).toEqual({
        message: 'Rule 02 in Ambulance: choose a check.',
        branchIndex: 1,
        itemId: 'rule-2',
      });
    });

    it('reports a problem the main branch shares with a variant once, for the main branch', () => {
      const broken = [ageRule({ message: '' })];
      expect(
        firstProblem([mainBranch(broken), branch('Ambulance', broken, 'based')], CONTEXT)
      ).toEqual({
        message: 'Rule 01 in Standard has no error message.',
        branchIndex: 0,
        itemId: 'rule-1',
      });
    });

    it('names a branch by its trimmed name', () => {
      expect(
        firstProblem([mainBranch(), branch(' Taxi ', [ageRule({ message: '' })])], CONTEXT)?.message
      ).toBe('Rule 01 in Taxi has no error message.');
    });
  });
});

describe('nameProblem', () => {
  const standard = mainBranch([
    ...US1_RULES.slice(0, 2),
    group(1, [US1_RULES[2], group(2, [rule(4, null, null), rule(5, null, null)], 'Held B')]),
  ]);

  it('accepts a free name, and an item’s own name', () => {
    expect(nameProblem('Old enough', US1_RULES[0], standard)).toBeNull();
    expect(nameProblem('Rule 01', US1_RULES[0], standard)).toBeNull();
    expect(nameProblem(' rule 1 ', US1_RULES[0], standard)).toBeNull();
  });

  it('needs a name of at most 100 characters', () => {
    expect(nameProblem('  ', US1_RULES[0], standard)).toBe('Enter a name.');
    expect(nameProblem('n'.repeat(101), US1_RULES[0], standard)).toBe(
      'A name can have at most 100 characters.'
    );
  });

  it('refuses another item’s name, naming the branch (F12)', () => {
    expect(nameProblem(' RULE 02 ', US1_RULES[0], standard)).toBe(
      'Another rule in Standard is already called Rule 02.'
    );
    expect(nameProblem('held b', US1_RULES[0], standard)).toBe(
      'Another sub-group in Standard is already called Held B.'
    );
    expect(nameProblem('Group 01', US1_RULES[0], standard)).toBe(
      'Another group in Standard is already called Group 01.'
    );
    expect(nameProblem('Rule 01', US1_RULES[1], { ...standard, name: 'Ambulance' })).toBe(
      'Another rule in Ambulance is already called Rule 01.'
    );
  });

  it('keeps reserved names for their items (FR-005)', () => {
    expect(nameProblem('Rule 08', US1_RULES[0], standard)).toBe(
      'Rule 08 is kept for the rule numbered 08.'
    );
    expect(nameProblem('Sub-group 7', US1_RULES[0], standard)).toBe(
      'Sub-group 7 is kept for the sub-group numbered 07.'
    );
  });
});

describe('reservedNameProblem', () => {
  it('compares numbers without leading zeros, also large ones', () => {
    const item = rule(123456789012345, null, null);
    expect(reservedNameProblem('Rule 000123456789012345', item)).toBeNull();
    expect(reservedNameProblem('Rule 123456789012346', item)).toBe(
      'Rule 123456789012346 is kept for the rule numbered 123456789012346.'
    );
  });
});

describe('foldName', () => {
  it('ignores letter case and outer spaces, "ß" as "ss"', () => {
    expect(foldName('  Straße ')).toBe(foldName('STRASSE'));
    expect(foldName('Köln')).toBe('köln');
  });
});

describe('unrequestedRules', () => {
  it('lists the rules on data no longer requested, with their branch (F11)', () => {
    const documents = requestedRuleDocuments(
      [PID, MDL],
      [{ document_type: 'pid', fields: ['birthdate'] }]
    );
    const branches = [mainBranch(), branch('Ambulance', [group(1, US1_RULES.slice(1))])];
    expect(
      unrequestedRules(branches, documents).map(({ branchIndex, rule: item }) => [
        branchIndex,
        item.id,
      ])
    ).toEqual([
      [0, 'rule-2'],
      [0, 'rule-3'],
      [1, 'rule-2'],
      [1, 'rule-3'],
    ]);
  });

  it('leaves out rules without a target', () => {
    expect(checksUnrequestedData(rule(1, null, null), CONTEXT.documents)).toBe(false);
  });
});
