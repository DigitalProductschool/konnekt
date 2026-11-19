// The spec's scenarios of the personas (specs/004-rule-test-personas, User Story 1's acceptance
// scenarios and the edge cases that a rule set expresses; quickstart §3 and V1; research R14).
//
// Each case builds its rule set with testData.ts' helpers and branches.ts, and goes the way the
// test step goes: the reducer opens the step and starts a run (`personaStateReducer()`), the run is
// answered as the worker answers it (`generatePersonas()` with the request the hook builds), and the
// results are what the step shows (`testResultsOf()`, `resultViewOf()`). Generation runs on a fake
// clock that never reaches the deadline, so every result depends only on the seed, and "across
// seeds" is a loop over `SEEDS`. Hand-made personas pin the exact rows, outcomes and texts.
import type { DocumentField } from '@connection-portal/api-types/document-types';
import type {
  BranchInput,
  Condition,
  RuleItem,
  RuleTarget,
} from '@connection-portal/api-types/form-connections';
import { describe, expect, it } from 'vitest';

import { addRuleToBranch, changeItem, newBranch, propagateMain, removeItem } from '../branches';
import { dayNumber, parseDayNumber } from '../checks/calendar';
import { buildCheckedBranch, type KeyedBranch } from '../checks/checkedTree';
import { noticeText } from '../checks/findingMessages';
import { checkBranch } from '../checks/findings';
import type { CheckOptions } from '../checks/types';
import { evaluateBranch } from '../evaluation';
import {
  mainBranch,
  MDL,
  MDL_DE,
  OPTION_SETS,
  OPTION_SETS_DE,
  PID,
  PID_DE,
  rule,
  target,
} from '../testData';
import { deleteItem, replaceItem } from '../tree';
import type { RuleContext } from '../types';
import { announcementOf } from './announcements';
import { applicantOf } from './applicant';
import { generatePersonas } from './generation';
import { goalsOf } from './goals';
import { testDayLineOf } from './messages';
import { initialPersonaState, personaStateReducer } from './personaState';
import { checkedBranchesOf, personaFieldsOf, resultViewOf, testResultsOf } from './results';
import type {
  GenerationRequest,
  Persona,
  PersonaBranchResult,
  PersonaField,
  PersonaSlot,
  PersonaState,
  PersonaValue,
  ResultView,
  TestResults,
} from './types';
import { ageOn, shownFieldsOf } from './values';

// The day, the clock and the seeds

/** Today in Germany, as the step names it: "01.11.2026" */
const TODAY = '2026-11-01';

/** A clock that never reaches the deadline: a run depends only on its seed */
const NO_DEADLINE: CheckOptions = { deadline: Number.POSITIVE_INFINITY, now: () => 0 };

/** "Across seeds": every seed of this list */
const SEEDS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233];

/** A budget for the tests that generate for every seed, on a machine other work loads */
const GENERATING = 60_000;

// The context

function numberField(key: string, label: string): DocumentField {
  return {
    key,
    label,
    kind: 'number',
    option_set: null,
    date_of_birth: false,
    parts: null,
    multiple_values: false,
  };
}

/**
 * testData.ts' context with what the edge cases read besides: the driving licence's "Age in years"
 * and "Year of birth", and Italy among the countries
 */
const CONTEXT: RuleContext = {
  documents: [
    PID,
    {
      ...MDL,
      fields: [
        ...MDL.fields,
        numberField('age_in_years', 'Age in years'),
        numberField('age_birth_year', 'Year of birth'),
      ],
    },
  ],
  optionSets: OPTION_SETS.map((set) =>
    set.key === 'countries'
      ? { ...set, options: [...set.options, { value: 'IT', label: 'Italy', description: null }] }
      : set
  ),
};

/**
 * The same context in German (spec 009, R4): testData.ts' German documents and option sets with
 * the same additions, and `language: 'de'`, as the editor builds it when the website is German
 */
const GERMAN: RuleContext = {
  documents: [
    PID_DE,
    {
      ...MDL_DE,
      fields: [
        ...MDL_DE.fields,
        numberField('age_in_years', 'Alter in Jahren'),
        numberField('age_birth_year', 'Geburtsjahr'),
      ],
    },
  ],
  optionSets: OPTION_SETS_DE.map((set) =>
    set.key === 'countries'
      ? { ...set, options: [...set.options, { value: 'IT', label: 'Italien', description: null }] }
      : set
  ),
  language: 'de',
};

/** Every country of the context's set */
const EVERY_COUNTRY = ['DE', 'AT', 'FR', 'IT'];

// The fields, by variable key

const BIRTH = 'pid.birthdate';
const CITY_KEY = 'pid.address_locality';
const CLASSES = 'mdl.driving_privileges.classes';
const ISSUE_B = 'mdl.driving_privileges.issue_date#B';
const EXPIRY_B = 'mdl.driving_privileges.expiry_date#B';

// The spec's example: spec 002's "Passenger transport licence" (quickstart §3)

const AGE = rule(
  1,
  target('pid', 'birthdate'),
  { operator: 'at_least_years_ago', years: 21 },
  'You are too young for this licence.'
);
const CITY = rule(
  2,
  target('pid', 'address_locality'),
  { operator: 'equal_to', value: 'Stuttgart', match_case: false },
  'You must live in Stuttgart.'
);
const CLASS_B = rule(
  3,
  target('mdl', 'driving_privileges', 'classes'),
  { operator: 'includes_one_of', values: ['B'] },
  'You need a class B licence.'
);
const HELD_B = rule(
  4,
  target('mdl', 'driving_privileges', 'issue_date', 'B'),
  { operator: 'at_least_years_ago', years: 2 },
  'You must have held class B for at least 2 years.'
);

/** Standard: Rules 01 to 04, AND */
const STANDARD = mainBranch([AGE, CITY, CLASS_B, HELD_B]);

/** Ambulance, based on Standard, with Rule 01 at 19 years */
const AMBULANCE = must(
  changeItem(STANDARD, newBranch(STANDARD, 'based', 'Ambulance', null), {
    ...AGE,
    condition: { operator: 'at_least_years_ago', years: 19 },
  })
);

const EXAMPLE = [keyed(STANDARD, 'standard'), keyed(AMBULANCE, 'ambulance')];

/** The example's persona fields, as the step shows them */
const EXAMPLE_LABELS = [
  'Personal ID · Date of birth (Age)',
  'Personal ID · City or town',
  'Driving licence · Licence classes',
  'Driving licence · Licence class B – Issue date',
];

/** The example's rule messages, by id */
const MESSAGES: Record<string, string> = Object.fromEntries(
  [AGE, CITY, CLASS_B, HELD_B].map((item) => [item.id, item.message])
);

// Helpers

function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error('expected a value');
  }
  return value;
}

function keyed(branch: BranchInput, key: string): BranchInput & KeyedBranch {
  return { ...branch, key };
}

/** Rule `number` on a field, with the default message */
function on(number: number, ruleTarget: RuleTarget, condition: Condition): RuleItem {
  return rule(number, ruleTarget, condition);
}

function fieldsOf(branches: readonly KeyedBranch[], context = CONTEXT): PersonaField[] {
  return personaFieldsOf(branches, context);
}

/** A hand-made persona, ready, whose values are as generated */
function persona(
  name: string,
  values: Record<string, PersonaValue>,
  slot: PersonaSlot = 0
): Persona {
  return {
    id: (['persona-1', 'persona-2', 'persona-3'] as const)[slot],
    name,
    values,
    generated: { ...values },
    status: 'ready',
  };
}

/**
 * The step's first run, as the hook drives it: `opened` starts a run with every slot free, and the
 * worker's answer for `seed` ends it
 */
function firstRun(branches: readonly KeyedBranch[], seed: number): PersonaState {
  const opened = personaStateReducer(initialPersonaState, {
    type: 'opened',
    fields: fieldsOf(branches),
    openBranchKey: branches[0].key,
    branchKeys: branches.map((branch) => branch.key),
    now: 0,
  });
  return answered(opened, branches, seed);
}

/** The request the hook posts for the state's run (contracts/personas.md, "Worker protocol") */
function requestOf(
  state: PersonaState,
  branches: readonly KeyedBranch[],
  seed: number
): GenerationRequest {
  const run = must(state.run);
  return {
    seed,
    today: TODAY,
    branches: checkedBranchesOf(branches, CONTEXT, TODAY),
    fields: fieldsOf(branches),
    context: CONTEXT,
    slots: run.slots.map((kind, index) => ({
      kind,
      name: state.personas?.[index].name ?? null,
      values: state.personas?.[index].values ?? {},
    })),
  };
}

/** The state once the worker has answered the state's run, generated with `seed` */
function answered(
  state: PersonaState,
  branches: readonly KeyedBranch[],
  seed: number
): PersonaState {
  const result = generatePersonas(requestOf(state, branches, seed), NO_DEADLINE);
  return personaStateReducer(state, {
    type: 'runSucceeded',
    runId: must(state.run).runId,
    slots: result.slots,
  });
}

/** The three personas of the first run for `seed` */
function generated(branches: readonly KeyedBranch[], seed: number): Persona[] {
  return must(firstRun(branches, seed).personas);
}

/** Every ready persona against every branch, as the step evaluates them */
function resultsOf(
  personas: readonly Persona[],
  branches: readonly KeyedBranch[],
  today = TODAY,
  context = CONTEXT
): TestResults {
  return testResultsOf(personas, fieldsOf(branches, context), branches, context, today);
}

/** One persona's result for one branch */
function resultOf(
  subject: Persona,
  branches: readonly KeyedBranch[],
  branchKey: string,
  today = TODAY,
  context = CONTEXT
): PersonaBranchResult {
  return must(resultsOf([subject], branches, today, context)[subject.id]?.[branchKey]);
}

/** What the step shows for one persona and one branch */
function viewOf(
  subject: Persona,
  branches: readonly KeyedBranch[],
  branchKey: string,
  today = TODAY,
  context = CONTEXT
): ResultView {
  const branch = must(branches.find((each) => each.key === branchKey));
  return resultViewOf(
    resultOf(subject, branches, branchKey, today, context),
    branch,
    subject,
    context,
    fieldsOf(branches, context)
  );
}

/** A row's outline: id, status, message, and whether it is reported */
function rowsOf(view: ResultView): [string, string, string | null, boolean][] {
  return view.rows.map((row) => [row.itemId, row.status, row.message, row.reported]);
}

/** Each item's outcome in one branch, by id, top level and members */
function outcomesOf(
  subject: Persona,
  branches: readonly KeyedBranch[],
  branchKey: string
): Record<string, string> {
  const outcomes: Record<string, string> = {};
  const walk = (items: PersonaBranchResult['items']): void => {
    for (const { item, outcome, members } of items) {
      outcomes[item.id] = outcome;
      walk(members);
    }
  };
  walk(resultOf(subject, branches, branchKey).items);
  return outcomes;
}

/** "meet" or "fail" per branch, joined with "/": the persona's outcome vector */
function vectorOf(subject: Persona, branches: readonly KeyedBranch[]): string {
  const results = resultsOf([subject], branches)[subject.id];
  return branches.map((branch) => (must(results?.[branch.key]).met ? 'meet' : 'fail')).join('/');
}

/** The classes a persona holds */
function classesOf(subject: Pick<Persona, 'values'>): string[] {
  const classes = subject.values[CLASSES];
  return Array.isArray(classes) ? classes.map(String) : [];
}

/** The index of the branch's class among the goals' classes */
function classIndexOf(goals: ReturnType<typeof goalsOf>, branchKey: string): number {
  return goals.classes.findIndex((each) => each.branchKeys.includes(branchKey));
}

function goalsFor(branches: readonly KeyedBranch[]): ReturnType<typeof goalsOf> {
  return goalsOf(
    checkedBranchesOf(branches, CONTEXT, TODAY).map((each) => each.checked),
    TODAY,
    NO_DEADLINE
  );
}

// The spec's three citizens (US1's story): a 25-year-old from Stuttgart who has held class B for
// 6 years, a 20-year-old from Stuttgart who has held it for 3 years, and a 45-year-old from
// Esslingen without class B, whose hidden class B date is never delivered
const MIA = persona(
  'Mia Schulz',
  {
    [BIRTH]: '2001-06-15',
    [CITY_KEY]: 'Stuttgart',
    [CLASSES]: ['B'],
    [ISSUE_B]: '2020-05-04',
  },
  0
);
const JONAS = persona(
  'Jonas Weber',
  {
    [BIRTH]: '2006-03-10',
    [CITY_KEY]: 'stuttgart',
    [CLASSES]: ['B', 'BE'],
    [ISSUE_B]: '2023-07-01',
  },
  1
);
const ANNA = persona(
  'Anna Becker',
  {
    [BIRTH]: '1981-08-20',
    [CITY_KEY]: 'Esslingen',
    [CLASSES]: ['A'],
    [ISSUE_B]: '2010-01-01',
  },
  2
);

// User Story 1

describe('US1-AS1: the personas have exactly the data the rules check', () => {
  it('derives the four fields, named as the rules name them', () => {
    expect(fieldsOf(EXAMPLE).map((each) => `${each.documentLabel} · ${each.label}`)).toEqual(
      EXAMPLE_LABELS
    );
  });

  it('names the same four fields in German (spec 009)', () => {
    expect(
      fieldsOf(EXAMPLE, GERMAN).map((each) => `${each.documentLabel} · ${each.label}`)
    ).toEqual([
      'Personalausweis · Geburtsdatum (Alter)',
      'Personalausweis · Ort',
      'Führerschein · Führerscheinklassen',
      'Führerschein · Führerscheinklasse B – Ausstellungsdatum',
    ]);
    expect(fieldsOf(EXAMPLE, GERMAN).map((each) => each.key)).toEqual(
      fieldsOf(EXAMPLE).map((each) => each.key)
    );
  });

  it(
    'gives three named personas a value for each field and nothing else, B’s date to holders only',
    () => {
      const fields = fieldsOf(EXAMPLE);
      const keys = fields.map((each) => each.key);
      for (const seed of SEEDS) {
        const personas = generated(EXAMPLE, seed);
        expect(personas.map((each) => each.id)).toEqual(['persona-1', 'persona-2', 'persona-3']);
        expect(new Set(personas.map((each) => each.name)).size).toBe(3);
        const holders = personas.filter((each) => classesOf(each).includes('B'));
        // Rule 03 is met by one persona and failed by another (FR-011, goal 4)
        expect(holders.length, `seed ${seed}`).toBeGreaterThan(0);
        expect(holders.length, `seed ${seed}`).toBeLessThan(3);
        for (const subject of personas) {
          expect(subject.name.trim()).not.toBe('');
          expect(subject.status).toBe('ready');
          expect(Object.keys(subject.values).sort()).toEqual([...keys].sort());
          expect(subject.generated).toEqual(subject.values);

          // The panel shows class B's issue date only while B is held (FR-005)
          const holds = classesOf(subject).includes('B');
          expect(shownFieldsOf(subject, fields).map((each) => each.key)).toEqual(
            holds ? keys : keys.filter((key) => key !== ISSUE_B)
          );

          // The documents give these values and no others (FR-014)
          const applicant = applicantOf(subject, fields);
          expect(Object.keys(applicant).sort()).toEqual(['mdl', 'pid']);
          expect(Object.keys(applicant.pid).sort()).toEqual(['address_locality', 'birthdate']);
          expect(Object.keys(applicant.mdl)).toEqual(['driving_privileges']);
          const privileges = applicant.mdl.driving_privileges as Record<string, unknown>[];
          expect(privileges.map((entry) => entry.vehicle_category_code)).toEqual(
            classesOf(subject)
          );
          for (const entry of privileges) {
            expect(Object.keys(entry).sort()).toEqual(
              entry.vehicle_category_code === 'B'
                ? ['issue_date', 'vehicle_category_code']
                : ['vehicle_category_code']
            );
          }
        }
      }
    },
    GENERATING
  );

  it('delivers no class B date for a persona who doesn’t hold B, though it keeps one', () => {
    const fields = fieldsOf(EXAMPLE);
    expect(ANNA.values[ISSUE_B]).toBe('2010-01-01');
    expect(shownFieldsOf(ANNA, fields).map((each) => each.key)).not.toContain(ISSUE_B);
    expect(applicantOf(ANNA, fields)).toEqual({
      pid: { birthdate: '1981-08-20', address_locality: 'Esslingen' },
      mdl: { driving_privileges: [{ vehicle_category_code: 'A' }] },
    });
  });
});

describe('US1-AS2: per persona and variant, whether it meets the rules, and what is reported', () => {
  it('words the three citizens’ results in German, with the same outcomes (spec 009)', () => {
    for (const subject of [MIA, JONAS, ANNA]) {
      for (const branchKey of ['standard', 'ambulance']) {
        const english = viewOf(subject, EXAMPLE, branchKey);
        const german = viewOf(subject, EXAMPLE, branchKey, TODAY, GERMAN);
        expect(rowsOf(german)).toEqual(rowsOf(english));
        expect(german.meets).toBe(english.meets);
        expect(german.failingFields).toEqual(english.failingFields);
      }
    }

    const mia = viewOf(MIA, EXAMPLE, 'standard', TODAY, GERMAN);
    expect(mia.heading).toBe('Ergebnis: erfüllt alle Regeln');

    const jonas = viewOf(JONAS, EXAMPLE, 'standard', TODAY, GERMAN);
    expect(jonas.heading).toBe('Ergebnis: erfüllt 1 Regel nicht');
    expect(jonas.rows[0].name).toBe('Rule 01');
    expect(jonas.rows[0].message).toBe('You are too young for this licence.');
    expect(jonas.rows[0].statement).toBe(
      'Personalausweis · Geburtsdatum (Alter) ist mindestens 21 Jahre alt'
    );
    expect(viewOf(JONAS, EXAMPLE, 'ambulance', TODAY, GERMAN).rows[0].statement).toBe(
      'Personalausweis · Geburtsdatum (Alter) ist mindestens 19 Jahre alt'
    );

    const anna = viewOf(ANNA, EXAMPLE, 'ambulance', TODAY, GERMAN);
    expect(anna.heading).toBe('Ergebnis: erfüllt 3 Regeln nicht');
  });

  it('Mia, 25, from Stuttgart, class B for 6 years: meets both variants', () => {
    for (const branchKey of ['standard', 'ambulance']) {
      const view = viewOf(MIA, EXAMPLE, branchKey);
      expect(view.meets).toBe(true);
      expect(view.heading).toBe('Result: meets the rules');
      expect(rowsOf(view)).toEqual([
        ['rule-1', 'met', 'You are too young for this licence.', false],
        ['rule-2', 'met', 'You must live in Stuttgart.', false],
        ['rule-3', 'met', 'You need a class B licence.', false],
        ['rule-4', 'met', 'You must have held class B for at least 2 years.', false],
      ]);
      expect(view.failingFields).toEqual([]);
    }
  });

  it('Jonas, 20, from Stuttgart (in lower case), class B for 3 years: meets only Ambulance', () => {
    const standard = viewOf(JONAS, EXAMPLE, 'standard');
    expect(standard.meets).toBe(false);
    expect(standard.heading).toBe('Result: doesn’t meet 1 rule');
    expect(rowsOf(standard)).toEqual([
      ['rule-1', 'not_met', 'You are too young for this licence.', true],
      ['rule-2', 'met', 'You must live in Stuttgart.', false],
      ['rule-3', 'met', 'You need a class B licence.', false],
      ['rule-4', 'met', 'You must have held class B for at least 2 years.', false],
    ]);
    expect(standard.rows[0].name).toBe('Rule 01');
    expect(standard.rows[0].statement).toBe(
      'Personal ID · Date of birth (Age) is at least 21 years old'
    );
    expect(standard.failingFields).toEqual([BIRTH]);

    const ambulance = viewOf(JONAS, EXAMPLE, 'ambulance');
    expect(ambulance.meets).toBe(true);
    expect(ambulance.heading).toBe('Result: meets the rules');
    expect(ambulance.rows[0].statement).toBe(
      'Personal ID · Date of birth (Age) is at least 19 years old'
    );
  });

  it('Anna, 45, from Esslingen, without class B: meets neither, with three rules reported', () => {
    for (const branchKey of ['standard', 'ambulance']) {
      const view = viewOf(ANNA, EXAMPLE, branchKey);
      expect(view.meets).toBe(false);
      expect(view.heading).toBe('Result: doesn’t meet 3 rules');
      expect(rowsOf(view)).toEqual([
        ['rule-2', 'not_met', 'You must live in Stuttgart.', true],
        ['rule-3', 'not_met', 'You need a class B licence.', true],
        ['rule-4', 'not_met', 'You must have held class B for at least 2 years.', true],
        ['rule-1', 'met', 'You are too young for this licence.', false],
      ]);
      expect(view.failingFields).toEqual([CITY_KEY, CLASSES]);
    }
  });

  it(
    'reports, for every generated persona and variant, exactly the evaluation’s messages',
    () => {
      for (const seed of SEEDS) {
        const personas = generated(EXAMPLE, seed);
        const results = resultsOf(personas, EXAMPLE);
        for (const subject of personas) {
          for (const branch of EXAMPLE) {
            const result = must(results[subject.id]?.[branch.key]);
            expect(result).toEqual(
              evaluateBranch(
                branch,
                applicantOf(subject, fieldsOf(EXAMPLE)),
                dayNumber(TODAY),
                CONTEXT
              )
            );
            const view = resultViewOf(result, branch, subject, CONTEXT, fieldsOf(EXAMPLE));
            const reported = view.rows.filter((row) => row.reported);
            expect(view.meets).toBe(result.met);
            expect(reported.length === 0).toBe(result.met);
            expect(reported.map((row) => [row.itemId, row.message])).toEqual(
              result.messages.map(({ id, message }) => [id, message])
            );
            for (const row of reported) {
              expect(['not_met', 'not_checked']).toContain(row.status);
              expect(row.message).toBe(MESSAGES[row.itemId]);
            }
            const count = reported.length;
            expect(view.heading).toBe(
              count === 0
                ? 'Result: meets the rules'
                : `Result: doesn’t meet ${count} rule${count === 1 ? '' : 's'}`
            );
            expect(view.rows.map((row) => row.itemId).sort()).toEqual([
              'rule-1',
              'rule-2',
              'rule-3',
              'rule-4',
            ]);
          }
        }
      }
    },
    GENERATING
  );
});

describe('US1-AS3: one persona meets both variants, one only Ambulance, one neither', () => {
  it(
    'holds across seeds',
    () => {
      for (const seed of SEEDS) {
        const vectors = generated(EXAMPLE, seed).map((each) => vectorOf(each, EXAMPLE));
        expect(vectors.sort(), `seed ${seed}`).toEqual(['fail/fail', 'fail/meet', 'meet/meet']);
      }
    },
    GENERATING
  );

  it('the spec’s three citizens show the same pattern', () => {
    expect([MIA, JONAS, ANNA].map((each) => vectorOf(each, EXAMPLE))).toEqual([
      'meet/meet',
      'fail/meet',
      'fail/fail',
    ]);
  });
});

describe('US1-AS4: tested as if shared today', () => {
  it('names today’s date', () => {
    expect(testDayLineOf(TODAY)).toBe('Tested as if shared today, 01.11.2026');
  });

  it('names today’s date in German, still dd.mm.yyyy (spec 009, FR-012)', () => {
    expect(testDayLineOf(TODAY, 'de')).toBe(
      'Getestet, als würden die Daten heute geteilt: 01.11.2026'
    );
  });

  it('evaluates on today: a persona who turns 21 today meets Rule 01, yesterday not', () => {
    const turning = persona('Lea Fischer', { ...MIA.values, [BIRTH]: '2005-11-01' });
    expect(resultOf(turning, EXAMPLE, 'standard').met).toBe(true);
    expect(resultOf(turning, EXAMPLE, 'standard', '2026-10-31').met).toBe(false);
  });
});

describe('US1-AS5: generating one persona anew', () => {
  it(
    'gives it new values, keeps the other two, and its results follow',
    () => {
      const fields = fieldsOf(EXAMPLE);
      for (const seed of SEEDS) {
        const before = firstRun(EXAMPLE, seed);
        const personas = must(before.personas);
        const slot = (seed % 3) as PersonaSlot;
        const resultsBefore = resultsOf(personas, EXAMPLE);

        const running = personaStateReducer(before, { type: 'generateOne', slot, fields, now: 1 });
        expect(must(running.run).slots).toEqual(
          [0, 1, 2].map((index) => (index === slot ? 'free' : 'kept'))
        );
        const placeholders = must(running.personas);
        expect(placeholders[slot].status).toBe('generating');
        // While it is generated, the persona has no results; the others keep theirs
        const resultsDuring = resultsOf(placeholders, EXAMPLE);
        expect(resultsDuring[personas[slot].id]).toBeUndefined();

        const after = answered(running, EXAMPLE, seed + 100);
        expect(after.run).toBeNull();
        const renewed = must(after.personas);
        const resultsAfter = resultsOf(renewed, EXAMPLE);
        renewed.forEach((subject, index) => {
          if (index === slot) {
            expect(subject.name).toBe(personas[index].name);
            expect(subject.status).toBe('ready');
            expect(Object.keys(subject.values).sort()).toEqual(
              fields.map((each) => each.key).sort()
            );
            expect(subject.values, `seed ${seed}`).not.toEqual(personas[index].values);
            expect(subject.generated).toEqual(subject.values);
            for (const branch of EXAMPLE) {
              expect(resultsAfter[subject.id]?.[branch.key]).toEqual(
                evaluateBranch(branch, applicantOf(subject, fields), dayNumber(TODAY), CONTEXT)
              );
            }
          } else {
            expect(subject).toBe(personas[index]);
            expect(resultsDuring[subject.id]).toEqual(resultsBefore[subject.id]);
            expect(resultsAfter[subject.id]).toEqual(resultsBefore[subject.id]);
          }
        });
        // The new values reach the goals together with the two that stayed (FR-012)
        expect(renewed.map((each) => vectorOf(each, EXAMPLE)).sort(), `seed ${seed}`).toEqual([
          'fail/fail',
          'fail/meet',
          'meet/meet',
        ]);
      }
    },
    GENERATING
  );
});

// Edge cases

describe('EC "A branch without rules": every persona meets it', () => {
  const schoolTransport = keyed(
    newBranch(STANDARD, 'empty', 'School transport', null),
    'school-transport'
  );
  const allRemoved = keyed(
    [AGE, CITY, CLASS_B, HELD_B].reduce<BranchInput>(
      (branch, item) => must(removeItem(STANDARD, branch, item.id)),
      newBranch(STANDARD, 'based', 'Taxi', null)
    ),
    'taxi'
  );
  const branches = [...EXAMPLE, schoolTransport, allRemoved];

  it('a branch without rules, and a based branch with every rule removed, add no field', () => {
    expect(fieldsOf(branches)).toEqual(fieldsOf(EXAMPLE));
  });

  it('every hand-made persona meets them, with nothing to report', () => {
    for (const subject of [MIA, JONAS, ANNA]) {
      for (const branchKey of ['school-transport', 'taxi']) {
        expect(resultOf(subject, branches, branchKey)).toEqual({
          met: true,
          items: [],
          messages: [],
        });
        const view = viewOf(subject, branches, branchKey);
        expect(view.heading).toBe('Result: meets the rules');
        expect(view.rows).toEqual([]);
      }
    }
  });

  it(
    'every generated persona meets them, and the other variants still reach their goals',
    () => {
      for (const seed of SEEDS) {
        const personas = generated(branches, seed);
        const vectors = personas.map((each) => vectorOf(each, branches)).sort();
        expect(vectors, `seed ${seed}`).toEqual([
          'fail/fail/meet/meet',
          'fail/meet/meet/meet',
          'meet/meet/meet/meet',
        ]);
      }
    },
    GENERATING
  );
});

describe('EC "A branch that no citizen can meet": no persona meets it', () => {
  // Ambulance also asks for "Date of birth (Age) is less than 18 years old" (quickstart V6)
  const unmeetable = keyed(
    must(
      addRuleToBranch(
        AMBULANCE,
        rule(
          5,
          target('pid', 'birthdate'),
          { operator: 'less_than_years_ago', years: 18 },
          'You are too old for this licence.'
        )
      )
    ),
    'ambulance'
  );
  const branches = [EXAMPLE[0], unmeetable];

  it('is the branch spec 003 points out', () => {
    const checked = buildCheckedBranch(unmeetable, CONTEXT, TODAY);
    const { notice } = checkBranch(checked, NO_DEADLINE);
    expect(noticeText(must(notice), 'Ambulance')).toBe(
      'No citizen can meet the rules of Ambulance.'
    );
  });

  it('generation doesn’t try to meet it', () => {
    const goals = goalsFor(branches);
    const index = classIndexOf(goals, 'ambulance');
    expect(goals.targets.filter((each) => each.goal === 1 && each.classIndex === index)).toEqual(
      []
    );
  });

  it(
    'no generated persona meets it, and Standard is still met by one and failed by another',
    () => {
      for (const seed of SEEDS) {
        const vectors = generated(branches, seed).map((each) => vectorOf(each, branches));
        expect(vectors.every((vector) => vector.endsWith('/fail'))).toBe(true);
        expect(vectors, `seed ${seed}`).toContain('meet/fail');
        expect(vectors, `seed ${seed}`).toContain('fail/fail');
      }
    },
    GENERATING
  );
});

describe('EC "A branch that every citizen meets": every persona meets it', () => {
  // "Personal ID · Nationality includes one of" every country (spec 003, FR-006)
  const always = keyed(
    {
      ...mainBranch([
        on(5, target('pid', 'nationalities'), {
          operator: 'includes_one_of',
          values: EVERY_COUNTRY,
        }),
      ]),
      name: 'Everyone',
    },
    'everyone'
  );
  const branches = [...EXAMPLE, always];

  it('is the branch spec 003 points out', () => {
    const checked = buildCheckedBranch(always, CONTEXT, TODAY);
    const { notice } = checkBranch(checked, NO_DEADLINE);
    expect(noticeText(must(notice), 'Everyone')).toBe('Every citizen meets the rules of Everyone.');
  });

  it('generation doesn’t try to fail it', () => {
    const goals = goalsFor(branches);
    const index = classIndexOf(goals, 'everyone');
    expect(goals.targets.filter((each) => each.goal === 2 && each.classIndex === index)).toEqual(
      []
    );
  });

  it(
    'every generated persona meets it, and Standard and Ambulance keep their pattern',
    () => {
      for (const seed of SEEDS) {
        const vectors = generated(branches, seed)
          .map((each) => vectorOf(each, branches))
          .sort();
        expect(vectors, `seed ${seed}`).toEqual([
          'fail/fail/meet',
          'fail/meet/meet',
          'meet/meet/meet',
        ]);
      }
    },
    GENERATING
  );
});

describe('EC "Rules removed in a branch": not tested there', () => {
  // Ambulance without Rule 02 "City or town is equal to Stuttgart"
  const withoutCity = keyed(must(removeItem(STANDARD, AMBULANCE, CITY.id)), 'ambulance');
  const branches = [EXAMPLE[0], withoutCity];

  it('keeps the field while Standard checks it', () => {
    expect(fieldsOf(branches)).toEqual(fieldsOf(EXAMPLE));
  });

  it('leaves the rule out of the branch’s results', () => {
    const view = viewOf(ANNA, branches, 'ambulance');
    expect(rowsOf(view)).toEqual([
      ['rule-3', 'not_met', 'You need a class B licence.', true],
      ['rule-4', 'not_met', 'You must have held class B for at least 2 years.', true],
      ['rule-1', 'met', 'You are too young for this licence.', false],
    ]);
    // Mia from Esslingen fails Standard on the city, and meets Ambulance
    const elsewhere = persona('Mia Schulz', { ...MIA.values, [CITY_KEY]: 'Esslingen' });
    expect(vectorOf(elsewhere, branches)).toBe('fail/meet');
    expect(outcomesOf(elsewhere, branches, 'ambulance')).toEqual({
      'rule-1': 'met',
      'rule-3': 'met',
      'rule-4': 'met',
    });
  });

  it(
    'no generated persona’s result for the branch holds the rule',
    () => {
      for (const seed of SEEDS) {
        for (const subject of generated(branches, seed)) {
          expect(Object.keys(outcomesOf(subject, branches, 'ambulance'))).not.toContain(CITY.id);
        }
      }
    },
    GENERATING
  );
});

describe('EC "Birthday today and 29 February": as the evaluation counts them', () => {
  it('a persona who turns 21 today is 21, and meets Rule 01', () => {
    const turning = persona('Lea Fischer', { ...MIA.values, [BIRTH]: '2005-11-01' });
    expect(ageOn(turning.values[BIRTH], TODAY)).toBe(21);
    expect(outcomesOf(turning, EXAMPLE, 'standard')['rule-1']).toBe('met');
    const tomorrow = persona('Lea Fischer', { ...MIA.values, [BIRTH]: '2005-11-02' });
    expect(ageOn(tomorrow.values[BIRTH], TODAY)).toBe(20);
    expect(outcomesOf(tomorrow, EXAMPLE, 'standard')['rule-1']).toBe('not_met');
  });

  it('a persona born on 29 February turns 21 on 1 March in a year without it', () => {
    const leap = persona('Lea Fischer', { ...MIA.values, [BIRTH]: '2004-02-29' });
    const ruleOne = (today: string) =>
      must(
        resultOf(leap, EXAMPLE, 'standard', today).items.find((each) => each.item.id === 'rule-1')
      ).outcome;
    expect(ageOn(leap.values[BIRTH], '2025-02-28')).toBe(20);
    expect(ruleOne('2025-02-28')).toBe('not_met');
    expect(ageOn(leap.values[BIRTH], '2025-03-01')).toBe(21);
    expect(ruleOne('2025-03-01')).toBe('met');
  });
});

describe('EC "A rule on a class the persona doesn’t hold": not met', () => {
  it('reports Rule 04 as not met, not as couldn’t be checked, and marks the classes', () => {
    // Holds BE but not B, with a class B date kept from before
    const withoutB = persona('Jonas Weber', { ...MIA.values, [CLASSES]: ['BE'] });
    const view = viewOf(withoutB, EXAMPLE, 'standard');
    expect(rowsOf(view)).toEqual([
      ['rule-3', 'not_met', 'You need a class B licence.', true],
      ['rule-4', 'not_met', 'You must have held class B for at least 2 years.', true],
      ['rule-1', 'met', 'You are too young for this licence.', false],
      ['rule-2', 'met', 'You must live in Stuttgart.', false],
    ]);
    expect(view.failingFields).toEqual([CLASSES]);
    expect(shownFieldsOf(withoutB, fieldsOf(EXAMPLE)).map((each) => each.key)).not.toContain(
      ISSUE_B
    );
  });
});

describe('EC "An empty class list" and "A class without an expiry date": couldn’t be checked', () => {
  it('an empty class list: Rules 03 and 04 couldn’t be checked', () => {
    const noClasses = persona('Mia Schulz', { ...MIA.values, [CLASSES]: [] });
    const view = viewOf(noClasses, EXAMPLE, 'standard');
    expect(view.heading).toBe('Result: doesn’t meet 2 rules');
    expect(rowsOf(view)).toEqual([
      ['rule-3', 'not_checked', 'You need a class B licence.', true],
      ['rule-4', 'not_checked', 'You must have held class B for at least 2 years.', true],
      ['rule-1', 'met', 'You are too young for this licence.', false],
      ['rule-2', 'met', 'You must live in Stuttgart.', false],
    ]);
  });

  it('class B held with an empty expiry date: the rule on it couldn’t be checked', () => {
    const valid = on(5, target('mdl', 'driving_privileges', 'expiry_date', 'B'), {
      operator: 'at_least_from_now',
      amount: 6,
      unit: 'months',
    });
    const branches = [keyed(mainBranch([CLASS_B, valid]), 'standard')];
    expect(fieldsOf(branches).map((each) => each.key)).toEqual([CLASSES, EXPIRY_B]);
    for (const empty of ['', null]) {
      const subject = persona('Mia Schulz', { [CLASSES]: ['B'], [EXPIRY_B]: empty });
      expect(rowsOf(viewOf(subject, branches, 'standard'))).toEqual([
        ['rule-5', 'not_checked', 'You must meet this rule.', true],
        ['rule-3', 'met', 'You need a class B licence.', false],
      ]);
    }
    const dated = persona('Mia Schulz', { [CLASSES]: ['B'], [EXPIRY_B]: '2030-01-01' });
    expect(resultOf(dated, branches, 'standard').met).toBe(true);
  });
});

describe('EC "Several values": German and Italian nationality', () => {
  const germany = on(5, target('pid', 'nationalities'), {
    operator: 'includes_one_of',
    values: ['DE'],
  });
  const italy = on(6, target('pid', 'nationalities'), {
    operator: 'includes_one_of',
    values: ['IT'],
  });
  const branches = [keyed(mainBranch([germany, italy]), 'standard')];

  it('meets both "includes one of Germany" and "includes one of Italy"', () => {
    const both = persona('Giulia Romano', { 'pid.nationalities': ['DE', 'IT'] });
    expect(outcomesOf(both, branches, 'standard')).toEqual({ 'rule-5': 'met', 'rule-6': 'met' });
    expect(resultOf(both, branches, 'standard').met).toBe(true);
    const german = persona('Giulia Romano', { 'pid.nationalities': ['DE'] });
    expect(outcomesOf(german, branches, 'standard')).toEqual({
      'rule-5': 'met',
      'rule-6': 'not_met',
    });
  });

  it(
    'generation gives a persona several nationalities to meet the branch',
    () => {
      for (const seed of SEEDS) {
        const personas = generated(branches, seed);
        const meeting = personas.filter((each) => resultOf(each, branches, 'standard').met);
        expect(meeting.length, `seed ${seed}`).toBeGreaterThan(0);
        expect(meeting.length, `seed ${seed}`).toBeLessThan(3);
        for (const subject of meeting) {
          expect(subject.values['pid.nationalities']).toEqual(expect.arrayContaining(['DE', 'IT']));
        }
      }
    },
    GENERATING
  );
});

describe('EC "Fields that describe the same fact": generated values agree', () => {
  const branches = [
    keyed(
      mainBranch([
        on(1, target('pid', 'birthdate'), { operator: 'at_least_years_ago', years: 21 }),
        on(2, target('mdl', 'birth_date'), { operator: 'at_least_years_ago', years: 21 }),
        on(3, target('mdl', 'age_in_years'), { operator: 'greater_than', value: 20 }),
        on(4, target('mdl', 'age_birth_year'), { operator: 'less_than', value: 2006 }),
        on(5, target('pid', 'address_locality'), {
          operator: 'equal_to',
          value: 'Stuttgart',
          match_case: false,
        }),
        on(6, target('mdl', 'resident_city'), {
          operator: 'equal_to',
          value: 'Stuttgart',
          match_case: false,
        }),
        on(7, target('pid', 'nationalities'), { operator: 'includes_one_of', values: ['DE'] }),
        on(8, target('mdl', 'nationality'), { operator: 'includes_one_of', values: ['DE'] }),
      ]),
      'standard'
    ),
  ];

  it(
    'gives both dates of birth, the age, the year of birth, the city and the nationality alike',
    () => {
      for (const seed of SEEDS) {
        for (const { name, values } of generated(branches, seed)) {
          const label = `${name}, seed ${seed}`;
          const birth = values['pid.birthdate'];
          expect(values['mdl.birth_date'], label).toBe(birth);
          expect(values['mdl.age_in_years'], label).toBe(ageOn(birth, TODAY));
          expect(values['mdl.age_birth_year'], label).toBe(Number(String(birth).slice(0, 4)));
          expect(values['mdl.resident_city'], label).toBe(values['pid.address_locality']);
          expect(values['pid.nationalities'], label).toContain(values['mdl.nationality']);
          expect(parseDayNumber(birth)).not.toBeNull();
        }
      }
    },
    GENERATING
  );
});

describe('EC "More rules than three personas can cover": FR-011’s goals in order', () => {
  /** Rule `number`: "City or town is equal to `city`" */
  const livesIn = (number: number, city: string): RuleItem =>
    on(number, target('pid', 'address_locality'), {
      operator: 'equal_to',
      value: city,
      match_case: false,
    });

  it(
    'four variants that each need another city: three are met, and every one is failed',
    () => {
      // Goal 1 can reach only 3 of 4 variants; goals 2 and 3 can be reached in full
      const cities = ['Stuttgart', 'Ulm', 'Esslingen', 'Tübingen'];
      const branches = cities.map((city, index) =>
        keyed({ ...mainBranch([livesIn(index + 1, city)]), name: city }, `branch-${index + 1}`)
      );
      for (const seed of SEEDS) {
        const vectors = generated(branches, seed).map((each) =>
          vectorOf(each, branches).split('/')
        );
        const met = branches.filter((_, index) => vectors.some((v) => v[index] === 'meet'));
        const failed = branches.filter((_, index) => vectors.some((v) => v[index] === 'fail'));
        expect(met, `seed ${seed}`).toHaveLength(3);
        expect(failed, `seed ${seed}`).toHaveLength(4);
        for (let a = 0; a < branches.length; a += 1) {
          for (let b = a + 1; b < branches.length; b += 1) {
            expect(
              vectors.some((v) => v[a] !== v[b]),
              `seed ${seed}, variants ${a + 1} and ${b + 1}`
            ).toBe(true);
          }
        }
      }
    },
    GENERATING
  );

  it(
    'an OR of five cities: the branch is met and failed, before meeting a third rule',
    () => {
      // Three personas meeting three cities would meet and fail 8 of the 10 rule targets, but
      // nobody would fail the branch: goal 2 comes first, so one persona fails it, and the other
      // two meet two of the rules (7 of 10)
      const cities = ['Stuttgart', 'Ulm', 'Esslingen', 'Tübingen', 'Reutlingen'];
      const rules = cities.map((city, index) => livesIn(index + 1, city));
      const branches = [keyed({ ...mainBranch(rules), operator: 'or' }, 'standard')];
      for (const seed of SEEDS) {
        const personas = generated(branches, seed);
        const outcomes = personas.map((each) => outcomesOf(each, branches, 'standard'));
        const meets = personas.map((each) => resultOf(each, branches, 'standard').met);
        expect(meets, `seed ${seed}`).toContain(true);
        expect(meets, `seed ${seed}`).toContain(false);
        const metRules = rules.filter((item) => outcomes.some((each) => each[item.id] === 'met'));
        const failedRules = rules.filter((item) =>
          outcomes.some((each) => each[item.id] === 'not_met')
        );
        expect(metRules, `seed ${seed}`).toHaveLength(2);
        expect(failedRules, `seed ${seed}`).toHaveLength(5);
      }
    },
    GENERATING
  );
});

// User Story 2: editing a persona. The reducer's `setValue` and `rename` are T040's; a case here
// edits as they do, with a copy of the persona's values, and judges the persona the step shows.

/** The persona with one value changed, as an edit applies it (`generated` stays) */
function edited(subject: Persona, key: string, value: PersonaValue): Persona {
  return { ...subject, values: { ...subject.values, [key]: value } };
}

/** The date `years` years before `today` (a `YYYY-MM-DD` day that is not 29 February) */
function yearsBefore(today: string, years: number): string {
  return `${Number(today.slice(0, 4)) - years}${today.slice(4)}`;
}

/** Each branch's `met` for the persona, as `announcementOf()` takes it */
function metOf(
  subject: Persona,
  branches: readonly KeyedBranch[],
  context = CONTEXT
): Record<string, boolean> {
  const results = must(resultsOf([subject], branches, TODAY, context)[subject.id]);
  return Object.fromEntries(branches.map((each) => [each.key, must(results[each.key]).met]));
}

const EXAMPLE_TABS = [
  { key: 'standard', name: 'Standard' },
  { key: 'ambulance', name: 'Ambulance' },
];

/** Rule 01's outcome for a persona on `today` */
function ruleOneOf(subject: Persona, branches: readonly KeyedBranch[], today = TODAY): string {
  return must(
    resultOf(subject, branches, branches[0].key, today).items.find(
      (each) => each.item.id === 'rule-1'
    )
  ).outcome;
}

describe('US2-AS1: an age of 20 no longer meets Standard, still meets Ambulance', () => {
  // The date that gives age 20 today: the day after the 21st birthday's day, a year later
  const twenty = edited(MIA, BIRTH, '2006-11-01');

  it('gives age 20 on today', () => {
    expect(ageOn(MIA.values[BIRTH], TODAY)).toBe(25);
    expect(ageOn(twenty.values[BIRTH], TODAY)).toBe(20);
  });

  it('fails Standard at Rule 01 with its message, and meets Ambulance', () => {
    const standard = viewOf(twenty, EXAMPLE, 'standard');
    expect(standard.meets).toBe(false);
    expect(standard.heading).toBe('Result: doesn’t meet 1 rule');
    expect(rowsOf(standard)[0]).toEqual([
      'rule-1',
      'not_met',
      'You are too young for this licence.',
      true,
    ]);
    expect(standard.rows[0].name).toBe('Rule 01');
    expect(standard.failingFields).toEqual([BIRTH]);
    expect(viewOf(twenty, EXAMPLE, 'ambulance').meets).toBe(true);
  });

  it('announces that the persona no longer meets the rules of Standard, and nothing else', () => {
    expect(metOf(MIA, EXAMPLE)).toEqual({ standard: true, ambulance: true });
    expect(metOf(twenty, EXAMPLE)).toEqual({ standard: false, ambulance: true });
    expect(announcementOf(metOf(MIA, EXAMPLE), metOf(twenty, EXAMPLE), twenty, EXAMPLE_TABS)).toBe(
      'Mia Schulz no longer meets the rules of Standard.'
    );
    expect(
      announcementOf(metOf(twenty, EXAMPLE), metOf(twenty, EXAMPLE), twenty, EXAMPLE_TABS)
    ).toBe('');
  });

  it('announces it in German, from the same outcomes (spec 009)', () => {
    const before = metOf(MIA, EXAMPLE, GERMAN);
    const after = metOf(twenty, EXAMPLE, GERMAN);
    expect([before, after]).toEqual([metOf(MIA, EXAMPLE), metOf(twenty, EXAMPLE)]);
    expect(announcementOf(before, after, twenty, EXAMPLE_TABS, 'de')).toBe(
      'Mia Schulz erfüllt die Regeln von Standard nicht mehr.'
    );
    const standard = viewOf(twenty, EXAMPLE, 'standard', TODAY, GERMAN);
    expect(standard.heading).toBe('Ergebnis: erfüllt 1 Regel nicht');
    expect(rowsOf(standard)[0]).toEqual([
      'rule-1',
      'not_met',
      'You are too young for this licence.',
      true,
    ]);
  });
});

describe('US2-AS2: the day 21 years before today meets "at least 21 years old"', () => {
  it('meets Rule 01, and the day after does not', () => {
    const exact = edited(MIA, BIRTH, yearsBefore(TODAY, 21));
    expect(exact.values[BIRTH]).toBe('2005-11-01');
    expect(ruleOneOf(exact, EXAMPLE)).toBe('met');
    expect(viewOf(exact, EXAMPLE, 'standard').rows[0].statement).toBe(
      'Personal ID · Date of birth (Age) is at least 21 years old'
    );
    expect(ruleOneOf(edited(MIA, BIRTH, '2005-11-02'), EXAMPLE)).toBe('not_met');
  });
});

describe('US2-AS3: "STUTTGART" against letter case', () => {
  const upper = edited(MIA, CITY_KEY, 'STUTTGART');
  const ruleTwo = (branches: readonly KeyedBranch[]) =>
    outcomesOf(upper, branches, 'standard')['rule-2'];

  it('fails Rule 02 when the rule respects letter case', () => {
    const respecting = [
      keyed(
        mainBranch([
          { ...CITY, condition: { operator: 'equal_to', value: 'Stuttgart', match_case: true } },
        ]),
        'standard'
      ),
    ];
    expect(ruleTwo(respecting)).toBe('not_met');
    expect(resultOf(upper, respecting, 'standard').met).toBe(false);
    expect(outcomesOf(MIA, respecting, 'standard')['rule-2']).toBe('met');
  });

  it('meets Rule 02 when the rule ignores letter case', () => {
    expect(ruleTwo(EXAMPLE)).toBe('met');
    expect(resultOf(upper, EXAMPLE, 'standard').met).toBe(true);
  });
});

describe('US2-AS4: removing class B hides its date; adding it back shows the earlier date', () => {
  const fields = fieldsOf(EXAMPLE);
  const without = edited(MIA, CLASSES, ['BE']);

  it('hides the date but keeps its value, and reports Rule 04 as not met', () => {
    expect(shownFieldsOf(MIA, fields).map((each) => each.key)).toContain(ISSUE_B);
    expect(shownFieldsOf(without, fields).map((each) => each.key)).not.toContain(ISSUE_B);
    expect(without.values[ISSUE_B]).toBe('2020-05-04');
    expect(outcomesOf(without, EXAMPLE, 'standard')).toMatchObject({
      'rule-3': 'not_met',
      'rule-4': 'not_met',
    });
  });

  it('shows the earlier date again with class B', () => {
    const back = edited(without, CLASSES, ['BE', 'B']);
    expect(shownFieldsOf(back, fields).map((each) => each.key)).toContain(ISSUE_B);
    expect(back.values[ISSUE_B]).toBe('2020-05-04');
    expect(resultOf(back, EXAMPLE, 'standard').met).toBe(true);
  });
});

describe('US2-AS5: an empty date of birth couldn’t be checked', () => {
  it('reports Rule 01 as not checked in both variants, and meets neither', () => {
    for (const empty of ['', null]) {
      const cleared = edited(MIA, BIRTH, empty);
      for (const branchKey of ['standard', 'ambulance']) {
        const view = viewOf(cleared, EXAMPLE, branchKey);
        expect(view.meets).toBe(false);
        expect(rowsOf(view)[0]).toEqual([
          'rule-1',
          'not_checked',
          'You are too young for this licence.',
          true,
        ]);
        expect(view.failingFields).toEqual([BIRTH]);
      }
      expect(ageOn(cleared.values[BIRTH], TODAY)).toBeNull();
    }
  });
});

describe('US2-AS6: data that no rule checks isn’t there', () => {
  it('has no family name, in the fields, the values or the documents', () => {
    const fields = fieldsOf(EXAMPLE);
    expect(fields.map((each) => each.key)).not.toContain('pid.family_name');
    for (const seed of [1, 2, 3]) {
      for (const subject of generated(EXAMPLE, seed)) {
        expect(Object.keys(subject.values)).not.toContain('pid.family_name');
        expect(applicantOf(subject, fields).pid).not.toHaveProperty('family_name');
      }
    }
    expect(Object.keys(MIA.values).filter((key) => key.includes('family'))).toEqual([]);
  });
});

describe('US2-AS7: a rename changes no result', () => {
  it('keeps every outcome, row and message', () => {
    const renamed = { ...JONAS, name: 'Erika Mustermann' };
    expect(resultsOf([renamed], EXAMPLE)['persona-2']).toEqual(
      resultsOf([JONAS], EXAMPLE)['persona-2']
    );
    for (const branchKey of ['standard', 'ambulance']) {
      const before = viewOf(JONAS, EXAMPLE, branchKey);
      const after = viewOf(renamed, EXAMPLE, branchKey);
      expect(rowsOf(after)).toEqual(rowsOf(before));
      expect(after.meets).toBe(before.meets);
      expect(after.failingFields).toEqual(before.failingFields);
    }
    expect(
      announcementOf(metOf(JONAS, EXAMPLE), metOf(renamed, EXAMPLE), renamed, EXAMPLE_TABS)
    ).toBe('');
  });
});

describe('EC "Dates of birth in the future and ages of 200": evaluated like any value', () => {
  it('a date of birth in the future fails Rule 01, with an age below 0', () => {
    const future = edited(MIA, BIRTH, '2030-01-15');
    expect(ageOn(future.values[BIRTH], TODAY)).toBeLessThan(0);
    expect(ruleOneOf(future, EXAMPLE)).toBe('not_met');
    expect(resultOf(future, EXAMPLE, 'standard').met).toBe(false);
    expect(resultOf(future, EXAMPLE, 'ambulance').met).toBe(false);
  });

  it('an age of 200 meets "at least 21 years old"', () => {
    const old = edited(MIA, BIRTH, yearsBefore(TODAY, 200));
    expect(old.values[BIRTH]).toBe('1826-11-01');
    expect(ageOn(old.values[BIRTH], TODAY)).toBe(200);
    expect(ruleOneOf(old, EXAMPLE)).toBe('met');
  });
});

describe('EC "Changing the personal ID’s date of birth": the licence’s stays', () => {
  const both = [
    keyed(
      mainBranch([
        on(1, target('pid', 'birthdate'), { operator: 'at_least_years_ago', years: 21 }),
        on(2, target('mdl', 'birth_date'), { operator: 'at_least_years_ago', years: 21 }),
      ]),
      'standard'
    ),
  ];
  const fields = fieldsOf(both);

  it('delivers the old licence date and judges each rule on its own field', () => {
    const base = persona('Mia Schulz', { [BIRTH]: '2001-06-15', 'mdl.birth_date': '2001-06-15' });
    const changed = edited(base, BIRTH, '2010-01-01');
    expect(changed.values['mdl.birth_date']).toBe('2001-06-15');
    expect(applicantOf(changed, fields)).toEqual({
      pid: { birthdate: '2010-01-01' },
      mdl: { birth_date: '2001-06-15' },
    });
    expect(outcomesOf(changed, both, 'standard')).toEqual({
      'rule-1': 'not_met',
      'rule-2': 'met',
    });
  });
});

describe('SC-001: the evaluation’s edge cases, on edited values', () => {
  it('an age exactly at the limit, and a day short of it', () => {
    for (const [birth, outcome] of [
      ['2005-11-01', 'met'],
      ['2005-11-02', 'not_met'],
      ['2005-10-31', 'met'],
    ] as const) {
      expect(ruleOneOf(edited(MIA, BIRTH, birth), EXAMPLE)).toBe(outcome);
    }
  });

  it('a date some months from now, at the end of a month', () => {
    const valid = on(5, target('mdl', 'driving_privileges', 'expiry_date', 'B'), {
      operator: 'at_least_from_now',
      amount: 6,
      unit: 'months',
    });
    const branches = [keyed(mainBranch([CLASS_B, valid]), 'standard')];
    // 31 Aug 2026 plus 6 months has no 31 Feb: it is the 1st of March 2027 (FR-012)
    const thirtyFirst = '2026-08-31';
    for (const [expiry, met] of [
      ['2027-02-28', false],
      ['2027-03-01', true],
      ['2027-03-02', true],
    ] as const) {
      const subject = persona('Mia Schulz', { [CLASSES]: ['B'], [EXPIRY_B]: expiry });
      expect(resultOf(subject, branches, 'standard', thirtyFirst).met, expiry).toBe(met);
    }
  });

  it('German letters match ignoring case, "ß" with "SS" included', () => {
    const city = (value: string, match_case: boolean) => [
      keyed(
        mainBranch([
          on(1, target('pid', 'address_locality'), { operator: 'equal_to', value, match_case }),
        ]),
        'standard'
      ),
    ];
    const at = (typed: string, branches: readonly KeyedBranch[]) =>
      resultOf(persona('Mia Schulz', { [CITY_KEY]: typed }), branches, 'standard').met;
    expect(at('KÖLN', city('Köln', false))).toBe(true);
    expect(at('KÖLN', city('Köln', true))).toBe(false);
    expect(at('STRASSE', city('Straße', false))).toBe(true);
    expect(at('Schönau', city('Schönau', true))).toBe(true);
  });

  it('spaces at the start and the end of a typed value are ignored', () => {
    const typed = edited(MIA, CITY_KEY, '  Stuttgart ');
    expect(outcomesOf(typed, EXAMPLE, 'standard')['rule-2']).toBe('met');
    const respecting = [
      keyed(
        mainBranch([
          { ...CITY, condition: { operator: 'equal_to', value: 'Stuttgart', match_case: true } },
        ]),
        'standard'
      ),
    ];
    expect(outcomesOf(typed, respecting, 'standard')['rule-2']).toBe('met');
  });
});

// User Story 3: keeping the personas while the rules change. The round trip is the hook's: the
// rules step changes the branches, `opened` starts a fill run for a persona that lacks a value for
// a current field, and the worker's answer ends it.

const STANDARD_KEY = 'standard';
const NATIONALITY_KEY = 'pid.nationalities';

/** The three hand-made personas as the step holds them after its first run */
function stateOfExample(): PersonaState {
  return { ...firstRun(EXAMPLE, 1), personas: [MIA, JONAS, ANNA] };
}

/** The state after an edit of a persona's value, as the reducer applies it */
function editedState(
  state: PersonaState,
  slot: PersonaSlot,
  key: string,
  value: PersonaValue
): PersonaState {
  return personaStateReducer(state, {
    type: 'setValue',
    slot,
    key,
    value,
    before: {},
    after: {},
    branches: [],
  });
}

/** The branches after a change of the main branch: Ambulance follows it (`propagateMain()`) */
function afterMainChange(newMain: BranchInput, oldMain = STANDARD): KeyedBranch[] {
  return [
    keyed(newMain, STANDARD_KEY),
    keyed(propagateMain(oldMain, newMain, AMBULANCE), 'ambulance'),
  ];
}

/** The state back in the test step with `branches`: `opened`, and the answer of a run it starts */
function returnedTo(
  state: PersonaState,
  branches: readonly KeyedBranch[],
  seed: number,
  openBranchKey: string = STANDARD_KEY
): { opened: PersonaState; done: PersonaState } {
  const opened = personaStateReducer(state, {
    type: 'opened',
    fields: fieldsOf(branches),
    openBranchKey,
    branchKeys: branches.map((branch) => branch.key),
    now: 0,
  });
  return { opened, done: opened.run === null ? opened : answered(opened, branches, seed) };
}

/** The personas the state holds */
function personasIn(state: PersonaState): Persona[] {
  return must(state.personas);
}

/** Standard's items with `item` replacing the rule of its identifier */
function mainWith(item: RuleItem): BranchInput {
  return mainBranch(replaceItem(STANDARD.items, item));
}

describe('US3-AS1: Standard’s Rule 01 from 21 to 18 keeps every value and the results follow', () => {
  // A persona of 19 years and a month: too young for 21, old enough for 18
  const AGE_19 = '2007-10-01';
  const LOWERED = afterMainChange(
    mainWith({ ...AGE, condition: { operator: 'at_least_years_ago', years: 18 } })
  );

  it('keeps every value, the names and the order, and starts no run', () => {
    const before = editedState(stateOfExample(), 0, BIRTH, AGE_19);
    const { opened, done } = returnedTo(before, LOWERED, 4);
    expect(opened.run).toBeNull();
    expect(done.personas).toBe(before.personas);
    expect(personasIn(done).map((each) => each.name)).toEqual([
      'Mia Schulz',
      'Jonas Weber',
      'Anna Becker',
    ]);
    expect(personasIn(done)[0].values[BIRTH]).toBe(AGE_19);
    expect(opened.branchKey).toBe(STANDARD_KEY);
  });

  it('judges Rule 01 by the new limit, and no other rule changes', () => {
    const subject = personasIn(editedState(stateOfExample(), 0, BIRTH, AGE_19))[0];
    expect(outcomesOf(subject, EXAMPLE, 'standard')).toMatchObject({ 'rule-1': 'not_met' });
    expect(outcomesOf(subject, LOWERED, 'standard')).toMatchObject({ 'rule-1': 'met' });
    const { 'rule-1': _before, ...othersBefore } = outcomesOf(subject, EXAMPLE, 'standard');
    const { 'rule-1': _after, ...othersAfter } = outcomesOf(subject, LOWERED, 'standard');
    expect(othersAfter).toEqual(othersBefore);
    expect(viewOf(subject, EXAMPLE, 'standard').meets).toBe(false);
    expect(viewOf(subject, LOWERED, 'standard').meets).toBe(true);
  });

  it('shows the same rows and fields, with Rule 01 judged anew', () => {
    expect(fieldsOf(LOWERED)).toEqual(fieldsOf(EXAMPLE));
    const jonas = viewOf(JONAS, LOWERED, 'standard');
    expect(jonas.meets).toBe(true);
    expect(rowsOf(jonas).map((row) => row[1])).toEqual(['met', 'met', 'met', 'met']);
  });
});

describe('US3-AS2: a new rule on "Nationality" gives every persona a nationality', () => {
  const NATIONALITY = rule(5, target('pid', 'nationalities'), {
    operator: 'includes_one_of',
    values: ['DE'],
  });
  const WITH = afterMainChange(mainBranch([...STANDARD.items, NATIONALITY]));

  it('adds the field to the personas’ fields, and Ambulance follows', () => {
    expect(fieldsOf(WITH).map((each) => each.key)).toEqual([
      BIRTH,
      NATIONALITY_KEY,
      CITY_KEY,
      CLASSES,
      ISSUE_B,
    ]);
    expect(outcomesOf(MIA, WITH, 'ambulance')).toHaveProperty('rule-5');
  });

  it('fills every persona, while it is generated shows each as filling', () => {
    const { opened } = returnedTo(stateOfExample(), WITH, 2);
    expect(opened.run?.slots).toEqual(['filled', 'filled', 'filled']);
    expect(personasIn(opened).map((each) => each.status)).toEqual([
      'filling',
      'filling',
      'filling',
    ]);
  });

  it(
    'gives each a nationality, one that meets the rule and one that doesn’t, and changes no value',
    () => {
      const before = [MIA, JONAS, ANNA];
      for (const seed of SEEDS) {
        const { done } = returnedTo(stateOfExample(), WITH, seed);
        const personas = personasIn(done);
        expect(done.run, `seed ${seed}`).toBeNull();
        expect(
          personas.map((each) => each.status),
          `seed ${seed}`
        ).toEqual(['ready', 'ready', 'ready']);
        personas.forEach((each, index) => {
          expect(Object.hasOwn(each.values, NATIONALITY_KEY), `seed ${seed}`).toBe(true);
          expect(each.values, `seed ${seed}`).toMatchObject(before[index].values);
          expect(each.name).toBe(before[index].name);
        });
        const outcomes = personas.map((each) => outcomesOf(each, WITH, 'standard')['rule-5']);
        expect(outcomes, `seed ${seed}`).toContain('met');
        expect(outcomes, `seed ${seed}`).toContain('not_met');
      }
    },
    GENERATING
  );

  it('shows the nationality as a row of the panel’s fields', () => {
    const { done } = returnedTo(stateOfExample(), WITH, 6);
    const shown = shownFieldsOf(personasIn(done)[0], fieldsOf(WITH));
    expect(shown.map((each) => each.key)).toContain(NATIONALITY_KEY);
  });
});

describe('US3-AS3: deleting the only rule on "City or town" removes the field, adding it back returns the value', () => {
  const WITHOUT = afterMainChange(mainBranch(must(deleteItem(STANDARD.items, 'rule-2')).items));

  it('removes the field, and no result depends on it', () => {
    expect(fieldsOf(WITHOUT).map((each) => each.key)).not.toContain(CITY_KEY);
    for (const branchKey of ['standard', 'ambulance']) {
      expect(outcomesOf(MIA, WITHOUT, branchKey)).not.toHaveProperty('rule-2');
    }
    // Whatever the city is, every outcome stays the same
    const elsewhere = edited(MIA, CITY_KEY, 'Esslingen');
    expect(outcomesOf(elsewhere, WITHOUT, 'standard')).toEqual(
      outcomesOf(MIA, WITHOUT, 'standard')
    );
    expect(viewOf(elsewhere, WITHOUT, 'ambulance').meets).toBe(true);
    expect(rowsOf(viewOf(elsewhere, WITHOUT, 'standard')).map((row) => row[0])).toEqual([
      'rule-1',
      'rule-3',
      'rule-4',
    ]);
    expect(
      resultsOf([MIA, JONAS, ANNA], WITHOUT)['persona-1']?.standard?.items.map(
        (each) => each.item.id
      )
    ).not.toContain('rule-2');
  });

  it('starts no run, and keeps the city as a value that is never shown', () => {
    const { opened, done } = returnedTo(stateOfExample(), WITHOUT, 3);
    expect(opened.run).toBeNull();
    expect(personasIn(done).map((each) => each.values[CITY_KEY])).toEqual([
      'Stuttgart',
      'stuttgart',
      'Esslingen',
    ]);
    const fields = fieldsOf(WITHOUT);
    expect(shownFieldsOf(personasIn(done)[0], fields).map((each) => each.key)).not.toContain(
      CITY_KEY
    );
  });

  it('brings the earlier value back with the rule, and fills nobody', () => {
    const state = stateOfExample();
    const edited = editedState(state, 1, CITY_KEY, 'Böblingen');
    const away = returnedTo(edited, WITHOUT, 3).done;
    const back = returnedTo(away, EXAMPLE, 7);
    expect(back.opened.run).toBeNull();
    expect(back.done.personas).toBe(edited.personas);
    expect(personasIn(back.done).map((each) => each.values[CITY_KEY])).toEqual([
      'Stuttgart',
      'Böblingen',
      'Esslingen',
    ]);
    expect(fieldsOf(EXAMPLE).map((each) => each.key)).toContain(CITY_KEY);
    expect(outcomesOf(personasIn(back.done)[1], EXAMPLE, 'standard')['rule-2']).toBe('not_met');
    expect(outcomesOf(personasIn(back.done)[0], EXAMPLE, 'standard')['rule-2']).toBe('met');
  });
});

describe('US3-AS4: a branch added has results, a branch deleted has none', () => {
  const SCHOOL = keyed(
    must(
      addRuleToBranch(
        newBranch(STANDARD, 'empty', 'School transport', null),
        rule(5, target('pid', 'birthdate'), { operator: 'at_least_years_ago', years: 22 })
      )
    ),
    'school'
  );
  const WITH_SCHOOL = [...EXAMPLE, SCHOOL];

  it('gives every persona results for the new branch', () => {
    const { opened, done } = returnedTo(stateOfExample(), WITH_SCHOOL, 5);
    expect(opened.run).toBeNull();
    const results = resultsOf(personasIn(done), WITH_SCHOOL);
    for (const id of ['persona-1', 'persona-2', 'persona-3'] as const) {
      expect(Object.keys(results[id] ?? {})).toEqual(['standard', 'ambulance', 'school']);
    }
    expect(viewOf(MIA, WITH_SCHOOL, 'school').meets).toBe(true);
    expect(viewOf(JONAS, WITH_SCHOOL, 'school').meets).toBe(false);
    expect(rowsOf(viewOf(JONAS, WITH_SCHOOL, 'school'))).toEqual([
      ['rule-5', 'not_met', 'You must meet this rule.', true],
    ]);
  });

  it('removes the results of a deleted branch, and selects the first branch again', () => {
    const open = returnedTo(stateOfExample(), WITH_SCHOOL, 5, 'school').opened;
    expect(open.branchKey).toBe('school');
    const deleted = returnedTo(open, EXAMPLE, 5, 'school');
    expect(deleted.opened.branchKey).toBe(STANDARD_KEY);
    const results = resultsOf(personasIn(deleted.done), EXAMPLE);
    for (const id of ['persona-1', 'persona-2', 'persona-3'] as const) {
      expect(Object.keys(results[id] ?? {})).toEqual(['standard', 'ambulance']);
      expect(results[id]?.school).toBeUndefined();
    }
  });
});

describe('EC "A rule that the main branch changes": a based branch’s results follow', () => {
  const ESSLINGEN = mainWith({
    ...CITY,
    condition: { operator: 'equal_to', value: 'Esslingen', match_case: false },
  });
  const CHANGED = afterMainChange(ESSLINGEN);

  it('judges Ambulance’s inherited Rule 02 by the main branch’s new city', () => {
    expect(outcomesOf(MIA, EXAMPLE, 'ambulance')['rule-2']).toBe('met');
    expect(outcomesOf(MIA, CHANGED, 'ambulance')['rule-2']).toBe('not_met');
    expect(outcomesOf(ANNA, EXAMPLE, 'ambulance')['rule-2']).toBe('not_met');
    expect(outcomesOf(ANNA, CHANGED, 'ambulance')['rule-2']).toBe('met');
    expect(viewOf(MIA, CHANGED, 'standard').meets).toBe(false);
    expect(viewOf(MIA, CHANGED, 'ambulance').meets).toBe(false);
  });

  it('keeps the personas as they are, and starts no run', () => {
    const state = stateOfExample();
    const { opened, done } = returnedTo(state, CHANGED, 9);
    expect(opened.run).toBeNull();
    expect(done.personas).toBe(state.personas);
  });

  it('leaves a changed rule of the branch alone: Ambulance keeps its 19 years', () => {
    const lowered = afterMainChange(
      mainWith({ ...AGE, condition: { operator: 'at_least_years_ago', years: 18 } })
    );
    const eighteen = edited(MIA, BIRTH, '2008-10-01');
    expect(outcomesOf(eighteen, lowered, 'standard')['rule-1']).toBe('met');
    expect(outcomesOf(eighteen, lowered, 'ambulance')['rule-1']).toBe('not_met');
  });
});
