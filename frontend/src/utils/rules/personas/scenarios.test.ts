// The spec's scenarios of the personas (specs/004-rule-test-personas, User Story 1's acceptance
// scenarios and the edge cases that a rule set expresses; quickstart §3 and V1; research R14).
//
// Each case builds its rule set with testData.ts' helpers and branches.ts, and goes the way the
// test step goes: the reducer opens the step and starts a run (`personaStateReducer()`), the run is
// answered as the worker answers it (`generatePersonas()` with the request the hook builds), and the
// results are what the step shows (`testResultsOf()`, `resultViewOf()`). Generation runs on a fake
// clock that never reaches the deadline, so every result depends only on the seed, and "across
// seeds" is a loop over `SEEDS`. Hand-made personas pin the exact rows, outcomes and texts.
import { describe, expect, it } from 'vitest';

import type { DocumentField } from '../../../types/document-types';
import type { BranchInput, Condition, RuleItem, RuleTarget } from '../../../types/form-connections';
import { addRuleToBranch, changeItem, newBranch, removeItem } from '../branches';
import { dayNumber, parseDayNumber } from '../checks/calendar';
import { buildCheckedBranch, type KeyedBranch } from '../checks/checkedTree';
import { noticeText } from '../checks/findingMessages';
import { checkBranch } from '../checks/findings';
import type { CheckOptions } from '../checks/types';
import { evaluateBranch } from '../evaluation';
import { mainBranch, MDL, OPTION_SETS, PID, rule, target } from '../testData';
import type { RuleContext } from '../types';
import { applicantOf } from './applicant';
import { generatePersonas } from './generation';
import { goalsOf } from './goals';
import { ageSuffixOf, testDayLineOf } from './messages';
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

/** Today in Germany, as the step names it: "1 Nov 2026" */
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
  'Personal ID – Date of birth (Age)',
  'Personal ID – City or town',
  'Driving licence – Licence classes',
  'Driving licence – Licence class B – Issue date',
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

function fieldsOf(branches: readonly KeyedBranch[]): PersonaField[] {
  return personaFieldsOf(branches, CONTEXT);
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
  today = TODAY
): TestResults {
  return testResultsOf(personas, fieldsOf(branches), branches, CONTEXT, today);
}

/** One persona's result for one branch */
function resultOf(
  subject: Persona,
  branches: readonly KeyedBranch[],
  branchKey: string,
  today = TODAY
): PersonaBranchResult {
  return must(resultsOf([subject], branches, today)[subject.id]?.[branchKey]);
}

/** What the step shows for one persona and one branch */
function viewOf(
  subject: Persona,
  branches: readonly KeyedBranch[],
  branchKey: string,
  today = TODAY
): ResultView {
  const branch = must(branches.find((each) => each.key === branchKey));
  return resultViewOf(
    resultOf(subject, branches, branchKey, today),
    branch,
    subject,
    CONTEXT,
    fieldsOf(branches)
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

// The spec's three applicants (US1's story): a 25-year-old from Stuttgart who has held class B for
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
    expect(fieldsOf(EXAMPLE).map((each) => `${each.documentLabel} – ${each.label}`)).toEqual(
      EXAMPLE_LABELS
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
  it('Mia, 25, from Stuttgart, class B for 6 years: meets both variants', () => {
    for (const branchKey of ['standard', 'ambulance']) {
      const view = viewOf(MIA, EXAMPLE, branchKey);
      expect(view.meets).toBe(true);
      expect(view.heading).toBe('Result: meets the rules');
      expect(view.listHeading).toBe('Rules Mia meets');
      expect(view.messageColumn).toBeNull();
      expect(rowsOf(view)).toEqual([
        ['rule-1', 'met', null, false],
        ['rule-2', 'met', null, false],
        ['rule-3', 'met', null, false],
        ['rule-4', 'met', null, false],
      ]);
      expect(view.failingFields).toEqual([]);
    }
  });

  it('Jonas, 20, from Stuttgart (in lower case), class B for 3 years: meets only Ambulance', () => {
    const standard = viewOf(JONAS, EXAMPLE, 'standard');
    expect(standard.meets).toBe(false);
    expect(standard.heading).toBe('Result: doesn’t meet 1 rule');
    expect(standard.listHeading).toBeNull();
    expect(standard.messageColumn).toBe('Message Jonas reads');
    expect(rowsOf(standard)).toEqual([
      ['rule-1', 'not_met', 'You are too young for this licence.', true],
      ['rule-2', 'met', null, false],
      ['rule-3', 'met', null, false],
      ['rule-4', 'met', null, false],
    ]);
    expect(standard.rows[0].name).toBe('Rule 01');
    expect(standard.rows[0].statement).toBe(
      'Personal ID – Date of birth (Age) is at least 21 years old'
    );
    expect(standard.failingFields).toEqual([BIRTH]);

    const ambulance = viewOf(JONAS, EXAMPLE, 'ambulance');
    expect(ambulance.meets).toBe(true);
    expect(ambulance.heading).toBe('Result: meets the rules');
    expect(ambulance.rows[0].statement).toBe(
      'Personal ID – Date of birth (Age) is at least 19 years old'
    );
  });

  it('Anna, 45, from Esslingen, without class B: meets neither, with three rules reported', () => {
    for (const branchKey of ['standard', 'ambulance']) {
      const view = viewOf(ANNA, EXAMPLE, branchKey);
      expect(view.meets).toBe(false);
      expect(view.heading).toBe('Result: doesn’t meet 3 rules');
      expect(view.messageColumn).toBe('Message Anna reads');
      expect(rowsOf(view)).toEqual([
        ['rule-2', 'not_met', 'You must live in Stuttgart.', true],
        ['rule-3', 'not_met', 'You need a class B licence.', true],
        ['rule-4', 'not_met', 'You must have held class B for at least 2 years.', true],
        ['rule-1', 'met', null, false],
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

  it('the spec’s three applicants show the same pattern', () => {
    expect([MIA, JONAS, ANNA].map((each) => vectorOf(each, EXAMPLE))).toEqual([
      'meet/meet',
      'fail/meet',
      'fail/fail',
    ]);
  });
});

describe('US1-AS4: tested as if shared today', () => {
  it('names today’s date', () => {
    expect(testDayLineOf(TODAY)).toBe('Tested as if shared today, 1 Nov 2026.');
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

        const running = personaStateReducer(before, { type: 'generateOne', slot, now: 1 });
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

describe('EC "A branch that no applicant can meet": no persona meets it', () => {
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
      'No applicant can meet the rules of Ambulance.'
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

describe('EC "A branch that every applicant meets": every persona meets it', () => {
  // "Personal ID – Nationality includes one of" every country (spec 003, FR-006)
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
    expect(noticeText(must(notice), 'Everyone')).toBe(
      'Every applicant meets the rules of Everyone.'
    );
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
      ['rule-1', 'met', null, false],
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
    expect(ageSuffixOf(turning.values[BIRTH], TODAY)).toBe(' (age 21)');
    expect(outcomesOf(turning, EXAMPLE, 'standard')['rule-1']).toBe('met');
    const tomorrow = persona('Lea Fischer', { ...MIA.values, [BIRTH]: '2005-11-02' });
    expect(ageSuffixOf(tomorrow.values[BIRTH], TODAY)).toBe(' (age 20)');
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
      ['rule-1', 'met', null, false],
      ['rule-2', 'met', null, false],
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
      ['rule-1', 'met', null, false],
      ['rule-2', 'met', null, false],
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
        ['rule-3', 'met', null, false],
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
