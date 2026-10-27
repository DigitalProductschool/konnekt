import { describe, expect, it } from 'vitest';

import type { BranchInput, GroupItem, RuleItem, RuleTreeItem } from '../../types/form-connections';
import { addRuleToBranch, changeItem, newBranch, removeItem } from './branches';
import { requestedRuleDocuments } from './conditions';
import { CONTEXT, mainBranch, MDL, OPTION_SETS, PID, rule, target, US1_RULES } from './testData';
import { findItem, foldName } from './tree';
import type { RuleContext } from './types';
import {
  checkedInBranch,
  checksUnrequestedData,
  firstProblem,
  nameProblem,
  reservedNameProblem,
  rulesCheckingData,
  unrequestedRules,
  variantNameProblem,
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

function must<T>(value: T | null): T {
  if (value === null) {
    throw new Error('expected a result');
  }
  return value;
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

  describe('groups (FR-004, FR-008)', () => {
    /** US2's example: lives in Stuttgart AND (21 OR (19 AND class B for 3 years)). */
    const US2_ITEMS: RuleTreeItem[] = [
      rule(1, target('pid', 'address_locality'), {
        operator: 'equal_to',
        value: 'Stuttgart',
        match_case: false,
      }),
      group(1, [
        rule(2, target('pid', 'birthdate'), { operator: 'at_least_years_ago', years: 21 }),
        group(
          2,
          [
            rule(3, target('pid', 'birthdate'), { operator: 'at_least_years_ago', years: 19 }),
            rule(4, target('mdl', 'driving_privileges', 'issue_date', 'B'), {
              operator: 'at_least_years_ago',
              years: 3,
            }),
          ],
          'Sub-group 02'
        ),
      ]),
    ];

    it('accepts a group with a sub-group', () => {
      expect(problemOf(US2_ITEMS)).toBeUndefined();
    });

    it('needs at least two rules in a group or sub-group', () => {
      expect(firstProblem([mainBranch([group(1, [US1_RULES[0]])])], CONTEXT)).toEqual({
        message: 'Group 01 in Standard needs at least two rules.',
        branchIndex: 0,
        itemId: 'group-1',
      });
      expect(problemOf([group(1, [])])).toBe('Group 01 in Standard needs at least two rules.');
      expect(
        firstProblem(
          [mainBranch([group(1, [US1_RULES[0], group(2, [US1_RULES[1]], 'Sub-group 02')])])],
          CONTEXT
        )
      ).toEqual({
        message: 'Sub-group 02 in Standard needs at least two rules.',
        branchIndex: 0,
        itemId: 'group-2',
      });
    });

    it('doesn’t count the members a based branch removed, in a group of its own', () => {
      const removed: RuleItem = { ...US1_RULES[1], mark: 'removed' };
      const own = (items: RuleTreeItem[]): GroupItem => ({ ...group(1, items), mark: 'added' });
      expect(
        firstProblem(
          [mainBranch(), branch('Ambulance', [own([US1_RULES[0], removed])], 'based')],
          CONTEXT
        )?.message
      ).toBe('Group 01 in Ambulance needs at least two rules.');
      expect(
        firstProblem(
          [
            mainBranch(),
            branch(
              'Ambulance',
              [own([US1_RULES[0], removed, { ...US1_RULES[2], mark: 'added' }])],
              'based'
            ),
          ],
          CONTEXT
        )
      ).toBeNull();
    });

    it('lets a based branch dissolve an inherited group (data-model.md, "Dissolution")', () => {
      const removed: RuleItem = { ...US1_RULES[1], mark: 'removed' };
      const main = mainBranch([group(1, [US1_RULES[0], US1_RULES[1]])]);
      expect(
        firstProblem(
          [main, branch('Ambulance', [group(1, [US1_RULES[0], removed])], 'based')],
          CONTEXT
        )
      ).toBeNull();
    });

    it('lets a sub-group hold rules only', () => {
      const nested = group(3, US1_RULES.slice(1));
      expect(
        firstProblem(
          [
            mainBranch([
              group(1, [US1_RULES[0], group(2, [nested, rule(4, null, null)], 'Sub-group 02')]),
            ]),
          ],
          CONTEXT
        )
      ).toEqual({
        message: 'Sub-group 02 in Standard can only hold rules.',
        branchIndex: 0,
        itemId: 'group-2',
      });
    });

    it('limits a group’s own message to 500 characters after trimming, code points counted', () => {
      const withMessage = (message: string | null) => [
        { ...group(1, US1_RULES.slice(0, 2)), message },
      ];
      expect(problemOf(withMessage('m'.repeat(501)))).toBe(
        'The error message of Group 01 in Standard can have at most 500 characters.'
      );
      expect(problemOf(withMessage(` ${'m'.repeat(500)} `))).toBeUndefined();
      expect(problemOf(withMessage('😀'.repeat(500)))).toBeUndefined();
      expect(problemOf(withMessage('   '))).toBeUndefined();
      expect(problemOf(withMessage(null))).toBeUndefined();
      const subGroup = {
        ...group(2, US1_RULES.slice(1), 'Sub-group 02'),
        message: 'm'.repeat(501),
      };
      expect(problemOf([group(1, [US1_RULES[0], subGroup])])).toBe(
        'The error message of Sub-group 02 in Standard can have at most 500 characters.'
      );
    });

    it('checks group names like rule names, naming the earlier group', () => {
      expect(
        firstProblem(
          [
            mainBranch([
              group(1, US1_RULES.slice(0, 2), 'Older drivers'),
              group(2, [US1_RULES[2], rule(4, null, null)], ' older DRIVERS '),
            ]),
          ],
          CONTEXT
        )
      ).toEqual({
        message: 'Another group in Standard is already called Older drivers.',
        branchIndex: 0,
        itemId: 'group-2',
      });
      expect(
        problemOf([group(1, US1_RULES.slice(0, 2)), { ...US1_RULES[2], name: 'group 01' }])
      ).toBe('Another group in Standard is already called Group 01.');
    });

    it('keeps "Group NN" and "Sub-group NN" for the group numbered NN', () => {
      expect(problemOf([group(1, US1_RULES.slice(0, 2), 'Group 03')])).toBe(
        'Group 03 is kept for the group numbered 03.'
      );
      expect(
        problemOf([group(1, [US1_RULES[0], group(2, US1_RULES.slice(1), 'Sub-group 3')])])
      ).toBe('Sub-group 3 is kept for the sub-group numbered 03.');
      expect(
        problemOf([group(1, [US1_RULES[0], group(2, US1_RULES.slice(1), 'Group 2')])])
      ).toBeUndefined();
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

    it('checks a group’s name, then what it holds, its members’ number, its message', () => {
      const tooLong = 'm'.repeat(501);
      expect(problemOf([group(1, [US1_RULES[0]], ' ')])).toBe(
        'Enter a name for every group in Standard.'
      );
      expect(problemOf([group(1, [US1_RULES[0], group(2, [group(3, US1_RULES.slice(1))])])])).toBe(
        'Group 02 in Standard can only hold rules.'
      );
      expect(problemOf([{ ...group(1, [US1_RULES[0]]), message: tooLong }])).toBe(
        'Group 01 in Standard needs at least two rules.'
      );
      expect(
        problemOf([{ ...group(1, [ageRule({ message: '' }), US1_RULES[1]]), message: tooLong }])
      ).toBe('The error message of Group 01 in Standard can have at most 500 characters.');
    });

    it('checks a group before its members, and its members before the next item', () => {
      expect(problemOf([group(1, [ageRule({ target: null })])])).toBe(
        'Group 01 in Standard needs at least two rules.'
      );
      expect(
        problemOf([
          group(1, [US1_RULES[0], { ...US1_RULES[1], message: '' }]),
          { ...US1_RULES[2], target: null },
        ])
      ).toBe('Rule 02 in Standard has no error message.');
      expect(
        problemOf([
          group(1, [US1_RULES[0], { ...US1_RULES[1], message: '' }], ''),
          { ...US1_RULES[2], target: null },
        ])
      ).toBe('Enter a name for every group in Standard.');
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
    expect(nameProblem('Old enough', US1_RULES[0], standard, [standard])).toBeNull();
    expect(nameProblem('Rule 01', US1_RULES[0], standard, [standard])).toBeNull();
    expect(nameProblem(' rule 1 ', US1_RULES[0], standard, [standard])).toBeNull();
  });

  it('needs a name of at most 100 characters', () => {
    expect(nameProblem('  ', US1_RULES[0], standard, [standard])).toBe('Enter a name.');
    expect(nameProblem('n'.repeat(101), US1_RULES[0], standard, [standard])).toBe(
      'A name can have at most 100 characters.'
    );
  });

  it('refuses another item’s name, naming the branch (F12)', () => {
    expect(nameProblem(' RULE 02 ', US1_RULES[0], standard, [standard])).toBe(
      'Another rule in Standard is already called Rule 02.'
    );
    expect(nameProblem('held b', US1_RULES[0], standard, [standard])).toBe(
      'Another sub-group in Standard is already called Held B.'
    );
    expect(nameProblem('Group 01', US1_RULES[0], standard, [standard])).toBe(
      'Another group in Standard is already called Group 01.'
    );
    expect(
      nameProblem('Rule 01', US1_RULES[1], { ...standard, name: 'Ambulance' }, [standard])
    ).toBe('Another rule in Ambulance is already called Rule 01.');
  });

  it('keeps reserved names for their items (FR-005)', () => {
    expect(nameProblem('Rule 08', US1_RULES[0], standard, [standard])).toBe(
      'Rule 08 is kept for the rule numbered 08.'
    );
    expect(nameProblem('Sub-group 7', US1_RULES[0], standard, [standard])).toBe(
      'Sub-group 7 is kept for the sub-group numbered 07.'
    );
  });

  it('checks group and sub-group names too (F12)', () => {
    const group1 = findItem(standard.items, 'group-1')?.item as GroupItem;
    const subGroup = findItem(standard.items, 'group-2')?.item as GroupItem;
    expect(nameProblem('Older drivers', group1, standard, [standard])).toBeNull();
    expect(nameProblem('group 01', group1, standard, [standard])).toBeNull();
    expect(nameProblem('Sub-group 1', group1, standard, [standard])).toBeNull();
    expect(nameProblem('Group 01', subGroup, standard, [standard])).toBe(
      'Another group in Standard is already called Group 01.'
    );
    expect(nameProblem('Rule 02', subGroup, standard, [standard])).toBe(
      'Another rule in Standard is already called Rule 02.'
    );
    expect(nameProblem('held b', group1, { ...standard, name: 'Ambulance' }, [standard])).toBe(
      'Another sub-group in Ambulance is already called Held B.'
    );
    expect(nameProblem('Group 03', group1, standard, [standard])).toBe(
      'Group 03 is kept for the group numbered 03.'
    );
    expect(nameProblem('Sub-group 3', subGroup, standard, [standard])).toBe(
      'Sub-group 3 is kept for the sub-group numbered 03.'
    );
    expect(nameProblem('Sub-group 02', subGroup, standard, [standard])).toBeNull();
    expect(nameProblem('Rule 2', subGroup, standard, [standard])).toBe(
      'Rule 2 is kept for the rule numbered 02.'
    );
    expect(nameProblem('Rule 9', subGroup, standard, [standard])).toBe(
      'Rule 9 is kept for the rule numbered 09.'
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

  it('names a rule a based branch inherits unchanged once, for the main branch (FR-006)', () => {
    const documents = requestedRuleDocuments(
      [PID, MDL],
      [{ document_type: 'pid', fields: ['birthdate'] }]
    );
    const main = mainBranch();
    const based = newBranch(main, 'based', 'Ambulance', null);
    const changed = must(changeItem(main, based, { ...US1_RULES[2], message: 'Held B?' }));
    const removed = must(removeItem(main, changed, 'rule-2'));
    expect(
      unrequestedRules([main, removed], documents).map(({ branchIndex, rule: item }) => [
        branchIndex,
        item.id,
      ])
    ).toEqual([
      [0, 'rule-2'],
      [0, 'rule-3'],
      [1, 'rule-3'],
    ]);
  });
});

describe('rulesCheckingData (FR-029, F18)', () => {
  /** The branch index and identifier of each rule found. */
  function found(...args: Parameters<typeof rulesCheckingData>) {
    return rulesCheckingData(...args).map(({ branchIndex, rule: item }) => [branchIndex, item.id]);
  }

  it('lists the rules that check a document, in branch and tree order', () => {
    expect(found([mainBranch()], 'mdl')).toEqual([
      [0, 'rule-2'],
      [0, 'rule-3'],
    ]);
    expect(found([mainBranch()], 'pid')).toEqual([[0, 'rule-1']]);
  });

  it('lists the rules that check a field, whatever part they check', () => {
    expect(found([mainBranch()], 'pid', 'birthdate')).toEqual([[0, 'rule-1']]);
    expect(found([mainBranch()], 'mdl', 'driving_privileges')).toEqual([
      [0, 'rule-2'],
      [0, 'rule-3'],
    ]);
    expect(found([mainBranch()], 'pid', 'nationalities')).toEqual([]);
    expect(found([mainBranch()], 'mdl', 'birthdate')).toEqual([]);
  });

  it('finds rules in groups and sub-groups', () => {
    const items = [group(1, [US1_RULES[1], group(2, [US1_RULES[0], US1_RULES[2]])])];
    expect(found([mainBranch(items)], 'pid', 'birthdate')).toEqual([[0, 'rule-1']]);
  });

  it('leaves out rules without a target', () => {
    expect(found([mainBranch([rule(1, null, null)])], 'pid')).toEqual([]);
  });

  it('names the rules of every branch, inherited and removed ones included', () => {
    const main = mainBranch();
    const based = newBranch(main, 'based', 'Ambulance', null);
    const removed = must(removeItem(main, based, 'rule-1'));
    const empty = branch('School transport', [{ ...US1_RULES[0], id: 'rule-4', name: 'Rule 04' }]);
    expect(found([main, removed, empty], 'pid', 'birthdate')).toEqual([
      [0, 'rule-1'],
      [1, 'rule-1'],
      [2, 'rule-4'],
    ]);
    const removedGroup = must(
      removeItem(
        mainBranch([group(1, US1_RULES)]),
        newBranch(mainBranch([group(1, US1_RULES)]), 'based', 'Ambulance', null),
        'group-1'
      )
    );
    expect(found([removedGroup], 'mdl')).toEqual([
      [0, 'rule-2'],
      [0, 'rule-3'],
    ]);
  });
});

describe('the branches of a based branch (T060)', () => {
  const main = mainBranch();
  const based = () => ({ ...newBranch(main, 'based', 'Ambulance', null), id: 'ambulance' });

  it('checks only what a based branch changed or added (FR-006)', () => {
    const branch = based();
    expect(checkedInBranch(branch, US1_RULES[0])).toBe(false);
    expect(checkedInBranch(branch, { ...US1_RULES[0], mark: 'removed' })).toBe(false);
    expect(checkedInBranch(branch, { ...US1_RULES[0], mark: 'changed' })).toBe(true);
    expect(checkedInBranch(branch, { ...US1_RULES[0], mark: 'added' })).toBe(true);
    expect(checkedInBranch(main, US1_RULES[0])).toBe(true);
  });

  it('reports a problem of an inherited rule once, for the main branch', () => {
    const broken = mainBranch([{ ...US1_RULES[0], message: '' }]);
    const branch = newBranch(broken, 'based', 'Ambulance', null);
    expect(firstProblem([broken, branch], CONTEXT)).toEqual({
      message: 'Rule 01 in Standard has no error message.',
      branchIndex: 0,
      itemId: 'rule-1',
    });
  });

  it('checks a changed or added rule in its branch', () => {
    const changed = must(changeItem(main, based(), { ...US1_RULES[0], message: ' ' }));
    expect(firstProblem([main, changed], CONTEXT)).toEqual({
      message: 'Rule 01 in Ambulance has no error message.',
      branchIndex: 1,
      itemId: 'rule-1',
    });
    const added = must(addRuleToBranch(based(), rule(9, null, null)));
    expect(firstProblem([main, added], CONTEXT)?.message).toBe(
      'Rule 09 in Ambulance: choose the data to check.'
    );
  });

  it('checks removed items like the others, in the main branch they mirror', () => {
    const broken = mainBranch([{ ...US1_RULES[0], message: '' }, US1_RULES[1]]);
    const removed = must(
      removeItem(broken, newBranch(broken, 'based', 'Ambulance', null), 'rule-1')
    );
    expect(firstProblem([broken, removed], CONTEXT)?.branchIndex).toBe(0);
  });

  it('takes the names an undo gives back in a based branch (FR-005)', () => {
    const renamed = must(changeItem(main, based(), { ...US1_RULES[0], name: 'Minimum age' }));
    const added = must(
      addRuleToBranch(renamed, { ...US1_RULES[0], id: 'rule-9', name: 'rule 01' })
    );
    expect(firstProblem([main, added], CONTEXT)).toEqual({
      message: 'Another rule in Ambulance is already called Rule 01.',
      branchIndex: 1,
      itemId: 'rule-9',
    });
    // The changed rule itself gets its main-branch name back with an undo
    expect(firstProblem([main, renamed], CONTEXT)).toBeNull();
  });

  it('takes removed items’ names', () => {
    const removed = must(removeItem(main, based(), 'rule-2'));
    const added = must(
      addRuleToBranch(removed, { ...US1_RULES[1], id: 'rule-9', name: 'Rule 02' })
    );
    expect(firstProblem([main, added], CONTEXT)?.message).toBe(
      'Another rule in Ambulance is already called Rule 02.'
    );
  });
});

describe('nameProblem in variants (F12; propagation rule 7)', () => {
  const main = mainBranch();
  const renamed = must(
    changeItem(main, newBranch(main, 'based', 'Ambulance', null), {
      ...US1_RULES[0],
      name: 'Minimum age',
    })
  );
  const ambulance = must(
    addRuleToBranch(renamed, { ...US1_RULES[1], id: 'rule-9', name: 'Extra' })
  );
  const branches = [main, ambulance];

  it('refuses a name an undo gives back in a based branch', () => {
    expect(nameProblem('Rule 01', US1_RULES[1], ambulance, branches)).toBe(
      'Another rule in Ambulance is already called Rule 01.'
    );
    expect(nameProblem('Rule 01', ambulance.items[0], ambulance, branches)).toBeNull();
  });

  it('refuses a rename in the main branch that clashes in a based branch, naming it', () => {
    expect(nameProblem('minimum age', US1_RULES[1], main, branches)).toBe(
      'Another rule in Ambulance is already called Minimum age.'
    );
    expect(nameProblem('Extra', US1_RULES[0], main, branches)).toBe(
      'Another rule in Ambulance is already called Extra.'
    );
    expect(nameProblem('Minimum age', US1_RULES[0], main, branches)).toBeNull();
  });

  it('ignores branches that started empty', () => {
    const taxi = {
      ...newBranch(main, 'empty', 'Taxi', null),
      items: [{ ...US1_RULES[0], name: 'Taxi rule' }],
    };
    expect(nameProblem('Taxi rule', US1_RULES[1], main, [main, taxi])).toBeNull();
  });
});

describe('variantNameProblem (W3)', () => {
  const others = ['Standard', ' Ambulance '];

  it('needs a name of at most 100 characters', () => {
    expect(variantNameProblem('  ', others)).toBe('Enter a name for the variant.');
    expect(variantNameProblem('v'.repeat(101), others)).toBe(
      'A variant’s name can have at most 100 characters.'
    );
  });

  it('refuses another variant’s name, ignoring letter case and outer spaces (FR-020)', () => {
    expect(variantNameProblem(' ambulance', others)).toBe(
      'Another variant is already called Ambulance.'
    );
    expect(variantNameProblem('STANDARD', others)).toBe(
      'Another variant is already called Standard.'
    );
    expect(variantNameProblem('School transport', others)).toBeNull();
  });
});
