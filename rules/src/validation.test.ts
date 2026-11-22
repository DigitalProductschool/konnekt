import type {
  BranchInput,
  GroupItem,
  RuleItem,
  RuleTreeItem,
} from '@connection-portal/api-types/form-connections';
import { describe, expect, it } from 'vitest';

import { addRuleToBranch, changeItem, newBranch, removeItem } from './branches';
import { requestedRuleDocuments } from './conditions';
import { CONDITION_PROBLEM_MESSAGES, EDIT_MESSAGES, RULES_MESSAGES } from './constants';
import serverMessages from './fixtures/server-messages.json';
import type { Language } from './language';
import { CONTEXT, mainBranch, MDL, OPTION_SETS, PID, rule, target, US1_RULES } from './testData';
import { findItem, foldName } from './tree';
import type { ItemNoun, RuleContext, RulesProblem, RulesProblemCode } from './types';
import {
  checkedInBranch,
  checksUnrequestedData,
  firstProblem as firstProblemAlone,
  groupProblem,
  groupProblemOf,
  isConditionProblem,
  nameProblem,
  nameProblemOf,
  publishProblems,
  reservedNameProblem,
  ruleProblem,
  ruleProblemOf,
  rulesCheckingData,
  unrequestedRules,
  variantNameProblem,
  variantNameProblemOf,
} from './validation';

/**
 * `firstProblem`, checking on every call that `publishProblems` starts with the same problem
 * (spec 011, R10): every case below that calls `firstProblem` is also a case of the two agreeing
 */
function firstProblem(branches: BranchInput[], context: RuleContext): RulesProblem | null {
  const first = firstProblemAlone(branches, context);
  expect(publishProblems(branches, context)[0] ?? null).toEqual(first);
  return first;
}

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

/** The first problem's code of a main branch with these items (spec 009, R10). */
function codeOf(
  items: RuleTreeItem[],
  context: RuleContext = CONTEXT
): RulesProblemCode | undefined {
  return firstProblem([mainBranch(items)], context)?.code;
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

/**
 * CONTEXT in German (spec 009, R4), the Date of birth with the German label the catalog gives
 * with `Accept-Language: de`
 */
const GERMAN: RuleContext = {
  ...CONTEXT,
  language: 'de',
  documents: CONTEXT.documents.map((document) => ({
    ...document,
    fields: document.fields.map((field) =>
      field.key === 'birthdate' ? { ...field, label: 'Geburtsdatum' } : field
    ),
  })),
};

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
        code: 'tooManyBranches',
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
      expect(firstProblem(branches, CONTEXT)?.code).toBe('mainBranch');
    });

    it('needs a name for every variant', () => {
      expect(firstProblem([mainBranch(), branch('  ', [])], CONTEXT)).toEqual({
        code: 'branchNameMissing',
        message: 'Enter a name for every variant.',
        branchIndex: 1,
        itemId: null,
      });
      expect(firstProblem([mainBranch(), branch('x'.repeat(101), [])], CONTEXT)?.message).toBe(
        'A variant’s name can have at most 100 characters.'
      );
      expect(firstProblem([mainBranch(), branch('x'.repeat(101), [])], CONTEXT)?.code).toBe(
        'branchNameTooLong'
      );
      expect(firstProblem([mainBranch(), branch('x'.repeat(100), [])], CONTEXT)).toBeNull();
    });

    it('refuses two variants of the same name, ignoring letter case and outer spaces', () => {
      expect(
        firstProblem([mainBranch(), branch('Ambulance', []), branch(' AMBULANCE ', [])], CONTEXT)
      ).toEqual({
        code: 'branchNameTwice',
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
      expect(firstProblem([long], CONTEXT)?.code).toBe('descriptionTooLong');
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
      expect(firstProblem([branch('Taxi', twoHundred, 'main')], CONTEXT)?.code).toBe('chooseData');
      expect(
        firstProblem([branch('Taxi', [...twoHundred, rule(200, null, null)], 'main')], CONTEXT)
      ).toEqual({
        code: 'tooManyItems',
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
      expect(codeOf([ageRule({ id, name: 'Old enough' })])).toBe('invalidIdentifier');
    });

    it('refuses an identifier twice in a branch, but not in two branches', () => {
      expect(problemOf([ageRule(), ageRule({ name: 'Copy' })])).toBe(
        'The rules contain an invalid identifier. Reload the connection and try again.'
      );
      expect(codeOf([ageRule(), ageRule({ name: 'Copy' })])).toBe('invalidIdentifier');
      expect(problemOf([group(1, US1_RULES.slice(0, 2)), { ...group(1, []), name: 'Again' }])).toBe(
        'The rules contain an invalid identifier. Reload the connection and try again.'
      );
      expect(codeOf([group(1, US1_RULES.slice(0, 2)), { ...group(1, []), name: 'Again' }])).toBe(
        'invalidIdentifier'
      );
      expect(firstProblem([mainBranch(), branch('Ambulance', US1_RULES)], CONTEXT)).toBeNull();
    });
  });

  describe('names', () => {
    it('needs a name for every rule, group and sub-group', () => {
      expect(firstProblem([mainBranch([ageRule({ name: ' ' })])], CONTEXT)).toEqual({
        code: 'itemNameMissing',
        message: 'Enter a name for every rule in Standard.',
        branchIndex: 0,
        itemId: 'rule-1',
      });
      expect(problemOf([group(1, US1_RULES.slice(0, 2), '')])).toBe(
        'Enter a name for every group in Standard.'
      );
      expect(codeOf([group(1, US1_RULES.slice(0, 2), '')])).toBe('itemNameMissing');
      expect(problemOf([group(1, [US1_RULES[0], group(2, US1_RULES.slice(1), '  ')])])).toBe(
        'Enter a name for every sub-group in Standard.'
      );
      expect(codeOf([group(1, [US1_RULES[0], group(2, US1_RULES.slice(1), '  ')])])).toBe(
        'itemNameMissing'
      );
    });

    it('limits names to 100 characters', () => {
      expect(problemOf([ageRule({ name: 'n'.repeat(101) })])).toBe(
        'A rule in Standard has a name longer than 100 characters.'
      );
      expect(codeOf([ageRule({ name: 'n'.repeat(101) })])).toBe('itemNameTooLong');
      expect(problemOf([ageRule({ name: 'n'.repeat(100) })])).toBeUndefined();
    });

    it('refuses a name twice in a branch, ignoring letter case and outer spaces (F12)', () => {
      const items = [ageRule({ name: 'Old enough' }), { ...US1_RULES[1], name: ' OLD ENOUGH ' }];
      expect(firstProblem([mainBranch(items)], CONTEXT)).toEqual({
        code: 'nameTaken',
        message: 'There’s already a rule called "Old enough" in Standard.',
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
      ).toBe('There’s already a group called "Licence" in Standard.');
      expect(
        codeOf([group(1, US1_RULES.slice(0, 2), 'Licence'), { ...US1_RULES[2], name: 'licence' }])
      ).toBe('nameTaken');
      expect(
        problemOf([
          group(1, [US1_RULES[0], group(2, US1_RULES.slice(1), 'Held B')]),
          { ...rule(4, US1_RULES[0].target, US1_RULES[0].condition), name: 'Held b' },
        ])
      ).toBe('There’s already a sub-group called "Held B" in Standard.');
      expect(
        codeOf([
          group(1, [US1_RULES[0], group(2, US1_RULES.slice(1), 'Held B')]),
          { ...rule(4, US1_RULES[0].target, US1_RULES[0].condition), name: 'Held b' },
        ])
      ).toBe('nameTaken');
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
      expect(codeOf([ageRule({ name: ` ${name} ` })])).toBe('nameReserved');
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
      expect(codeOf([group(3, US1_RULES.slice(0, 2), 'Rule 3')])).toBe('nameReserved');
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
      expect(codeOf([ageRule({ target: null })])).toBe('chooseData');
      expect(problemOf([ageRule({ target: target('mdl', 'driving_privileges') })])).toBe(
        'Rule 01 in Standard: choose the data to check.'
      );
      expect(codeOf([ageRule({ target: target('mdl', 'driving_privileges') })])).toBe('chooseData');
      expect(
        problemOf([ageRule({ target: target('mdl', 'driving_privileges', 'issue_date') })])
      ).toBe('Rule 01 in Standard: choose the data to check.');
      expect(codeOf([ageRule({ target: target('mdl', 'driving_privileges', 'issue_date') })])).toBe(
        'chooseData'
      );
    });

    it('refuses data that is no longer requested (F11)', () => {
      const context = requested([{ document_type: 'mdl', fields: ['driving_privileges'] }]);
      expect(firstProblem([mainBranch()], context)).toEqual({
        code: 'notRequested',
        message: 'Rule 01 in Standard checks data that’s no longer requested.',
        branchIndex: 0,
        itemId: 'rule-1',
      });
      const withoutClasses = requested([{ document_type: 'pid', fields: ['birthdate'] }]);
      expect(problemOf(US1_RULES, withoutClasses)).toBe(
        'Rule 02 in Standard checks data that’s no longer requested.'
      );
      expect(codeOf(US1_RULES, withoutClasses)).toBe('notRequested');
    });

    it('refuses images and unknown fields', () => {
      expect(problemOf([ageRule({ target: target('pid', 'picture') })])).toBe(
        'Rule 01 in Standard checks data that’s no longer requested.'
      );
      expect(codeOf([ageRule({ target: target('pid', 'picture') })])).toBe('notRequested');
      expect(problemOf([ageRule({ target: target('pid', 'shoe_size') })])).toBe(
        'Rule 01 in Standard checks data that’s no longer requested.'
      );
      expect(codeOf([ageRule({ target: target('pid', 'shoe_size') })])).toBe('notRequested');
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
      expect(codeOf([ageRule({ target: ruleTarget })])).toBe('unknownPart');
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
      ['no check', target('pid', 'birthdate'), null, 'choose a check.', 'choose_check'],
      [
        'another kind’s check',
        target('mdl', 'height'),
        { operator: 'contains', value: 'x' },
        'choose a check.',
        'choose_check',
      ],
      [
        'no number',
        target('mdl', 'height'),
        { operator: 'less_than', value: null },
        'enter a number.',
        'enter_number',
      ],
      [
        'spaces only',
        target('pid', 'address_locality'),
        { operator: 'equal_to', value: '  ', match_case: false },
        'enter a text to compare with.',
        'enter_text',
      ],
      [
        'no value',
        target('pid', 'nationalities'),
        { operator: 'includes_one_of', values: [] },
        'choose at least one value.',
        'choose_value',
      ],
      [
        'a value outside the set',
        target('pid', 'nationalities'),
        { operator: 'includes_one_of', values: ['DE', 'XX'] },
        'choose values from the list.',
        'values_from_list',
      ],
      [
        'a value twice',
        target('pid', 'nationalities'),
        { operator: 'includes_one_of', values: ['DE', 'DE'] },
        'choose each value only once.',
        'value_once',
      ],
      [
        'an invalid date',
        target('pid', 'birthdate'),
        { operator: 'before', date: '2023-02-29' },
        'enter a date.',
        'enter_date',
      ],
      [
        '0 years',
        target('pid', 'birthdate'),
        { operator: 'at_least_years_ago', years: 0 },
        'enter a number of years of at least 1.',
        'years_at_least_1',
      ],
      [
        '1.5 years',
        target('pid', 'birthdate'),
        { operator: 'exactly_years_ago', years: 1.5 },
        'enter a number of years of at least 1.',
        'years_at_least_1',
      ],
      [
        'no unit',
        target('mdl', 'expiry_date'),
        { operator: 'at_least_from_now', amount: 6, unit: null },
        'choose years or months.',
        'choose_unit',
      ],
      [
        '0 months',
        target('mdl', 'expiry_date'),
        { operator: 'at_least_from_now', amount: 0, unit: 'months' as const },
        'enter a number of months of at least 1.',
        'amount_at_least_1',
      ],
      [
        'no years from now',
        target('mdl', 'expiry_date'),
        { operator: 'less_than_from_now', amount: null, unit: 'years' as const },
        'enter a number of years of at least 1.',
        'amount_at_least_1',
      ],
    ])('refuses %s', (_name, ruleTarget, condition, problem, code) => {
      expect(problemOf([ageRule({ target: ruleTarget, condition })])).toBe(
        `Rule 01 in Standard: ${problem}`
      );
      // The incomplete condition's code is its `ConditionProblem`
      expect(codeOf([ageRule({ target: ruleTarget, condition })])).toBe(code);
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
      expect(
        codeOf([
          ageRule({
            target: target('mdl', 'driving_privileges', 'classes'),
            condition: { operator: 'includes_one_of', values: ['B', 'XL'] },
          }),
        ])
      ).toBe('values_from_list');
    });
  });

  describe('messages', () => {
    it('needs an error message (FR-004)', () => {
      expect(problemOf([ageRule({ message: ' \n ' })])).toBe(
        'Rule 01 in Standard has no error message.'
      );
      expect(codeOf([ageRule({ message: ' \n ' })])).toBe('noMessage');
    });

    it('limits it to 500 characters after trimming', () => {
      expect(problemOf([ageRule({ message: 'm'.repeat(501) })])).toBe(
        'The error message of Rule 01 in Standard can have at most 500 characters.'
      );
      expect(codeOf([ageRule({ message: 'm'.repeat(501) })])).toBe('messageTooLong');
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
        code: 'tooFewMembers',
        message: 'Group 01 in Standard needs at least two rules.',
        branchIndex: 0,
        itemId: 'group-1',
      });
      expect(problemOf([group(1, [])])).toBe('Group 01 in Standard needs at least two rules.');
      expect(codeOf([group(1, [])])).toBe('tooFewMembers');
      expect(
        firstProblem(
          [mainBranch([group(1, [US1_RULES[0], group(2, [US1_RULES[1]], 'Sub-group 02')])])],
          CONTEXT
        )
      ).toEqual({
        code: 'tooFewMembers',
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
          [mainBranch(), branch('Ambulance', [own([US1_RULES[0], removed])], 'based')],
          CONTEXT
        )?.code
      ).toBe('tooFewMembers');
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
        code: 'rulesOnly',
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
      expect(codeOf(withMessage('m'.repeat(501)))).toBe('messageTooLong');
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
      expect(codeOf([group(1, [US1_RULES[0], subGroup])])).toBe('messageTooLong');
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
        code: 'nameTaken',
        message: 'There’s already a group called "Older drivers" in Standard.',
        branchIndex: 0,
        itemId: 'group-2',
      });
      expect(
        problemOf([group(1, US1_RULES.slice(0, 2)), { ...US1_RULES[2], name: 'group 01' }])
      ).toBe('There’s already a group called "Group 01" in Standard.');
      expect(codeOf([group(1, US1_RULES.slice(0, 2)), { ...US1_RULES[2], name: 'group 01' }])).toBe(
        'nameTaken'
      );
    });

    it('keeps "Group NN" and "Sub-group NN" for the group numbered NN', () => {
      expect(problemOf([group(1, US1_RULES.slice(0, 2), 'Group 03')])).toBe(
        'Group 03 is kept for the group numbered 03.'
      );
      expect(codeOf([group(1, US1_RULES.slice(0, 2), 'Group 03')])).toBe('nameReserved');
      expect(
        problemOf([group(1, [US1_RULES[0], group(2, US1_RULES.slice(1), 'Sub-group 3')])])
      ).toBe('Sub-group 3 is kept for the sub-group numbered 03.');
      expect(codeOf([group(1, [US1_RULES[0], group(2, US1_RULES.slice(1), 'Sub-group 3')])])).toBe(
        'nameReserved'
      );
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
      expect(codeOf([ageRule({ name: '', target: null }), { ...US1_RULES[1], message: '' }])).toBe(
        'itemNameMissing'
      );
      expect(
        problemOf([
          US1_RULES[0],
          { ...US1_RULES[1], message: '' },
          { ...US1_RULES[2], target: null },
        ])
      ).toBe('Rule 02 in Standard has no error message.');
      expect(
        codeOf([US1_RULES[0], { ...US1_RULES[1], message: '' }, { ...US1_RULES[2], target: null }])
      ).toBe('noMessage');
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
        code: 'choose_check',
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
      expect(codeOf([group(1, [US1_RULES[0]], ' ')])).toBe('itemNameMissing');
      expect(problemOf([group(1, [US1_RULES[0], group(2, [group(3, US1_RULES.slice(1))])])])).toBe(
        'Group 02 in Standard can only hold rules.'
      );
      expect(codeOf([group(1, [US1_RULES[0], group(2, [group(3, US1_RULES.slice(1))])])])).toBe(
        'rulesOnly'
      );
      expect(problemOf([{ ...group(1, [US1_RULES[0]]), message: tooLong }])).toBe(
        'Group 01 in Standard needs at least two rules.'
      );
      expect(codeOf([{ ...group(1, [US1_RULES[0]]), message: tooLong }])).toBe('tooFewMembers');
      expect(
        problemOf([{ ...group(1, [ageRule({ message: '' }), US1_RULES[1]]), message: tooLong }])
      ).toBe('The error message of Group 01 in Standard can have at most 500 characters.');
      expect(
        codeOf([{ ...group(1, [ageRule({ message: '' }), US1_RULES[1]]), message: tooLong }])
      ).toBe('messageTooLong');
    });

    it('checks a group before its members, and its members before the next item', () => {
      expect(problemOf([group(1, [ageRule({ target: null })])])).toBe(
        'Group 01 in Standard needs at least two rules.'
      );
      expect(codeOf([group(1, [ageRule({ target: null })])])).toBe('tooFewMembers');
      expect(
        problemOf([
          group(1, [US1_RULES[0], { ...US1_RULES[1], message: '' }]),
          { ...US1_RULES[2], target: null },
        ])
      ).toBe('Rule 02 in Standard has no error message.');
      expect(
        codeOf([
          group(1, [US1_RULES[0], { ...US1_RULES[1], message: '' }]),
          { ...US1_RULES[2], target: null },
        ])
      ).toBe('noMessage');
      expect(
        problemOf([
          group(1, [US1_RULES[0], { ...US1_RULES[1], message: '' }], ''),
          { ...US1_RULES[2], target: null },
        ])
      ).toBe('Enter a name for every group in Standard.');
      expect(
        codeOf([
          group(1, [US1_RULES[0], { ...US1_RULES[1], message: '' }], ''),
          { ...US1_RULES[2], target: null },
        ])
      ).toBe('itemNameMissing');
    });

    it('reports a problem the main branch shares with a variant once, for the main branch', () => {
      const broken = [ageRule({ message: '' })];
      expect(
        firstProblem([mainBranch(broken), branch('Ambulance', broken, 'based')], CONTEXT)
      ).toEqual({
        code: 'noMessage',
        message: 'Rule 01 in Standard has no error message.',
        branchIndex: 0,
        itemId: 'rule-1',
      });
    });

    it('names a branch by its trimmed name', () => {
      expect(
        firstProblem([mainBranch(), branch(' Taxi ', [ageRule({ message: '' })])], CONTEXT)?.message
      ).toBe('Rule 01 in Taxi has no error message.');
      expect(
        firstProblem([mainBranch(), branch(' Taxi ', [ageRule({ message: '' })])], CONTEXT)?.code
      ).toBe('noMessage');
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
      'There’s already a rule called "Rule 02" in Standard.'
    );
    expect(nameProblem('held b', US1_RULES[0], standard, [standard])).toBe(
      'There’s already a sub-group called "Held B" in Standard.'
    );
    expect(nameProblem('Group 01', US1_RULES[0], standard, [standard])).toBe(
      'There’s already a group called "Group 01" in Standard.'
    );
    expect(
      nameProblem('Rule 01', US1_RULES[1], { ...standard, name: 'Ambulance' }, [standard])
    ).toBe('There’s already a rule called "Rule 01" in Ambulance.');
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
      'There’s already a group called "Group 01" in Standard.'
    );
    expect(nameProblem('Rule 02', subGroup, standard, [standard])).toBe(
      'There’s already a rule called "Rule 02" in Standard.'
    );
    expect(nameProblem('held b', group1, { ...standard, name: 'Ambulance' }, [standard])).toBe(
      'There’s already a sub-group called "Held B" in Ambulance.'
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

describe('ruleProblemOf and ruleProblem (spec 009, R4, R10)', () => {
  const amountOf = (amount: number) =>
    ageRule({
      target: target('mdl', 'expiry_date'),
      condition: { operator: 'at_least_from_now', amount, unit: 'months' },
    });

  it.each([
    [
      'no data',
      ageRule({ target: null }),
      'chooseData',
      'Rule 01 in Standard: choose the data to check.',
      'Rule 01 in Standard: Wählen Sie die zu prüfenden Daten aus.',
    ],
    [
      'an image',
      ageRule({ target: target('pid', 'picture') }),
      'notRequested',
      'Rule 01 in Standard checks data that’s no longer requested.',
      'Rule 01 in Standard prüft Daten, die nicht mehr angefordert werden.',
    ],
    [
      'a part the field doesn’t have',
      ageRule({ target: target('pid', 'birthdate', 'country') }),
      'unknownPart',
      'Rule 01 in Standard checks a part that Date of birth doesn’t have.',
      'Rule 01 in Standard prüft einen Bestandteil, den das Feld „Geburtsdatum“ nicht hat.',
    ],
    [
      'no check',
      ageRule({ condition: null }),
      'choose_check',
      'Rule 01 in Standard: choose a check.',
      'Rule 01 in Standard: Wählen Sie eine Prüfung aus.',
    ],
    [
      '0 months',
      amountOf(0),
      'amount_at_least_1',
      'Rule 01 in Standard: enter a number of months of at least 1.',
      'Rule 01 in Standard: Geben Sie mindestens 1 Monat ein.',
    ],
    [
      'no message',
      ageRule({ message: ' ' }),
      'noMessage',
      'Rule 01 in Standard has no error message.',
      'Rule 01 in Standard hat keine Fehlermeldung.',
    ],
    [
      'a long message',
      ageRule({ message: 'm'.repeat(501) }),
      'messageTooLong',
      'The error message of Rule 01 in Standard can have at most 500 characters.',
      'Die Fehlermeldung von Rule 01 in Standard darf höchstens 500 Zeichen lang sein.',
    ],
  ])('names %s by its code, in both languages', (_name, checked, code, english, german) => {
    expect(ruleProblemOf(checked, ' Standard ', CONTEXT)).toEqual({ code, message: english });
    // ruleProblem() is the message, as it was: English by default
    expect(ruleProblem(checked, ' Standard ', CONTEXT)).toBe(english);
    expect(ruleProblem(checked, ' Standard ', { ...CONTEXT, language: 'en' })).toBe(english);
    expect(ruleProblemOf(checked, ' Standard ', GERMAN)).toEqual({ code, message: german });
    expect(ruleProblem(checked, ' Standard ', GERMAN)).toBe(german);
  });

  it('finds nothing in a complete rule, in either language', () => {
    expect(ruleProblemOf(ageRule(), 'Standard', CONTEXT)).toBeNull();
    expect(ruleProblemOf(amountOf(6), 'Standard', GERMAN)).toBeNull();
  });

  it('tells an incomplete condition’s code from the others', () => {
    expect(isConditionProblem('choose_check')).toBe(true);
    expect(isConditionProblem('amount_at_least_1')).toBe(true);
    expect(isConditionProblem('chooseData')).toBe(false);
    expect(isConditionProblem('noMessage')).toBe(false);
    expect(isConditionProblem('unknownVariant')).toBe(false);
  });
});

describe('groupProblemOf and groupProblem (spec 009, R4, R10)', () => {
  it.each([
    [
      'too few members',
      group(1, [US1_RULES[0]]),
      'group',
      'tooFewMembers',
      'Group 01 in Standard needs at least two rules.',
      'Group 01 in Standard braucht mindestens zwei Regeln.',
    ],
    [
      'a group in a sub-group',
      group(2, [group(3, US1_RULES.slice(1)), US1_RULES[0]], 'Sub-group 02'),
      'sub-group',
      'rulesOnly',
      'Sub-group 02 in Standard can only hold rules.',
      'Sub-group 02 in Standard kann nur Regeln enthalten.',
    ],
    [
      'a long message',
      { ...group(1, US1_RULES.slice(0, 2)), message: 'm'.repeat(501) },
      'group',
      'messageTooLong',
      'The error message of Group 01 in Standard can have at most 500 characters.',
      'Die Fehlermeldung von Group 01 in Standard darf höchstens 500 Zeichen lang sein.',
    ],
  ] as [string, GroupItem, ItemNoun, RulesProblemCode, string, string][])(
    'names %s by its code, in both languages',
    (_name, checked, noun, code, english, german) => {
      expect(groupProblemOf(checked, noun, ' Standard ')).toEqual({ code, message: english });
      expect(groupProblem(checked, noun, ' Standard ')).toBe(english);
      expect(groupProblemOf(checked, noun, ' Standard ', false, 'de')).toEqual({
        code,
        message: german,
      });
      expect(groupProblem(checked, noun, ' Standard ', false, 'de')).toBe(german);
    }
  );

  it('finds nothing in a group that holds two rules', () => {
    expect(groupProblemOf(group(1, US1_RULES.slice(0, 2)), 'group', 'Standard', false, 'de')).toBe(
      null
    );
  });
});

describe('firstProblem in German (spec 009, R4)', () => {
  const ambulance = (items: RuleTreeItem[]) => branch('Ambulance', items);

  it.each([
    [
      'a 21st variant',
      [mainBranch(), ...Array.from({ length: 20 }, (_, index) => branch(`Variant ${index}`, []))],
      'Eine Anbindung kann höchstens 20 Varianten haben.',
    ],
    ['no main branch', [ambulance([])], 'Die Regeln brauchen genau eine Hauptvariante.'],
    [
      'a variant without a name',
      [mainBranch(), branch('  ', [])],
      'Geben Sie für jede Variante einen Namen ein.',
    ],
    [
      'two variants of one name',
      [mainBranch(), ambulance([]), branch(' AMBULANCE ', [])],
      'Zwei Varianten heißen AMBULANCE. Geben Sie jeder Variante einen eigenen Namen.',
    ],
    [
      'a long description',
      [{ ...mainBranch(), description: 'd'.repeat(501) }],
      'Die Beschreibung von Standard darf höchstens 500 Zeichen lang sein.',
    ],
    [
      'an invalid identifier',
      [mainBranch([ageRule({ id: 'rule-01' })])],
      'Die Regeln enthalten eine ungültige Kennung. Laden Sie die Anbindung neu und versuchen Sie es erneut.',
    ],
    [
      'a sub-group without a name',
      [mainBranch([group(1, [US1_RULES[0], group(2, US1_RULES.slice(1), '  ')])])],
      'Geben Sie für jede Untergruppe in Standard einen Namen ein.',
    ],
    [
      'a long name',
      [mainBranch([ageRule({ name: 'n'.repeat(101) })])],
      'Eine Regel in Standard hat einen Namen mit mehr als 100 Zeichen.',
    ],
    [
      'a name twice',
      [mainBranch([ageRule({ name: 'Old enough' }), { ...US1_RULES[1], name: 'old enough' }])],
      'In Standard gibt es bereits eine Regel namens „Old enough“.',
    ],
    [
      'a reserved name',
      [mainBranch([group(1, US1_RULES.slice(0, 2), 'Group 03')])],
      'Group 03 ist für die Gruppe mit der Nummer 03 reserviert.',
    ],
    [
      'a rule without data in a variant',
      [mainBranch(), ambulance([group(1, [US1_RULES[0], { ...US1_RULES[1], target: null }])])],
      'Rule 02 in Ambulance: Wählen Sie die zu prüfenden Daten aus.',
    ],
    [
      'a group with one rule',
      [mainBranch([group(1, [US1_RULES[0]])])],
      'Group 01 in Standard braucht mindestens zwei Regeln.',
    ],
  ] as [string, BranchInput[], string][])(
    'refuses %s in German, with the English problem’s code and place',
    (_name, branches, german) => {
      const english = firstProblem(branches, CONTEXT);
      expect(english).not.toBeNull();
      expect(firstProblem(branches, GERMAN)).toEqual({ ...english, message: german });
    }
  );

  it('accepts what it accepts in English', () => {
    expect(firstProblem([mainBranch(), branch('Ambulance', US1_RULES)], GERMAN)).toBeNull();
  });
});

describe('nameProblem and variantNameProblem in German, with codes (spec 009, R4, R10)', () => {
  const standard = mainBranch([
    ...US1_RULES.slice(0, 2),
    group(1, [US1_RULES[2], group(2, [rule(4, null, null), rule(5, null, null)], 'Held B')]),
  ]);

  it.each([
    ['no name', '  ', 'nameMissing', 'Enter a name.', 'Geben Sie einen Namen ein.'],
    [
      'a long name',
      'n'.repeat(101),
      'nameTooLong',
      'A name can have at most 100 characters.',
      'Ein Name darf höchstens 100 Zeichen lang sein.',
    ],
    [
      'a rule’s name',
      ' RULE 02 ',
      'nameTaken',
      'There’s already a rule called "Rule 02" in Standard.',
      'In Standard gibt es bereits eine Regel namens „Rule 02“.',
    ],
    [
      'a group’s name',
      'Group 01',
      'nameTaken',
      'There’s already a group called "Group 01" in Standard.',
      'In Standard gibt es bereits eine Gruppe namens „Group 01“.',
    ],
    [
      'a sub-group’s name',
      'held b',
      'nameTaken',
      'There’s already a sub-group called "Held B" in Standard.',
      'In Standard gibt es bereits eine Untergruppe namens „Held B“.',
    ],
    [
      'a rule’s reserved name',
      'Rule 08',
      'nameReserved',
      'Rule 08 is kept for the rule numbered 08.',
      'Rule 08 ist für die Regel mit der Nummer 08 reserviert.',
    ],
    [
      'a sub-group’s reserved name',
      'Sub-group 7',
      'nameReserved',
      'Sub-group 7 is kept for the sub-group numbered 07.',
      'Sub-group 7 ist für die Untergruppe mit der Nummer 07 reserviert.',
    ],
  ])('refuses %s by its code, in both languages', (_name, name, code, english, german) => {
    expect(nameProblemOf(name, US1_RULES[0], standard, [standard])).toEqual({
      code,
      message: english,
    });
    expect(nameProblem(name, US1_RULES[0], standard, [standard], 'de')).toBe(german);
    expect(nameProblemOf(name, US1_RULES[0], standard, [standard], 'de')).toEqual({
      code,
      message: german,
    });
  });

  it('keeps the stored English names reserved in German, and no German ones (FR-007)', () => {
    expect(nameProblem('Regel 08', US1_RULES[0], standard, [standard], 'de')).toBeNull();
    expect(reservedNameProblem('Rule 08', US1_RULES[0], 'de')).toBe(
      'Rule 08 ist für die Regel mit der Nummer 08 reserviert.'
    );
    expect(reservedNameProblem('Rule 01', US1_RULES[0], 'de')).toBeNull();
  });

  it('names the based variant a rename in the main branch clashes in (rule 7)', () => {
    const main = mainBranch();
    const renamed = must(
      changeItem(main, newBranch(main, 'based', 'Ambulance', null), {
        ...US1_RULES[0],
        name: 'Minimum age',
      })
    );
    expect(nameProblemOf('minimum age', US1_RULES[1], main, [main, renamed], 'de')).toEqual({
      code: 'nameTaken',
      message: 'In Ambulance gibt es bereits eine Regel namens „Minimum age“.',
    });
  });

  const others = ['Standard', ' Ambulance '];

  it.each([
    [
      'no name',
      '  ',
      'variantNameMissing',
      'Enter a name for the variant.',
      'Geben Sie einen Namen für die Variante ein.',
    ],
    [
      'a long name',
      'v'.repeat(101),
      'branchNameTooLong',
      'A variant’s name can have at most 100 characters.',
      'Der Name einer Variante darf höchstens 100 Zeichen lang sein.',
    ],
    [
      'another variant’s name',
      ' ambulance',
      'variantNameTaken',
      'There’s already a variant called "Ambulance".',
      'Es gibt bereits eine Variante namens „Ambulance“.',
    ],
  ])(
    'refuses a variant %s by its code, in both languages',
    (_name, name, code, english, german) => {
      expect(variantNameProblemOf(name, others)).toEqual({ code, message: english });
      expect(variantNameProblem(name, others, 'de')).toBe(german);
      expect(variantNameProblemOf(name, others, 'de')).toEqual({ code, message: german });
    }
  );

  it('accepts a free variant name in German', () => {
    expect(variantNameProblemOf('Schulweg', others, 'de')).toBeNull();
  });
});

/**
 * A case's arguments, by parameter name, in the TS function's parameter order (the JSON's type
 * gives every case every name of the file, those it lacks as undefined)
 */
type ParityParams = Record<string, string | undefined>;

/** A parity case of `fixtures/server-messages.json` (its `about`) */
interface ParityCase {
  key: string;
  table: string;
  params: ParityParams;
  /** Where present, the German case's arguments */
  params_de?: ParityParams;
  en: string;
  de: string;
}

interface ServerMessages {
  condition_problem_prefix: { params: { rule: string; branch: string }; en: string; de: string };
  cases: ParityCase[];
  client_only: { key: string; table: string; reason: string }[];
}

const SERVER_MESSAGES: ServerMessages = serverMessages;

// The tables the server's messages are mirrored in, by the names the fixture gives them
const MIRRORED: Record<string, Record<Language, Record<string, unknown>>> = {
  RULES_MESSAGES,
  CONDITION_PROBLEM_MESSAGES,
  EDIT_MESSAGES,
};

/** A table's entry rendered with a case's arguments: `fn(...Object.values(params))`. */
function rendered(entry: unknown, params: ParityParams): unknown {
  return typeof entry === 'function'
    ? (entry as (...args: unknown[]) => string)(...Object.values(params))
    : entry;
}

describe('the server’s messages, word for word in both languages (spec 009, R8)', () => {
  it.each(SERVER_MESSAGES.cases.map((parity) => [`${parity.table}.${parity.key}`, parity]))(
    '%s',
    (_name, parity) => {
      const table = MIRRORED[parity.table];
      expect(rendered(table.en[parity.key], parity.params)).toBe(parity.en);
      expect(rendered(table.de[parity.key], parity.params_de ?? parity.params)).toBe(parity.de);
    }
  );

  it('mirrors every message the server has; only the client’s own are left out', () => {
    const keysOf = (name: string) =>
      new Set(SERVER_MESSAGES.cases.filter(({ table }) => table === name).map(({ key }) => key));
    const clientOnly = SERVER_MESSAGES.client_only.map(({ key }) => key);
    expect(SERVER_MESSAGES.client_only.every(({ table }) => table === 'RULES_MESSAGES')).toBe(true);
    expect(new Set([...keysOf('RULES_MESSAGES'), ...clientOnly])).toEqual(
      new Set(Object.keys(RULES_MESSAGES.en))
    );
    expect([...keysOf('RULES_MESSAGES')].filter((key) => clientOnly.includes(key))).toEqual([]);
    expect(keysOf('CONDITION_PROBLEM_MESSAGES')).toEqual(
      new Set(Object.keys(CONDITION_PROBLEM_MESSAGES.en))
    );
    expect(keysOf('EDIT_MESSAGES')).toEqual(new Set(['unknownVariant']));
  });

  it('puts an incomplete condition’s message after the server’s prefix, in both languages', () => {
    const { params, en, de } = SERVER_MESSAGES.condition_problem_prefix;
    const incomplete = ageRule({ name: params.rule, condition: null });
    expect(ruleProblem(incomplete, params.branch, CONTEXT)).toBe(
      `${en}${CONDITION_PROBLEM_MESSAGES.en.choose_check}`
    );
    expect(ruleProblem(incomplete, params.branch, GERMAN)).toBe(
      `${de}${CONDITION_PROBLEM_MESSAGES.de.choose_check}`
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
      code: 'noMessage',
      message: 'Rule 01 in Standard has no error message.',
      branchIndex: 0,
      itemId: 'rule-1',
    });
  });

  it('checks a changed or added rule in its branch', () => {
    const changed = must(changeItem(main, based(), { ...US1_RULES[0], message: ' ' }));
    expect(firstProblem([main, changed], CONTEXT)).toEqual({
      code: 'noMessage',
      message: 'Rule 01 in Ambulance has no error message.',
      branchIndex: 1,
      itemId: 'rule-1',
    });
    const added = must(addRuleToBranch(based(), rule(9, null, null)));
    expect(firstProblem([main, added], CONTEXT)?.message).toBe(
      'Rule 09 in Ambulance: choose the data to check.'
    );
    expect(firstProblem([main, added], CONTEXT)?.code).toBe('chooseData');
  });

  it('checks removed items like the others, in the main branch they mirror', () => {
    const broken = mainBranch([{ ...US1_RULES[0], message: '' }, US1_RULES[1]]);
    const removed = must(
      removeItem(broken, newBranch(broken, 'based', 'Ambulance', null), 'rule-1')
    );
    expect(firstProblem([broken, removed], CONTEXT)?.branchIndex).toBe(0);
    expect(firstProblem([broken, removed], CONTEXT)?.code).toBe('noMessage');
  });

  it('takes the names an undo gives back in a based branch (FR-005)', () => {
    const renamed = must(changeItem(main, based(), { ...US1_RULES[0], name: 'Minimum age' }));
    const added = must(
      addRuleToBranch(renamed, { ...US1_RULES[0], id: 'rule-9', name: 'rule 01' })
    );
    expect(firstProblem([main, added], CONTEXT)).toEqual({
      code: 'nameTaken',
      message: 'There’s already a rule called "Rule 01" in Ambulance.',
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
      'There’s already a rule called "Rule 02" in Ambulance.'
    );
    expect(firstProblem([main, added], CONTEXT)?.code).toBe('nameTaken');
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
      'There’s already a rule called "Rule 01" in Ambulance.'
    );
    expect(nameProblem('Rule 01', ambulance.items[0], ambulance, branches)).toBeNull();
  });

  it('refuses a rename in the main branch that clashes in a based branch, naming it', () => {
    expect(nameProblem('minimum age', US1_RULES[1], main, branches)).toBe(
      'There’s already a rule called "Minimum age" in Ambulance.'
    );
    expect(nameProblem('Extra', US1_RULES[0], main, branches)).toBe(
      'There’s already a rule called "Extra" in Ambulance.'
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
      'There’s already a variant called "Ambulance".'
    );
    expect(variantNameProblem('STANDARD', others)).toBe(
      'There’s already a variant called "Standard".'
    );
    expect(variantNameProblem('School transport', others)).toBeNull();
  });
});

describe('publishProblems (spec 011, R10)', () => {
  const ambulance = (items: RuleTreeItem[]) => branch('Ambulance', items);
  const where = ({ code, branchIndex, itemId }: RulesProblem) => [code, branchIndex, itemId];

  it('finds nothing in a clean connection, in either language', () => {
    for (const context of [CONTEXT, GERMAN]) {
      expect(publishProblems([mainBranch()], context)).toEqual([]);
      expect(publishProblems([mainBranch([])], context)).toEqual([]);
      expect(publishProblems([mainBranch(), ambulance(US1_RULES)], context)).toEqual([]);
    }
  });

  it('lists two incomplete rules in two variants, in display order', () => {
    const branches = [
      mainBranch([US1_RULES[0], { ...US1_RULES[1], target: null }, US1_RULES[2]]),
      ambulance([US1_RULES[0], US1_RULES[1], { ...US1_RULES[2], message: ' ' }]),
    ];
    expect(publishProblems(branches, CONTEXT)).toEqual([
      {
        code: 'chooseData',
        message: 'Rule 02 in Standard: choose the data to check.',
        branchIndex: 0,
        itemId: 'rule-2',
      },
      {
        code: 'noMessage',
        message: 'Rule 03 in Ambulance has no error message.',
        branchIndex: 1,
        itemId: 'rule-3',
      },
    ]);
    expect(publishProblems(branches, GERMAN).map(({ message }) => message)).toEqual([
      'Rule 02 in Standard: Wählen Sie die zu prüfenden Daten aus.',
      'Rule 03 in Ambulance hat keine Fehlermeldung.',
    ]);
  });

  it('gives a rule without a name and without a check one problem, its name', () => {
    const nameless = ageRule({ name: '  ', condition: null });
    expect(publishProblems([mainBranch([nameless, US1_RULES[1]])], CONTEXT)).toEqual([
      {
        code: 'itemNameMissing',
        message: 'Enter a name for every rule in Standard.',
        branchIndex: 0,
        itemId: 'rule-1',
      },
    ]);
  });

  it('lists a group’s problem before its members’', () => {
    const items = [group(1, [{ ...US1_RULES[0], target: null }]), US1_RULES[1]];
    expect(publishProblems([mainBranch(items)], CONTEXT).map(where)).toEqual([
      ['tooFewMembers', 0, 'group-1'],
      ['chooseData', 0, 'rule-1'],
    ]);
  });

  it('counts a name as taken whether or not its item had another problem', () => {
    const items = [
      ageRule({ name: 'Old enough', message: '' }),
      { ...US1_RULES[1], name: 'old enough' },
      { ...US1_RULES[2], name: 'OLD ENOUGH ' },
    ];
    expect(publishProblems([mainBranch(items)], CONTEXT)).toEqual([
      {
        code: 'noMessage',
        message: 'Old enough in Standard has no error message.',
        branchIndex: 0,
        itemId: 'rule-1',
      },
      {
        code: 'nameTaken',
        message: 'There’s already a rule called "Old enough" in Standard.',
        branchIndex: 0,
        itemId: 'rule-2',
      },
      // The name stays its first owner's
      {
        code: 'nameTaken',
        message: 'There’s already a rule called "Old enough" in Standard.',
        branchIndex: 0,
        itemId: 'rule-3',
      },
    ]);
  });

  it('lists a variant’s own problem, then its items’', () => {
    const branches = [
      mainBranch(),
      branch('  ', [{ ...US1_RULES[0], target: null }]),
      ambulance([]),
      branch(' AMBULANCE ', [{ ...US1_RULES[1], message: '' }]),
    ];
    expect(publishProblems(branches, CONTEXT).map(where)).toEqual([
      ['branchNameMissing', 1, null],
      ['chooseData', 1, 'rule-1'],
      ['branchNameTwice', 3, null],
      ['noMessage', 3, 'rule-2'],
    ]);
  });

  it('checks what a based variant inherits once, in the main variant', () => {
    const broken = mainBranch([{ ...US1_RULES[0], message: '' }, US1_RULES[1]]);
    const based = newBranch(broken, 'based', 'Ambulance', null);
    const added = must(addRuleToBranch(based, rule(9, null, null)));
    expect(publishProblems([broken, added], CONTEXT).map(where)).toEqual([
      ['noMessage', 0, 'rule-1'],
      ['chooseData', 1, 'rule-9'],
    ]);
  });

  it.each([
    [
      'too many variants',
      [mainBranch(), ...Array.from({ length: 20 }, () => ambulance([]))],
      ['tooManyBranches'],
    ],
    ['no main variant', [ambulance([{ ...US1_RULES[0], target: null }])], ['mainBranch']],
    [
      'too many variants and no main variant',
      Array.from({ length: 21 }, () => ambulance([{ ...US1_RULES[0], target: null }])),
      ['tooManyBranches', 'mainBranch'],
    ],
  ] as [string, BranchInput[], RulesProblemCode[]][])(
    'ends the list after %s, as nothing below can be judged',
    (_name, branches, codes) => {
      const problems = publishProblems(branches, CONTEXT);
      expect(problems.map(({ code }) => code)).toEqual(codes);
      expect(problems.every(({ branchIndex, itemId }) => branchIndex === null && !itemId)).toBe(
        true
      );
    }
  );

  it('keeps the server’s messages word for word, in both languages', () => {
    const items = [
      group(1, [rule(1, null, null)]),
      ageRule({ id: 'rule-2', name: ' ', condition: null }),
      ageRule({ id: 'rule-3', name: 'Lives in Stuttgart' }),
      ageRule({ id: 'rule-4', name: 'Lives in Stuttgart', message: '' }),
    ];
    const expected: [RulesProblemCode, ParityParams][] = [
      ['tooFewMembers', { group: 'Group 01', branch: 'Standard' }],
      ['chooseData', { rule: 'Rule 01', branch: 'Standard' }],
      ['itemNameMissing', { noun: 'rule', branch: 'Standard' }],
      ['nameTaken', { noun: 'rule', branch: 'Standard', name: 'Lives in Stuttgart' }],
    ];
    const cases = expected.map(([key, params]) =>
      must(
        SERVER_MESSAGES.cases.find(
          (parity) =>
            parity.key === key &&
            Object.keys(parity.params).length === Object.keys(params).length &&
            Object.entries(params).every(([name, value]) => parity.params[name] === value)
        ) ?? null
      )
    );
    for (const language of ['en', 'de'] as const) {
      const context = language === 'en' ? CONTEXT : GERMAN;
      const problems = publishProblems([mainBranch(items)], context);
      expect(problems.map(({ code }) => code)).toEqual(expected.map(([code]) => code));
      expect(problems.map(({ message }) => message)).toEqual(
        cases.map((parity) => parity[language])
      );
    }
  });
});
