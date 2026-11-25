import type { BranchInput, RuleItem } from '@konnekt/api-types/form-connections';
import { describe, expect, it } from 'vitest';

import { parseDayNumber } from '../checks/calendar';
import type { KeyedBranch } from '../checks/checkedTree';
import { evaluateBranch, type Outcome } from '../evaluation';
import { CONTEXT, mainBranch, rule, target } from '../testData';
import { applicantOf } from './applicant';
import { personaFieldsOf } from './fields';
import type { Persona, PersonaField, PersonaValue } from './types';

const SHARED_ON = parseDayNumber('2026-11-01') as number;

// The spec's example (US1), with the place of birth, both of class B's dates and class C's issue
// date: at least 21, lives in Stuttgart, born in Stuttgart, holds class B, has held it for at
// least 2 years, B valid after 2026, C held for at least 1 year
const AGE = rule(1, target('pid', 'birthdate'), { operator: 'at_least_years_ago', years: 21 });
const CITY = rule(2, target('pid', 'address_locality'), {
  operator: 'equal_to',
  value: 'Stuttgart',
});
const BORN_IN = rule(3, target('pid', 'place_of_birth', 'locality'), {
  operator: 'equal_to',
  value: 'Stuttgart',
});
const CLASS_B = rule(4, target('mdl', 'driving_privileges', 'classes'), {
  operator: 'includes_one_of',
  values: ['B'],
});
const HELD_B = rule(5, target('mdl', 'driving_privileges', 'issue_date', 'B'), {
  operator: 'at_least_years_ago',
  years: 2,
});
const VALID_B = rule(6, target('mdl', 'driving_privileges', 'expiry_date', 'B'), {
  operator: 'after',
  date: '2026-12-31',
});
const HELD_C = rule(7, target('mdl', 'driving_privileges', 'issue_date', 'C'), {
  operator: 'at_least_years_ago',
  years: 1,
});
// Checked only by the branch used for hidden values
const FAMILY = rule(8, target('pid', 'family_name'), { operator: 'equal_to', value: 'Muster' });

const RULES = [AGE, CITY, BORN_IN, CLASS_B, HELD_B, VALID_B, HELD_C];
const STANDARD = mainBranch(RULES);

function keyed(branch: BranchInput, key: string): BranchInput & KeyedBranch {
  return { ...branch, key };
}

const FIELDS = personaFieldsOf([keyed(STANDARD, 'branch-1')], CONTEXT);

const VALUES: Record<string, PersonaValue> = {
  'pid.birthdate': '1990-05-17',
  'pid.address_locality': 'Stuttgart',
  'pid.place_of_birth.locality': 'Stuttgart',
  'mdl.driving_privileges.classes': ['B', 'C'],
  'mdl.driving_privileges.issue_date#B': '2015-03-01',
  'mdl.driving_privileges.expiry_date#B': '2035-03-01',
  'mdl.driving_privileges.issue_date#C': '2020-06-10',
  // Hidden: no rule of STANDARD checks them
  'pid.family_name': 'Muster',
  'mdl.driving_privileges.issue_date#A': '2010-01-01',
};

function persona(changes: Record<string, PersonaValue> = {}): Persona {
  return {
    id: 'persona-1',
    name: 'Mia',
    values: { ...VALUES, ...changes },
    generated: { ...VALUES },
    status: 'ready',
  };
}

function outcomeOf(
  rules: RuleItem[],
  ruleId: string,
  subject: Persona,
  fields: readonly PersonaField[] = FIELDS
): { met: boolean; outcome: Outcome | undefined } {
  const evaluation = evaluateBranch(
    mainBranch(rules),
    applicantOf(subject, fields),
    SHARED_ON,
    CONTEXT
  );
  return {
    met: evaluation.met,
    outcome: evaluation.items.find((each) => each.item.id === ruleId)?.outcome,
  };
}

describe('applicantOf', () => {
  it('delivers each field by document type, the place of birth as one object, one entry per class', () => {
    expect(applicantOf(persona(), FIELDS)).toEqual({
      pid: {
        birthdate: '1990-05-17',
        place_of_birth: { locality: 'Stuttgart' },
        address_locality: 'Stuttgart',
      },
      mdl: {
        driving_privileges: [
          {
            vehicle_category_code: 'B',
            issue_date: '2015-03-01',
            expiry_date: '2035-03-01',
          },
          { vehicle_category_code: 'C', issue_date: '2020-06-10' },
        ],
      },
    });
    const evaluation = evaluateBranch(STANDARD, applicantOf(persona(), FIELDS), SHARED_ON, CONTEXT);
    expect(evaluation.met).toBe(true);
    expect(evaluation.items.map((each) => each.outcome)).toEqual(RULES.map(() => 'met'));
  });

  it('puts every part of the place of birth that is a field into one object', () => {
    const country = rule(9, target('pid', 'place_of_birth', 'country'), {
      operator: 'includes_one_of',
      values: ['DE'],
    });
    const fields = personaFieldsOf([keyed(mainBranch([BORN_IN, country]), 'b')], CONTEXT);
    const subject = persona({ 'pid.place_of_birth.country': 'DE' });
    expect(applicantOf(subject, fields)).toEqual({
      pid: { place_of_birth: { country: 'DE', locality: 'Stuttgart' } },
    });
    expect(outcomeOf([BORN_IN, country], 'rule-9', subject, fields).outcome).toBe('met');
  });

  it('never delivers hidden values', () => {
    const applicant = applicantOf(persona(), FIELDS);
    expect(applicant.pid).not.toHaveProperty('family_name');
    // Checked by a branch whose fields aren't the persona's current ones: missing
    expect(outcomeOf([FAMILY], 'rule-8', persona()).outcome).toBe('not_checked');
    // Once it is a field, the value is delivered
    const fields = personaFieldsOf([keyed(mainBranch([FAMILY]), 'b')], CONTEXT);
    expect(outcomeOf([FAMILY], 'rule-8', persona(), fields).outcome).toBe('met');
  });

  it('never delivers the dates of classes not held', () => {
    const rules = [
      rule(9, target('mdl', 'driving_privileges', 'issue_date', 'A'), {
        operator: 'at_least_years_ago',
        years: 1,
      }),
    ];
    const fields = personaFieldsOf([keyed(mainBranch(rules), 'b')], CONTEXT);
    const subject = persona({ 'mdl.driving_privileges.classes': ['B'] });
    expect(applicantOf(subject, fields)).toEqual({
      mdl: { driving_privileges: [{ vehicle_category_code: 'B' }] },
    });
    expect(outcomeOf(rules, 'rule-9', subject, fields).outcome).toBe('not_met');
  });

  it('leaves out an empty class date, inside the class’s entry', () => {
    const subject = persona({ 'mdl.driving_privileges.expiry_date#B': '' });
    expect(applicantOf(subject, FIELDS).mdl?.driving_privileges).toEqual([
      { vehicle_category_code: 'B', issue_date: '2015-03-01' },
      { vehicle_category_code: 'C', issue_date: '2020-06-10' },
    ]);
    expect(outcomeOf(RULES, 'rule-6', subject)).toEqual({ met: false, outcome: 'not_checked' });
  });

  it('makes a rule on B’s issue date not met when B is removed and C remains (US2-AS4)', () => {
    const subject = persona({ 'mdl.driving_privileges.classes': ['C'] });
    expect(applicantOf(subject, FIELDS).mdl?.driving_privileges).toEqual([
      { vehicle_category_code: 'C', issue_date: '2020-06-10' },
    ]);
    expect(outcomeOf(RULES, 'rule-5', subject)).toEqual({ met: false, outcome: 'not_met' });
    // Added again, the date comes back with its earlier value
    expect(outcomeOf(RULES, 'rule-5', persona()).outcome).toBe('met');
  });

  it('delivers [] for an empty list of classes, which makes the rule not checked (R4)', () => {
    const subject = persona({ 'mdl.driving_privileges.classes': [] });
    expect(applicantOf(subject, FIELDS).mdl).toEqual({ driving_privileges: [] });
    expect(outcomeOf(RULES, 'rule-5', subject)).toEqual({ met: false, outcome: 'not_checked' });
    expect(outcomeOf(RULES, 'rule-4', subject).outcome).toBe('not_checked');
  });

  it.each<PersonaValue>([null, ''])(
    'leaves out an empty value (%j), which makes its rule not checked (US2-AS5)',
    (empty) => {
      const subject = persona({ 'pid.birthdate': empty });
      expect(applicantOf(subject, FIELDS).pid).not.toHaveProperty('birthdate');
      expect(outcomeOf(RULES, 'rule-1', subject)).toEqual({ met: false, outcome: 'not_checked' });
    }
  );

  it('leaves out a document without values, and an empty place of birth', () => {
    const subject = persona({
      'pid.birthdate': null,
      'pid.address_locality': '',
      'pid.place_of_birth.locality': '',
    });
    const fields = FIELDS.filter((field) => field.documentType === 'pid');
    expect(applicantOf(subject, fields)).toEqual({});
    expect(outcomeOf([BORN_IN], 'rule-3', subject, fields).outcome).toBe('not_checked');
  });
});
