import type {
  BranchInput,
  Combinator,
  GroupItem,
  RuleTreeItem,
} from '@connection-portal/api-types/form-connections';
import { describe, expect, it } from 'vitest';

import { parseDayNumber } from '../checks/calendar';
import type { KeyedBranch } from '../checks/checkedTree';
import { evaluateBranch } from '../evaluation';
import { statementOf, statementPartsOf } from '../statements';
import { CONTEXT, CONTEXT_DE, mainBranch, rule, target } from '../testData';
import type { RuleContext } from '../types';
import { applicantOf } from './applicant';
import { GROUP_SUBTITLES } from './constants';
import * as fieldsModule from './fields';
import { checkedBranchesOf, personaFieldsOf, resultViewOf, testResultsOf } from './results';
import type { Persona, PersonaBranchResult, PersonaField, PersonaValue, ResultRow } from './types';

const TODAY = '2026-11-01';
const SHARED_ON = parseDayNumber(TODAY) as number;

const AGE = rule(1, target('pid', 'birthdate'), { operator: 'at_least_years_ago', years: 21 });
const CITY = rule(2, target('pid', 'address_locality'), {
  operator: 'equal_to',
  value: 'Stuttgart',
});
const CLASS_B = rule(3, target('mdl', 'driving_privileges', 'classes'), {
  operator: 'includes_one_of',
  values: ['B'],
});
const HELD_B = rule(4, target('mdl', 'driving_privileges', 'issue_date', 'B'), {
  operator: 'at_least_years_ago',
  years: 2,
});
const FAMILY = rule(5, target('pid', 'family_name'), { operator: 'equal_to', value: 'Muster' });
const NATIONALITY = rule(6, target('pid', 'nationalities'), {
  operator: 'includes_one_of',
  values: ['DE'],
});

/** Every value meets every rule above */
const VALUES: Record<string, PersonaValue> = {
  'pid.birthdate': '1990-05-17',
  'pid.address_locality': 'Stuttgart',
  'mdl.driving_privileges.classes': ['B'],
  'mdl.driving_privileges.issue_date#B': '2015-03-01',
  'pid.family_name': 'Muster',
  'pid.nationalities': ['DE'],
};

function group(
  number: number,
  operator: Combinator,
  items: RuleTreeItem[],
  message: string | null = null,
  name = `Group ${String(number).padStart(2, '0')}`
): GroupItem {
  return { type: 'group', id: `group-${number}`, name, mark: null, operator, message, items };
}

function keyed(branch: BranchInput, key: string): BranchInput & KeyedBranch {
  return { ...branch, key };
}

function persona(
  changes: Record<string, PersonaValue> = {},
  id: Persona['id'] = 'persona-1',
  status: Persona['status'] = 'ready'
): Persona {
  return {
    id,
    name: 'Mia Schulz',
    values: { ...VALUES, ...changes },
    generated: { ...VALUES },
    status,
  };
}

/**
 * The evaluation of `items` (an AND branch unless said otherwise) and its view for `subject`, in
 * `context` (English unless said otherwise)
 */
function viewOf(
  items: RuleTreeItem[],
  subject: Persona = persona(),
  operator: Combinator = 'and',
  context: RuleContext = CONTEXT
): { result: PersonaBranchResult; view: ReturnType<typeof resultViewOf> } {
  const branch = keyed({ ...mainBranch(items), operator }, 'branch-1');
  const fields = personaFieldsOf([branch], context);
  const result = testResultsOf([subject], fields, [branch], context, TODAY)[subject.id]?.[
    branch.key
  ] as PersonaBranchResult;
  return { result, view: resultViewOf(result, branch, subject, context, fields) };
}

/** A row's outline: id, status, message, reported, and its members' outlines */
type Outline = [string, ResultRow['status'], string | null, boolean, Outline[]];

function outline(rows: ResultRow[]): Outline[] {
  return rows.map((row) => [
    row.itemId,
    row.status,
    row.message,
    row.reported,
    outline(row.members),
  ]);
}

describe('testResultsOf', () => {
  const standard = keyed(mainBranch([AGE, CITY, CLASS_B, HELD_B]), 'branch-1');
  const noRules = keyed({ ...mainBranch([]), name: 'School transport' }, 'branch-2');
  const branches = [standard, noRules];
  const fields = personaFieldsOf(branches, CONTEXT);
  const mia = persona({ 'pid.address_locality': 'Berlin' }, 'persona-1');
  const anna = persona({ 'pid.birthdate': '' }, 'persona-2');
  const generating = persona({}, 'persona-3', 'generating');

  it('evaluates every ready persona against every branch, exactly as the evaluator does', () => {
    const results = testResultsOf([mia, anna, generating], fields, branches, CONTEXT, TODAY);
    expect(Object.keys(results)).toEqual(['persona-1', 'persona-2']);
    for (const subject of [mia, anna]) {
      expect(Object.keys(results[subject.id] ?? {})).toEqual(['branch-1', 'branch-2']);
      for (const branch of branches) {
        expect(results[subject.id]?.[branch.key]).toEqual(
          evaluateBranch(branch, applicantOf(subject, fields), SHARED_ON, CONTEXT)
        );
      }
    }
    expect(results['persona-1']?.['branch-1']?.messages).toEqual([
      { id: 'rule-2', message: 'You must meet this rule.' },
    ]);
    expect(results['persona-2']?.['branch-1']?.items[0].outcome).toBe('not_checked');
  });

  it('gives a branch without rules as met, with nothing to report', () => {
    const results = testResultsOf([mia], fields, branches, CONTEXT, TODAY);
    expect(results['persona-1']?.['branch-2']).toEqual({ met: true, items: [], messages: [] });
  });

  it('gives no results without ready personas', () => {
    expect(testResultsOf([], fields, branches, CONTEXT, TODAY)).toEqual({});
    expect(testResultsOf([generating], fields, branches, CONTEXT, TODAY)).toEqual({});
  });

  it('leaves out a branch the evaluator refuses, and keeps the others', () => {
    const incomplete = rule(9, target('pid', 'address_locality'), { operator: 'equal_to' });
    const broken = keyed(mainBranch([AGE, incomplete]), 'branch-3');
    const results = testResultsOf([mia], fields, [standard, broken], CONTEXT, TODAY);
    expect(Object.keys(results['persona-1'] ?? {})).toEqual(['branch-1']);
  });

  it('throws for a day that is not a date', () => {
    expect(() => testResultsOf([mia], fields, branches, CONTEXT, '01.11.2026')).toThrow(RangeError);
  });

  it('re-exports the fields and checked branches of fields.ts', () => {
    expect(personaFieldsOf).toBe(fieldsModule.personaFieldsOf);
    expect(checkedBranchesOf).toBe(fieldsModule.checkedBranchesOf);
  });
});

describe('resultViewOf', () => {
  it('lists the reported rules first, then the other top-level items (U07)', () => {
    const { view } = viewOf(
      [AGE, CITY, CLASS_B, HELD_B],
      persona({
        'pid.birthdate': '2010-01-01',
        'pid.address_locality': 'Berlin',
      })
    );
    expect(view.meets).toBe(false);
    expect(view.heading).toBe('Result: doesn’t meet 2 rules');
    expect(outline(view.rows)).toEqual([
      ['rule-1', 'not_met', 'You must meet this rule.', true, []],
      ['rule-2', 'not_met', 'You must meet this rule.', true, []],
      ['rule-3', 'met', 'You must meet this rule.', false, []],
      ['rule-4', 'met', 'You must meet this rule.', false, []],
    ]);
    // No list heading and no message column (test-results-v5 R2, R3)
    expect(Object.keys(view)).toEqual(['meets', 'heading', 'rows', 'failingFields']);
  });

  it('follows the order of the messages, depth first', () => {
    // An OR group without a message is reported through its members, before Rule 01
    const { view } = viewOf(
      [group(1, 'or', [CITY, FAMILY]), AGE],
      persona({
        'pid.address_locality': 'Berlin',
        'pid.family_name': 'Schulz',
        'pid.birthdate': '2010-01-01',
      })
    );
    expect(outline(view.rows).map(([id, , , reported]) => [id, reported])).toEqual([
      ['rule-2', true],
      ['rule-5', true],
      ['rule-1', true],
      ['group-1', false],
    ]);
  });

  it('words each rule as the rules step does, with its parts for RuleSentence', () => {
    const { view } = viewOf([AGE, CLASS_B]);
    expect(view.rows.map((row) => [row.name, row.type, row.statement])).toEqual([
      ['Rule 01', 'rule', statementOf(AGE, CONTEXT)?.text],
      ['Rule 03', 'rule', statementOf(CLASS_B, CONTEXT)?.text],
    ]);
    expect(view.rows[0].statement).toBe(
      'Personal ID · Date of birth (Age) is at least 21 years old'
    );
    expect(view.rows[0].parts).toEqual(statementPartsOf(AGE, CONTEXT));
  });

  it('shows a rule on an empty value as not checked, reported with its message', () => {
    const { view } = viewOf([AGE, CITY], persona({ 'pid.address_locality': null }));
    expect(view.heading).toBe('Result: doesn’t meet 1 rule');
    expect(outline(view.rows)).toEqual([
      ['rule-2', 'not_checked', 'You must meet this rule.', true, []],
      ['rule-1', 'met', 'You must meet this rule.', false, []],
    ]);
  });

  // V4 (spec 008 research R15; FR-024): "Result: doesn’t meet <n> rules" counts rules only: each
  // reported rule, and inside a reported group the rules listed under it (its members that aren't
  // met, through its sub-groups that aren't met); a group never counts itself. U65 (7057:58811,
  // "doesn’t meet 2 rules") and U66 (#19 "doesn’t meet 3 rules", #25) draw only top-level rules,
  // so this is the literal reading of the heading for groups
  it('lists a reported group with its members that are not met, recursively', () => {
    const subGroup = group(2, 'or', [FAMILY, NATIONALITY], null, 'Sub-group 01');
    const groupWithMessage = group(1, 'and', [CLASS_B, HELD_B, subGroup], 'You need a licence.');
    const { view } = viewOf(
      [AGE, groupWithMessage],
      persona({
        'mdl.driving_privileges.issue_date#B': '2026-01-01',
        'pid.family_name': 'Schulz',
        'pid.nationalities': [],
      })
    );
    // V4: Rule 04, and Rules 05 and 06 of the sub-group; not the groups themselves
    expect(view.heading).toBe('Result: doesn’t meet 3 rules');
    expect(outline(view.rows)).toEqual([
      [
        'group-1',
        'not_met',
        'You need a licence.',
        true,
        [
          ['rule-4', 'not_met', 'You must meet this rule.', false, []],
          [
            'group-2',
            'not_met',
            null,
            false,
            [
              ['rule-5', 'not_met', 'You must meet this rule.', false, []],
              ['rule-6', 'not_checked', 'You must meet this rule.', false, []],
            ],
          ],
        ],
      ],
      ['rule-1', 'met', 'You must meet this rule.', false, []],
    ]);
    const [groupRow] = view.rows;
    expect([groupRow.type, groupRow.name, groupRow.statement, groupRow.parts]).toEqual([
      'group',
      'Group 01',
      GROUP_SUBTITLES.en.and,
      null,
    ]);
    expect([groupRow.members[1].name, groupRow.members[1].statement]).toEqual([
      'Sub-group 01',
      'At least one of these must be met',
    ]);
  });

  it('lists a group without a message among the other items, with its outcome and no members', () => {
    const { view } = viewOf(
      [AGE, group(1, 'or', [CITY, FAMILY])],
      persona({ 'pid.address_locality': 'Berlin', 'pid.family_name': 'Schulz' })
    );
    expect(view.heading).toBe('Result: doesn’t meet 2 rules');
    expect(outline(view.rows)).toEqual([
      ['rule-2', 'not_met', 'You must meet this rule.', true, []],
      ['rule-5', 'not_met', 'You must meet this rule.', true, []],
      ['rule-1', 'met', 'You must meet this rule.', false, []],
      ['group-1', 'not_met', null, false, []],
    ]);
  });

  it('counts the rules listed under a reported sub-group, not the sub-group (V4)', () => {
    const subGroup = group(2, 'and', [FAMILY, NATIONALITY], 'Check your ID.', 'Sub-group 01');
    const { view } = viewOf(
      [group(1, 'and', [subGroup, CITY]), AGE],
      persona({ 'pid.family_name': 'Schulz', 'pid.address_locality': 'Berlin' })
    );
    // Rule 05 under Sub-group 01, and Rule 02
    expect(view.heading).toBe('Result: doesn’t meet 2 rules');
    expect(outline(view.rows)).toEqual([
      [
        'group-2',
        'not_met',
        'Check your ID.',
        true,
        [['rule-5', 'not_met', 'You must meet this rule.', false, []]],
      ],
      ['rule-2', 'not_met', 'You must meet this rule.', true, []],
      ['group-1', 'not_met', null, false, []],
      ['rule-1', 'met', 'You must meet this rule.', false, []],
    ]);
  });

  it('counts the rules not met inside reported groups only, not their met rules (V4)', () => {
    const { view } = viewOf(
      [group(1, 'and', [AGE, CITY], 'First.'), group(2, 'and', [FAMILY, CLASS_B], 'Second.')],
      persona({ 'pid.address_locality': 'Berlin', 'pid.family_name': 'Schulz' })
    );
    // Rule 02 in Group 01 and Rule 05 in Group 02; Rules 01 and 03 are met
    expect(view.heading).toBe('Result: doesn’t meet 2 rules');
  });

  it('counts every member of a reported OR group, and none inside a met sub-group (V4)', () => {
    const metSubGroup = group(3, 'or', [HELD_B, NATIONALITY], null, 'Sub-group 02');
    const { view } = viewOf(
      [group(1, 'or', [CITY, FAMILY, metSubGroup], 'Either.'), CLASS_B],
      persona({ 'pid.address_locality': 'Berlin', 'pid.family_name': 'Schulz' })
    );
    // The OR group is met through Sub-group 02, so nothing is reported
    expect(view.heading).toBe('Result: meets the rules');
    const { view: unmet } = viewOf(
      [group(1, 'or', [CITY, FAMILY], 'Either.'), group(2, 'and', [AGE, metSubGroup], 'Both.')],
      persona({
        'pid.address_locality': 'Berlin',
        'pid.family_name': 'Schulz',
        'pid.birthdate': '2010-01-01',
      })
    );
    // Rules 02 and 05 of the OR group; Rule 01 of Group 02, whose met Sub-group 02 isn't listed
    expect(outline(unmet.rows)[1]).toEqual([
      'group-2',
      'not_met',
      'Both.',
      true,
      [['rule-1', 'not_met', 'You must meet this rule.', false, []]],
    ]);
    expect(unmet.heading).toBe('Result: doesn’t meet 3 rules');
  });

  it('lists every top-level item under a met variant, each with its message (R3, V5 frame 2)', () => {
    const { view } = viewOf([AGE, group(1, 'or', [CITY, FAMILY], 'Live here.')]);
    expect(view.meets).toBe(true);
    expect(view.heading).toBe('Result: meets the rules');
    expect(outline(view.rows)).toEqual([
      ['rule-1', 'met', 'You must meet this rule.', false, []],
      ['group-1', 'met', 'Live here.', false, []],
    ]);
    expect(view.failingFields).toEqual([]);
  });

  it('shows the outcome of each item under a met OR variant', () => {
    const { view } = viewOf([AGE, CITY], persona({ 'pid.address_locality': 'Berlin' }), 'or');
    expect(view.heading).toBe('Result: meets the rules');
    expect(outline(view.rows)).toEqual([
      ['rule-1', 'met', 'You must meet this rule.', false, []],
      ['rule-2', 'not_met', 'You must meet this rule.', false, []],
    ]);
    expect(view.failingFields).toEqual(['pid.address_locality']);
  });

  it('shows a variant without rules as met, without rows', () => {
    const { view } = viewOf([]);
    expect(view).toEqual({
      meets: true,
      heading: 'Result: meets the rules',
      rows: [],
      failingFields: [],
    });
  });

  it('takes the current names and operators from the branch', () => {
    const items = [AGE, group(1, 'or', [CITY, FAMILY], 'Live here.')];
    const { result } = viewOf(items, persona({ 'pid.birthdate': '2010-01-01' }));
    const renamed = [
      { ...AGE, name: 'Old enough' },
      { ...group(1, 'and', [CITY, FAMILY], 'Live here.'), name: 'Home' },
    ];
    const fields = personaFieldsOf([keyed(mainBranch(items), 'branch-1')], CONTEXT);
    const view = resultViewOf(result, { items: renamed }, persona(), CONTEXT, fields);
    expect(view.rows.map((row) => [row.name, row.statement])).toEqual([
      ['Old enough', statementOf(AGE, CONTEXT)?.text],
      ['Home', GROUP_SUBTITLES.en.and],
    ]);
  });

  // test-results-v5 R3: "Message for citizens:" under every row, as the rules step shows it
  it('takes the current messages from the branch, so an edited message shows at once', () => {
    const items = [AGE, group(1, 'or', [CITY, FAMILY], 'Live here.')];
    const { result } = viewOf(items, persona({ 'pid.birthdate': '2010-01-01' }));
    const edited = [
      { ...AGE, message: '  You need to be 21.  ' },
      group(1, 'or', [CITY, FAMILY], null),
    ];
    const fields = personaFieldsOf([keyed(mainBranch(items), 'branch-1')], CONTEXT);
    const view = resultViewOf(result, { items: edited }, persona(), CONTEXT, fields);
    // Trimmed as the rules step shows it; a group without a message has none
    expect(view.rows.map((row) => [row.itemId, row.message, row.reported])).toEqual([
      ['rule-1', 'You need to be 21.', true],
      ['group-1', null, false],
    ]);
    // The evaluation still reports what it reported
    expect(result.messages).toEqual([{ id: 'rule-1', message: 'You must meet this rule.' }]);
  });

  it('names the group whose message citizens read on the members listed under it', () => {
    const subGroup = group(2, 'or', [FAMILY, NATIONALITY], 'Check your ID.', 'Sub-group 01');
    const { view } = viewOf(
      [AGE, group(1, 'and', [CLASS_B, HELD_B, subGroup], 'You need a licence.', ' Licence ')],
      persona({
        'mdl.driving_privileges.issue_date#B': '2026-01-01',
        'pid.family_name': 'Schulz',
        'pid.nationalities': [],
      })
    );
    const [groupRow, ageRow] = view.rows;
    const groups = (rows: readonly ResultRow[]): [string, string | null, string | null][] =>
      rows.flatMap((row) => [
        [row.itemId, row.message, row.messageGroup] as [string, string | null, string | null],
        ...groups(row.members),
      ]);
    // The outermost group with a message, trimmed: the sub-group's own message is kept as data
    expect(groups([groupRow])).toEqual([
      ['group-1', 'You need a licence.', null],
      ['rule-4', 'You must meet this rule.', 'Licence'],
      ['group-2', 'Check your ID.', 'Licence'],
      ['rule-5', 'You must meet this rule.', 'Licence'],
      ['rule-6', 'You must meet this rule.', 'Licence'],
    ]);
    expect([ageRow.messageGroup, ageRow.reported]).toEqual([null, false]);
  });

  it('names no group on the rules a group without a message reports in its place', () => {
    const subGroup = group(2, 'and', [FAMILY, NATIONALITY], 'Check your ID.', 'Sub-group 01');
    const { view } = viewOf(
      [group(1, 'and', [subGroup, CITY]), AGE],
      persona({ 'pid.family_name': 'Schulz', 'pid.address_locality': 'Berlin' })
    );
    expect(
      view.rows.map((row) => [row.itemId, row.messageGroup, row.members.map((m) => m.messageGroup)])
    ).toEqual([
      ['group-2', null, ['Sub-group 01']],
      ['rule-2', null, []],
      ['group-1', null, []],
      ['rule-1', null, []],
    ]);
  });

  describe('failingFields (K1)', () => {
    it('marks the fields of the failing rules, in the order of the fields', () => {
      const { view } = viewOf(
        [CLASS_B, CITY, AGE],
        persona({ 'pid.birthdate': '2010-01-01', 'mdl.driving_privileges.classes': ['A'] })
      );
      expect(view.failingFields).toEqual(['pid.birthdate', 'mdl.driving_privileges.classes']);
    });

    it('marks nothing for a failing rule inside a met group', () => {
      const { view } = viewOf(
        [AGE, group(1, 'or', [CITY, FAMILY])],
        persona({ 'pid.birthdate': '2010-01-01', 'pid.address_locality': 'Berlin' })
      );
      expect(view.failingFields).toEqual(['pid.birthdate']);
    });

    it('marks the members of a group that is not met, recursively', () => {
      const subGroup = group(2, 'or', [FAMILY, NATIONALITY], null, 'Sub-group 01');
      const { view } = viewOf(
        [group(1, 'and', [CITY, subGroup], 'Message.')],
        persona({
          'pid.address_locality': 'Berlin',
          'pid.family_name': 'Schulz',
          'pid.nationalities': ['AT'],
        })
      );
      expect(view.failingFields).toEqual([
        'pid.family_name',
        'pid.nationalities',
        'pid.address_locality',
      ]);
    });

    it('marks a class date that fails, and the classes for a class not held', () => {
      const late = viewOf(
        [CLASS_B, HELD_B],
        persona({ 'mdl.driving_privileges.issue_date#B': '2026-01-01' })
      );
      expect(late.view.failingFields).toEqual(['mdl.driving_privileges.issue_date#B']);
      // Class B not held: HELD_B isn't met and its date is hidden, so the classes are marked
      const notHeld = viewOf([HELD_B, AGE], persona({ 'mdl.driving_privileges.classes': ['A'] }));
      expect(notHeld.result.items[0].outcome).toBe('not_met');
      expect(notHeld.view.failingFields).toEqual(['mdl.driving_privileges.classes']);
    });

    it('marks only fields of the given list', () => {
      const { result, view } = viewOf([AGE, CITY], persona({ 'pid.address_locality': 'Berlin' }));
      expect(view.failingFields).toEqual(['pid.address_locality']);
      const fields: PersonaField[] = personaFieldsOf(
        [keyed(mainBranch([AGE]), 'branch-1')],
        CONTEXT
      );
      const narrowed = resultViewOf(result, mainBranch([AGE, CITY]), persona(), CONTEXT, fields);
      expect(narrowed.failingFields).toEqual([]);
    });
  });
});

// Spec 009 (R4, FR-006, FR-016): the same results, worded in the context's language
describe('resultViewOf in German (spec 009)', () => {
  const failing = persona({ 'pid.birthdate': '2010-01-01', 'pid.address_locality': 'Berlin' });

  it('words the headings and statements in German (glossary §3 "Result", §2 "message")', () => {
    const { view } = viewOf([AGE, CITY, CLASS_B, HELD_B], failing, 'and', CONTEXT_DE);
    expect(view.heading).toBe('Ergebnis: erfüllt 2 Regeln nicht');
    expect(view.rows[0].statement).toBe(
      'Personalausweis · Geburtsdatum (Alter) ist mindestens 21 Jahre alt'
    );
    expect(view.rows[0].parts).toEqual(statementPartsOf(AGE, CONTEXT_DE));
  });

  it('gives the same rows, outcomes, messages and failing fields as in English (FR-016)', () => {
    for (const items of [
      [AGE, CITY, CLASS_B, HELD_B],
      [AGE, group(1, 'or', [CITY, FAMILY], 'Live here.')],
      [group(1, 'and', [CLASS_B, HELD_B, group(2, 'or', [FAMILY, NATIONALITY])], 'Licence.')],
    ]) {
      const english = viewOf(items, failing);
      const german = viewOf(items, failing, 'and', CONTEXT_DE);
      expect(german.result).toEqual(english.result);
      expect(outline(german.view.rows)).toEqual(outline(english.view.rows));
      expect(german.view.rows.map((row) => row.name)).toEqual(
        english.view.rows.map((row) => row.name)
      );
      expect(german.view.meets).toBe(english.view.meets);
      expect(german.view.failingFields).toEqual(english.view.failingFields);
    }
  });

  it('counts one rule, and words a met variant', () => {
    const one = viewOf([AGE, CITY], persona({ 'pid.address_locality': null }), 'and', CONTEXT_DE);
    expect(one.view.heading).toBe('Ergebnis: erfüllt 1 Regel nicht');
    const met = viewOf([AGE, group(1, 'or', [CITY, FAMILY])], persona(), 'and', CONTEXT_DE);
    expect(met.view.heading).toBe('Ergebnis: erfüllt alle Regeln');
  });

  it('words the groups by their German subtitles (glossary §3 "group subtitles")', () => {
    const subGroup = group(2, 'or', [FAMILY, NATIONALITY], null, 'Sub-group 01');
    const { view } = viewOf(
      [AGE, group(1, 'and', [CLASS_B, HELD_B, subGroup], 'You need a licence.')],
      persona({
        'mdl.driving_privileges.issue_date#B': '2026-01-01',
        'pid.family_name': 'Schulz',
        'pid.nationalities': [],
      }),
      'and',
      CONTEXT_DE
    );
    const [groupRow] = view.rows;
    expect([groupRow.name, groupRow.statement]).toEqual(['Group 01', 'Alle müssen erfüllt sein']);
    expect(groupRow.statement).toBe(GROUP_SUBTITLES.de.and);
    expect([groupRow.members[1].name, groupRow.members[1].statement]).toEqual([
      'Sub-group 01',
      'Mindestens eine muss erfüllt sein',
    ]);
    expect(groupRow.message).toBe('You need a licence.');
  });
});
