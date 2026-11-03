import { describe, expect, it } from 'vitest';

import type { BranchInput, RuleItem, RuleTreeItem } from '../../../types/form-connections';
import { addRuleToBranch, changeItem, newBranch } from '../branches';
import { dayNumber, parseDayNumber } from '../checks/calendar';
import type { KeyedBranch } from '../checks/checkedTree';
import {
  checkedBranchOf,
  type GeneratedBranch,
  MAX_TEXT_RULES,
  ORACLE_CONTEXT,
  ORACLE_TODAY,
  ORACLE_TODAY_DAY,
  oracleOf,
  randomBranch,
} from '../checks/testOracle';
import type { CheckOptions } from '../checks/types';
import {
  type Applicant,
  evaluateBranch,
  type EvaluatedBranch,
  type EvaluatedItem,
} from '../evaluation';
import { CONTEXT, mainBranch, OPTION_SETS, rule, target } from '../testData';
import type { RuleContext } from '../types';
import { applicantOf } from './applicant';
import { MAX_AGE, MIN_AGE, PERSONA_IDS } from './constants';
import { checkedBranchesOf, personaFieldsOf } from './fields';
import { generatePersonas } from './generation';
import { nameParts } from './samples';
import type {
  GenerationRequest,
  GenerationResult,
  Persona,
  PersonaField,
  PersonaValue,
  SlotKind,
} from './types';
import { ageOn } from './values';

const TODAY = '2026-11-01';
const SHARED_ON = dayNumber(TODAY);

/** A clock that never reaches the deadline */
const NO_DEADLINE: CheckOptions = { deadline: Number.POSITIVE_INFINITY, now: () => 0 };

const SEEDS = Array.from({ length: 20 }, (_, index) => index + 1);

function must<T>(value: T | null): T {
  if (value === null) {
    throw new Error('expected a result');
  }
  return value;
}

// The spec's example (quickstart §3, "Passenger transport licence"): Standard requires an
// applicant who is at least 21, lives in Stuttgart, holds class B and has held it for at least 2
// years; Ambulance, based on it, lowers the age to 19 (Rule 01)
const AGE = rule(1, target('pid', 'birthdate'), { operator: 'at_least_years_ago', years: 21 });
const CITY = rule(2, target('pid', 'address_locality'), {
  operator: 'equal_to',
  value: 'Stuttgart',
  match_case: false,
});
const CLASS_B = rule(3, target('mdl', 'driving_privileges', 'classes'), {
  operator: 'includes_one_of',
  values: ['B'],
});
const HELD_B = rule(4, target('mdl', 'driving_privileges', 'issue_date', 'B'), {
  operator: 'at_least_years_ago',
  years: 2,
});
const STANDARD = mainBranch([AGE, CITY, CLASS_B, HELD_B]);
const AMBULANCE = must(
  changeItem(STANDARD, newBranch(STANDARD, 'based', 'Ambulance', null), {
    ...AGE,
    condition: { operator: 'at_least_years_ago', years: 19 },
  })
);
const EXAMPLE: KeyedBranch[] = [keyed(STANDARD, 'standard'), keyed(AMBULANCE, 'ambulance')];

// Rules on many kinds of field, none on an age: every value stays plausible
const MANY_KINDS = [
  keyed(
    mainBranch([
      rule(11, target('pid', 'address_locality'), { operator: 'equal_to', value: 'Stuttgart' }),
      rule(12, target('pid', 'nationalities'), { operator: 'includes_one_of', values: ['DE'] }),
      rule(13, target('pid', 'sex'), { operator: 'includes_one_of', values: [2] }),
      rule(14, target('mdl', 'height'), { operator: 'greater_than', value: 170 }),
      rule(15, target('mdl', 'driving_privileges', 'classes'), {
        operator: 'includes_one_of',
        values: ['C'],
      }),
      rule(16, target('mdl', 'driving_privileges', 'expiry_date', 'C'), {
        operator: 'at_least_from_now',
        amount: 6,
        unit: 'months',
      }),
      rule(17, target('pid', 'date_of_expiry'), {
        operator: 'at_least_from_now',
        amount: 1,
        unit: 'years',
      }),
      rule(18, target('pid', 'date_of_issuance'), { operator: 'before', date: '2024-01-01' }),
      rule(19, target('mdl', 'birth_date'), { operator: 'before', date: '1990-01-01' }),
      rule(20, target('pid', 'birthdate'), { operator: 'after', date: '1960-01-01' }),
      rule(21, target('mdl', 'eye_colour'), { operator: 'includes_one_of', values: ['blue'] }),
    ]),
    'many'
  ),
];

function keyed(branch: BranchInput, key: string): BranchInput & KeyedBranch {
  return { ...branch, key };
}

/** A request for `branches`: three free slots unless said otherwise */
function requestOf(
  branches: readonly KeyedBranch[],
  seed: number,
  slots: GenerationRequest['slots'] = [0, 1, 2].map(() => ({
    kind: 'free',
    name: null,
    values: {},
  }))
): GenerationRequest {
  return {
    seed,
    today: TODAY,
    branches: checkedBranchesOf(branches, CONTEXT, TODAY),
    fields: personaFieldsOf(branches, CONTEXT),
    context: CONTEXT,
    slots,
  };
}

/** The personas after the answer, as the reducer writes it (`runSucceeded`) */
function personasOf(request: GenerationRequest, result: GenerationResult): Persona[] {
  return request.slots.map((slot, index) => {
    const answer = result.slots[index];
    const values =
      slot.kind === 'kept'
        ? slot.values
        : slot.kind === 'filled'
          ? { ...slot.values, ...answer.values }
          : { ...answer.values };
    return {
      id: PERSONA_IDS[index],
      name: slot.name ?? must(answer.name),
      values,
      generated: values,
      status: 'ready',
    };
  });
}

/** Three personas generated for `branches` with `seed` */
function generated(branches: readonly KeyedBranch[], seed: number): Persona[] {
  const request = requestOf(branches, seed);
  return personasOf(request, generatePersonas(request, NO_DEADLINE));
}

/** Whether the persona meets the branch, as the evaluator decides */
function meets(persona: Persona, branch: KeyedBranch, fields: readonly PersonaField[]): boolean {
  return evaluateBranch(branch, applicantOf(persona, fields), SHARED_ON, CONTEXT).met;
}

/** Each item's outcome in the branch, by id, top level and members */
function itemOutcomes(
  persona: Persona,
  branch: KeyedBranch,
  fields: readonly PersonaField[]
): Record<string, boolean> {
  const outcomes: Record<string, boolean> = {};
  const walk = (items: ReturnType<typeof evaluateBranch>['items']) => {
    for (const { item, outcome, members } of items) {
      outcomes[item.id] = outcome === 'met';
      walk(members);
    }
  };
  walk(evaluateBranch(branch, applicantOf(persona, fields), SHARED_ON, CONTEXT).items);
  return outcomes;
}

const SET_CODES: Record<string, (string | number)[]> = Object.fromEntries(
  OPTION_SETS.map((set) => [set.key, set.options.map((option) => option.value)])
);

function isOfKind(each: PersonaField, value: PersonaValue | undefined): boolean {
  switch (each.kind) {
    case 'number':
      return typeof value === 'number' && Number.isInteger(value) && value >= 0;
    case 'text':
      return typeof value === 'string' && value.trim() !== '';
    case 'date':
      return parseDayNumber(value) !== null;
    case 'enum': {
      const codes = SET_CODES[each.optionSet ?? ''] ?? [];
      if (!each.multiple) {
        return value !== null && !Array.isArray(value) && codes.includes(value as string | number);
      }
      return (
        Array.isArray(value) &&
        value.length > 0 &&
        value.every((code: string | number) => codes.includes(code))
      );
    }
  }
}

function expectValid(personas: readonly Persona[], fields: readonly PersonaField[]): void {
  for (const persona of personas) {
    expect(Object.keys(persona.values).sort()).toEqual(fields.map((each) => each.key).sort());
    for (const each of fields) {
      expect(isOfKind(each, persona.values[each.key]), `${each.key} of ${persona.name}`).toBe(true);
    }
  }
}

describe('generatePersonas: the answer', () => {
  it('reads rule sets whose every rule is checked (the fixtures are complete)', () => {
    for (const branches of [EXAMPLE, MANY_KINDS]) {
      for (const { checked } of requestOf(branches, 1).branches) {
        expect(checked.leftOut).toEqual([]);
      }
    }
  });

  it('answers each slot in persona order, a free one with every field and its name drawn', () => {
    const request = requestOf(EXAMPLE, 1);
    const result = generatePersonas(request, NO_DEADLINE);
    expect(result.slots).toHaveLength(3);
    for (const slot of result.slots) {
      expect(Object.keys(slot.values).sort()).toEqual(request.fields.map((f) => f.key).sort());
      expect(slot.name).toMatch(/^\S+ \S.*$/);
    }
  });

  it('gives every value of its field’s kind', () => {
    for (const branches of [EXAMPLE, MANY_KINDS]) {
      const fields = personaFieldsOf(branches, CONTEXT);
      for (const seed of SEEDS) {
        expectValid(generated(branches, seed), fields);
      }
    }
  });

  it('draws names that differ in given and family name, and keeps a name it is given', () => {
    for (const seed of SEEDS) {
      const personas = generated(EXAMPLE, seed);
      const parts = personas.map((persona) => nameParts(persona.name));
      expect(new Set(parts.map((part) => part.given)).size).toBe(3);
      expect(new Set(parts.map((part) => part.family)).size).toBe(3);
    }
    const first = generated(EXAMPLE, 7);
    const request = requestOf(EXAMPLE, 8, [
      { kind: 'kept', name: first[0].name, values: first[0].values },
      { kind: 'free', name: first[1].name, values: first[1].values },
      { kind: 'kept', name: first[2].name, values: first[2].values },
    ]);
    const result = generatePersonas(request, NO_DEADLINE);
    expect(result.slots.map((slot) => slot.name)).toEqual([null, null, null]);
  });

  it('draws a name unlike the names the request carries', () => {
    const first = generated(EXAMPLE, 3);
    for (const seed of SEEDS) {
      const request = requestOf(EXAMPLE, seed, [
        { kind: 'kept', name: first[0].name, values: first[0].values },
        { kind: 'kept', name: first[1].name, values: first[1].values },
        { kind: 'free', name: null, values: {} },
      ]);
      const drawn = nameParts(must(generatePersonas(request, NO_DEADLINE).slots[2].name));
      for (const kept of first.slice(0, 2).map((persona) => nameParts(persona.name))) {
        expect(drawn.given).not.toBe(kept.given);
        expect(drawn.family).not.toBe(kept.family);
      }
    }
  });

  it('gives equal results for equal seeds, and different ones for different seeds', () => {
    const answers = SEEDS.map((seed) =>
      JSON.stringify(generatePersonas(requestOf(EXAMPLE, seed), NO_DEADLINE))
    );
    expect(JSON.stringify(generatePersonas(requestOf(EXAMPLE, 1), NO_DEADLINE))).toBe(answers[0]);
    expect(new Set(answers).size).toBe(SEEDS.length);
  });

  it('changes nothing of the request', () => {
    const request = requestOf(EXAMPLE, 5);
    const before = JSON.stringify(request);
    generatePersonas(request, NO_DEADLINE);
    expect(JSON.stringify(request)).toBe(before);
  });
});

describe('generatePersonas: plausible values (FR-010)', () => {
  it('keeps ages 18 to 80, agreeing dates of birth, and issue and expiry dates in order', () => {
    const fields = personaFieldsOf(EXAMPLE, CONTEXT);
    for (const seed of SEEDS) {
      for (const persona of generated(EXAMPLE, seed)) {
        const age = must(ageOn(persona.values['pid.birthdate'], TODAY));
        expect(age).toBeGreaterThanOrEqual(MIN_AGE);
        expect(age).toBeLessThanOrEqual(MAX_AGE);
        const birth = must(parseDayNumber(persona.values['pid.birthdate']));
        const issued = must(parseDayNumber(persona.values['mdl.driving_privileges.issue_date#B']));
        expect(issued).toBeGreaterThanOrEqual(birth);
        expect(issued).toBeLessThanOrEqual(SHARED_ON);
      }
    }
    expect(fields.some((each) => each.key === 'pid.birthdate')).toBe(true);
  });

  it('agrees across the documents where no rule needs otherwise', () => {
    const branches = [
      keyed(
        mainBranch([
          rule(1, target('pid', 'address_locality'), { operator: 'equal_to', value: 'Ulm' }),
          rule(2, target('pid', 'birthdate'), { operator: 'before', date: '1990-01-01' }),
          rule(3, target('mdl', 'birth_date'), { operator: 'before', date: '1990-01-01' }),
          rule(4, target('pid', 'date_of_issuance'), { operator: 'before', date: '2020-01-01' }),
          rule(5, target('pid', 'date_of_expiry'), { operator: 'before', date: '2030-01-01' }),
        ]),
        'dates'
      ),
    ];
    for (const seed of SEEDS) {
      for (const persona of generated(branches, seed)) {
        const { values } = persona;
        expect(values['mdl.birth_date']).toBe(values['pid.birthdate']);
        const issued = must(parseDayNumber(values['pid.date_of_issuance']));
        expect(issued).toBeGreaterThanOrEqual(must(parseDayNumber(values['pid.birthdate'])));
        expect(must(parseDayNumber(values['pid.date_of_expiry']))).toBeGreaterThanOrEqual(issued);
      }
    }
  });

  it('gives an unlikely age only when a goal needs it', () => {
    // "Date of birth is less than 16 years ago": meeting it needs someone younger than 18
    const young = rule(1, target('pid', 'birthdate'), {
      operator: 'less_than_years_ago',
      years: 16,
    });
    const branches = [keyed(mainBranch([young]), 'young')];
    for (const seed of SEEDS) {
      const ages = generated(branches, seed).map((persona) =>
        must(ageOn(persona.values['pid.birthdate'], TODAY))
      );
      expect(ages.filter((age) => age < 16)).not.toHaveLength(0);
      expect(ages.filter((age) => age >= MIN_AGE && age <= MAX_AGE)).not.toHaveLength(0);
      expect(ages.every((age) => age >= 0 && age <= MAX_AGE)).toBe(true);
    }
  });
});

describe('generatePersonas: goals (FR-011)', () => {
  const fields = personaFieldsOf(EXAMPLE, CONTEXT);
  const vectorOf = (persona: Persona) =>
    EXAMPLE.map((branch) => (meets(persona, branch, fields) ? 'meet' : 'fail')).join('/');

  it('gives the spec’s example one persona per realizable vector (US1-AS3)', () => {
    for (const seed of SEEDS) {
      const vectors = generated(EXAMPLE, seed).map(vectorOf).sort();
      expect(vectors).toEqual(['fail/fail', 'fail/meet', 'meet/meet']);
    }
  });

  it('meets and fails every rule of the spec’s example (goal 4)', () => {
    for (const seed of SEEDS) {
      const personas = generated(EXAMPLE, seed);
      for (const branch of EXAMPLE) {
        const outcomes = personas.map((persona) => itemOutcomes(persona, branch, fields));
        for (const id of Object.keys(outcomes[0])) {
          const met = outcomes.map((each) => each[id]);
          expect(met, `${branch.key} ${id}, seed ${seed}`).toContain(true);
          expect(met, `${branch.key} ${id}, seed ${seed}`).toContain(false);
        }
      }
    }
  });

  it('meets and fails a group and each of its members (goal 4, implied targets)', () => {
    // Meeting the group implies meeting both members, and failing a member implies failing the
    // group: generation reads these from pairs of targets, so the three personas still cover all
    const group: RuleTreeItem = {
      type: 'group',
      id: 'group-1',
      name: 'Group 01',
      mark: null,
      operator: 'and',
      message: null,
      items: [
        rule(31, target('mdl', 'height'), { operator: 'greater_than', value: 180 }),
        rule(32, target('pid', 'date_of_issuance'), { operator: 'before', date: '2024-01-01' }),
      ],
    };
    const city = rule(33, target('pid', 'address_locality'), {
      operator: 'equal_to',
      value: 'Stuttgart',
    });
    const branch = keyed(mainBranch([group, city]), 'grouped');
    const groupFields = personaFieldsOf([branch], CONTEXT);
    for (const seed of SEEDS) {
      const outcomes = generated([branch], seed).map((persona) =>
        itemOutcomes(persona, branch, groupFields)
      );
      for (const id of ['group-1', 'rule-31', 'rule-32', 'rule-33']) {
        const met = outcomes.map((each) => each[id]);
        expect(met, `${id}, seed ${seed}`).toContain(true);
        expect(met, `${id}, seed ${seed}`).toContain(false);
      }
    }
  });

  it('meets a branch without rules with everyone and fails none it can’t', () => {
    const empty = keyed({ ...mainBranch([]), name: 'School transport' }, 'empty');
    const never = keyed(
      mainBranch([
        rule(5, target('mdl', 'height'), { operator: 'greater_than', value: 190 }),
        rule(6, target('mdl', 'height'), { operator: 'less_than', value: 180 }),
      ]),
      'never'
    );
    const branches = [empty, never];
    const allFields = personaFieldsOf(branches, CONTEXT);
    for (const seed of SEEDS.slice(0, 5)) {
      for (const persona of generated(branches, seed)) {
        expect(meets(persona, empty, allFields)).toBe(true);
        expect(meets(persona, never, allFields)).toBe(false);
      }
    }
  });

  it('plans a free slot around the kept ones (FR-012)', () => {
    for (const seed of SEEDS.slice(0, 10)) {
      const first = generated(EXAMPLE, seed);
      const kinds: SlotKind[] = first.map((persona) =>
        vectorOf(persona) === 'fail/fail' ? 'free' : 'kept'
      );
      const request = requestOf(
        EXAMPLE,
        seed + 100,
        first.map((persona, index) => ({
          kind: kinds[index],
          name: persona.name,
          values: persona.values,
        }))
      );
      const result = generatePersonas(request, NO_DEADLINE);
      const personas = personasOf(request, result);
      kinds.forEach((kind, index) => {
        if (kind === 'kept') {
          expect(result.slots[index]).toEqual({ values: {}, name: null });
          expect(personas[index].values).toBe(first[index].values);
        } else {
          expect(vectorOf(personas[index])).toBe('fail/fail');
          expect(personas[index].values).not.toEqual(first[index].values);
        }
      });
    }
  });

  it('keeps a kept slot’s hidden values out of the answer', () => {
    const first = generated(EXAMPLE, 2);
    const hidden = { ...first[0].values, 'pid.family_name': 'Muster' };
    const request = requestOf(EXAMPLE, 9, [
      { kind: 'kept', name: first[0].name, values: hidden },
      { kind: 'free', name: first[1].name, values: first[1].values },
      { kind: 'free', name: first[2].name, values: first[2].values },
    ]);
    const result = generatePersonas(request, NO_DEADLINE);
    expect(result.slots[0]).toEqual({ values: {}, name: null });
    expect(result.slots[1].values).not.toHaveProperty('pid.family_name');
  });
});

describe('generatePersonas: the deadline (FR-013)', () => {
  it('returns the valid fallback set when the deadline has passed already', () => {
    const request = requestOf(MANY_KINDS, 4);
    const result = generatePersonas(request, { deadline: 0, now: () => 1 });
    expectValid(personasOf(request, result), request.fields);
  });

  it('returns valid personas when the clock passes the deadline during the run', () => {
    for (const reads of [1, 5, 20, 80, 300, 1000]) {
      let clock = 0;
      const request = requestOf([...EXAMPLE, ...MANY_KINDS], reads);
      const result = generatePersonas(request, { deadline: reads, now: () => (clock += 1) });
      expectValid(personasOf(request, result), request.fields);
    }
  });

  it('gives the same answer for the same seed and the same fake clock', () => {
    const answer = () => {
      let clock = 0;
      return JSON.stringify(
        generatePersonas(requestOf(EXAMPLE, 6), { deadline: 150, now: () => (clock += 1) })
      );
    };
    expect(answer()).toBe(answer());
  });
});

describe('generatePersonas: a request with a missing rule', () => {
  it('throws, so that the worker’s error reaches the page', () => {
    const request = requestOf(EXAMPLE, 1);
    const broken: GenerationRequest = {
      ...request,
      branches: request.branches.map((branch) => ({
        ...branch,
        rules: {} as Record<string, RuleItem>,
      })),
    };
    expect(() => generatePersonas(broken, NO_DEADLINE)).toThrow();
  });
});

// The oracle catalogue (SC-002; research R14; tasks.md T020)
//
// Rule sets of one to three of `checks/testOracle.ts`'s seeded random branches, each sharing a
// variable with a branch before it. For each, the oracle enumerates every applicant of its domain
// (`oracleOf().applicantsOn()`) on a branch that holds every branch's rules, so that the domain
// covers every constant of every branch, and evaluates each branch on each applicant. That gives
// the realizable vectors (which branches an applicant meets), the targets of goals 1 to 3, the best
// score three personas can reach, and the items applicants can both meet and fail, with no solver
// involved. Then 20 generations with different seeds must each reach that score when it covers
// every target, and across the catalogue at least 90 % of the items applicants can both meet and
// fail must be met by one persona and failed by another (SC-002).
//
// The targets are counted per branch, where generation counts per class of branches with the same
// formula: a score that covers every target is the same in both counts, which is what SC-002 asks.
// The clock never reaches the deadline, so every result comes from `MAX_RESTARTS_WITHOUT_GAIN`
// and full coverage, never from the machine's speed.

/** Rule sets in the catalogue: at least several hundred (SC-002) */
const CATALOGUE_SIZE = 300;

/**
 * The branches of rule set i: `BRANCH_COUNTS[i % 6]`, so half the rule sets have one branch, a
 * third two and a sixth three. Twenty generations for two or three branches take about 0.2 to
 * 0.3 s, three times as long as for one, since goal 4 more often can't be covered in full and a
 * run then ends only after `MAX_RESTARTS_WITHOUT_GAIN` restarts: this mix keeps the file's time
 * reasonable
 */
const BRANCH_COUNTS = [1, 1, 1, 2, 2, 3];

/**
 * The most rules a rule set counts across its branches, for the same reason: a generation's time
 * grows with the rules. SC-002's limit of 20 per branch is performance.test.ts's subject
 */
const MOST_SET_RULES = 10;

/** The fewest rules of a branch of `randomBranch()` */
const FEWEST_RULES = 2;

/** Seeds tried in a row for a rule set's next branch before the rule set starts over */
const MOST_CATALOGUE_MISSES = 100;

/** A bound on the seeds the catalogue reads, so that a mistake fails instead of looping */
const MOST_CATALOGUE_SEEDS = 100_000;

/** Rule sets per `it`, so that each block stays within its timeout on a loaded machine */
const CATALOGUE_CHUNK = 50;

/** Generations per rule set, each with its own seed (SC-002) */
const GENERATIONS = 20;

/** The least share of items applicants can both meet and fail that are covered both ways */
const MIN_ITEM_COVERAGE = 0.9;

/**
 * Time for one chunk of the catalogue: 5 to 8 s each, the whole file 45 to 55 s, on four cores
 * shared with other test runs; 16 s for a chunk at the worst seen
 */
const CHUNK_TIMEOUT_MS = 120_000;

/** One rule set of the catalogue */
interface RuleSet {
  /** Its place in the catalogue, from 0 */
  index: number;
  /** One to three seeded random branches, in tab order */
  branches: GeneratedBranch[];
}

/** A target of goals 1 to 3 (FR-011), by branch index */
type VectorTarget = { goal: 1 | 2; branch: number } | { goal: 3; a: number; b: number };

/** One applicant's or persona's outcomes: met per branch, and per branch each item's by id */
interface RuleSetOutcome {
  vector: boolean[];
  items: Record<string, boolean>[];
}

/** What the oracle finds for a rule set */
interface OracleAnswer {
  /** The realizable vectors, by `vectorKeyOf()` */
  vectors: Map<string, boolean[]>;
  targets: VectorTarget[];
  /** Per goal 1 to 3: the targets */
  full: number[];
  /** Per goal 1 to 3: the best score of three personas, compared goal by goal */
  best: number[];
  /** Per branch: the ids of the items some applicant meets and another fails */
  twoWay: string[][];
}

/** A vector as `m` (meets) and `f` (fails) per branch */
function vectorKeyOf(vector: readonly boolean[]): string {
  return vector.map((meet) => (meet ? 'm' : 'f')).join('');
}

/** The rules of a branch that count, as the evaluator takes them */
function countedRulesOf(branch: EvaluatedBranch): RuleItem[] {
  const rules: RuleItem[] = [];
  const walk = (items: readonly EvaluatedItem[]) => {
    for (const { item, members } of items) {
      if (item.type === 'rule') {
        rules.push(item);
      }
      walk(members);
    }
  };
  walk(evaluateBranch(branch, {}, ORACLE_TODAY_DAY, ORACLE_CONTEXT).items);
  return rules;
}

/** The variables a branch's checked tree reads */
function variablesOf(branch: GeneratedBranch): string[] {
  return Object.keys(checkedBranchOf(branch).variables);
}

let catalogueMemo: RuleSet[] | null = null;

/**
 * The catalogue: rule set i has `BRANCH_COUNTS[i % 6]` branches, the next seeds of
 * `randomBranch()` that share a variable with a branch already in the set, keep the set within the
 * oracle's texts (`MAX_TEXT_RULES` on the family name across the set) and within
 * `MOST_SET_RULES`. Built once
 */
function catalogue(): RuleSet[] {
  if (catalogueMemo) {
    return catalogueMemo;
  }
  const sets: RuleSet[] = [];
  let seed = 1;
  for (let index = 0; index < CATALOGUE_SIZE; index += 1) {
    const branches: GeneratedBranch[] = [];
    const variables = new Set<string>();
    const count = BRANCH_COUNTS[index % BRANCH_COUNTS.length];
    let misses = 0;
    while (branches.length < count) {
      if (misses === MOST_CATALOGUE_MISSES) {
        // No branch fits the ones chosen (two text rules and nothing else, say): start over
        branches.length = 0;
        variables.clear();
        misses = 0;
      }
      if (seed > MOST_CATALOGUE_SEEDS) {
        throw new Error(`The catalogue ran out of seeds at rule set ${index}`);
      }
      const candidate = randomBranch(seed);
      seed += 1;
      misses += 1;
      const own = variablesOf(candidate);
      const rules = [...branches, candidate].flatMap(countedRulesOf);
      const texts = rules.filter((each) => each.target?.field === 'family_name').length;
      if (
        (branches.length > 0 && !own.some((key) => variables.has(key))) ||
        texts > MAX_TEXT_RULES ||
        // Room for the branches still to come, of two rules at least each
        rules.length + FEWEST_RULES * (count - branches.length - 1) > MOST_SET_RULES
      ) {
        continue;
      }
      branches.push(candidate);
      own.forEach((key) => variables.add(key));
      misses = 0;
    }
    sets.push({ index, branches });
  }
  catalogueMemo = sets;
  return sets;
}

/** A rule set's branches by seed, to replay one with `randomBranch(seed)` */
function labelOf(set: RuleSet): string {
  return `rule set ${set.index} (branch seeds ${set.branches.map((each) => each.seed).join(', ')})`;
}

/** Which branches the applicant meets, and each item's outcome, on the given day */
function ruleSetOutcomeOf(
  branches: readonly EvaluatedBranch[],
  applicant: Applicant,
  day: number,
  context: RuleContext
): RuleSetOutcome {
  const outcome: RuleSetOutcome = { vector: [], items: [] };
  for (const branch of branches) {
    const evaluation = evaluateBranch(branch, applicant, day, context);
    const items: Record<string, boolean> = {};
    const walk = (level: readonly EvaluatedItem[]) => {
      for (const { item, outcome: itemOutcome, members } of level) {
        items[item.id] = itemOutcome === 'met';
        walk(members);
      }
    };
    walk(evaluation.items);
    outcome.vector.push(evaluation.met);
    outcome.items.push(items);
  }
  return outcome;
}

/** Goals 1 to 3's targets for these realizable vectors of `count` branches (FR-011) */
function vectorTargetsOf(vectors: readonly (readonly boolean[])[], count: number): VectorTarget[] {
  const targets: VectorTarget[] = [];
  for (let branch = 0; branch < count; branch += 1) {
    if (vectors.some((vector) => vector[branch])) {
      targets.push({ goal: 1, branch });
    }
  }
  for (let branch = 0; branch < count; branch += 1) {
    if (vectors.some((vector) => !vector[branch])) {
      targets.push({ goal: 2, branch });
    }
  }
  for (let a = 0; a < count; a += 1) {
    for (let b = a + 1; b < count; b += 1) {
      if (vectors.some((vector) => vector[a] !== vector[b])) {
        targets.push({ goal: 3, a, b });
      }
    }
  }
  return targets;
}

/** Targets covered per goal 1 to 3 by personas with these vectors */
function vectorScoreOf(
  targets: readonly VectorTarget[],
  vectors: readonly (readonly boolean[])[]
): number[] {
  const score = [0, 0, 0];
  for (const each of targets) {
    const covered = vectors.some((vector) =>
      each.goal === 3
        ? vector[each.a] !== vector[each.b]
        : vector[each.branch] === (each.goal === 1)
    );
    score[each.goal - 1] += covered ? 1 : 0;
  }
  return score;
}

/** Positive when score a is better, goal by goal */
function compared(a: readonly number[], b: readonly number[]): number {
  const goal = a.findIndex((covered, index) => covered !== b[index]);
  return goal < 0 ? 0 : a[goal] - b[goal];
}

/** The best score of three personas over the realizable vectors: every triple, by brute force */
function bestScoreOf(targets: readonly VectorTarget[], vectors: readonly boolean[][]): number[] {
  let best = [-1, -1, -1];
  for (const first of vectors) {
    for (const second of vectors) {
      for (const third of vectors) {
        const score = vectorScoreOf(targets, [first, second, third]);
        best = compared(score, best) > 0 ? score : best;
      }
    }
  }
  return best;
}

const oracleAnswers = new Map<number, OracleAnswer>();

/**
 * The oracle's answer for a rule set: every applicant of the domain of a branch that holds every
 * branch's rules (renamed apart, combined with AND, which only the domain reads), each branch
 * evaluated on each of them. Kept per rule set
 */
function oracleAnswerOf(set: RuleSet): OracleAnswer {
  const known = oracleAnswers.get(set.index);
  if (known) {
    return known;
  }
  const domain = {
    key: labelOf(set),
    origin: 'main' as const,
    operator: 'and' as const,
    items: set.branches.flatMap((branch, at) =>
      countedRulesOf(branch).map((each) => ({ ...each, id: `b${at}-${each.id}`, mark: null }))
    ),
  };
  const vectors = new Map<string, boolean[]>();
  const met = set.branches.map(() => new Set<string>());
  const failed = set.branches.map(() => new Set<string>());
  for (const applicant of oracleOf(domain).applicantsOn(ORACLE_TODAY_DAY)) {
    const outcome = ruleSetOutcomeOf(set.branches, applicant, ORACLE_TODAY_DAY, ORACLE_CONTEXT);
    vectors.set(vectorKeyOf(outcome.vector), outcome.vector);
    outcome.items.forEach((items, at) => {
      for (const [id, isMet] of Object.entries(items)) {
        (isMet ? met : failed)[at].add(id);
      }
    });
  }
  const targets = vectorTargetsOf([...vectors.values()], set.branches.length);
  const answer: OracleAnswer = {
    vectors,
    targets,
    full: [1, 2, 3].map((goal) => targets.filter((each) => each.goal === goal).length),
    best: bestScoreOf(targets, [...vectors.values()]),
    twoWay: met.map((ids, at) => [...ids].filter((id) => failed[at].has(id))),
  };
  oracleAnswers.set(set.index, answer);
  return answer;
}

/** Whether three personas can reach goals 1 to 3 for the rule set */
function reachable(answer: OracleAnswer): boolean {
  return compared(answer.best, answer.full) === 0;
}

/** Three personas generated with `seed` for `branches`, and their outcomes on today */
function generatedOutcomes(
  branches: readonly KeyedBranch[],
  context: RuleContext,
  today: string,
  seed: number
): RuleSetOutcome[] {
  const request: GenerationRequest = {
    seed,
    today,
    branches: checkedBranchesOf(branches, context, today),
    fields: personaFieldsOf(branches, context),
    context,
    slots: [0, 1, 2].map(() => ({ kind: 'free', name: null, values: {} })),
  };
  return personasOf(request, generatePersonas(request, NO_DEADLINE)).map((persona) =>
    ruleSetOutcomeOf(branches, applicantOf(persona, request.fields), dayNumber(today), context)
  );
}

/** Two-way items of a set's branches, and how many of them each generation covered both ways */
interface Coverage {
  coverable: number;
  covered: number;
}

/** Each item of `twoWay` (per branch) that a persona meets and another fails, counted */
function coverageOf(twoWay: readonly string[][], outcomes: readonly RuleSetOutcome[]): Coverage {
  let covered = 0;
  twoWay.forEach((ids, at) => {
    for (const id of ids) {
      const met = outcomes.map((outcome) => outcome.items[at][id] === true);
      covered += met.includes(true) && met.includes(false) ? 1 : 0;
    }
  });
  return { coverable: twoWay.flat().length, covered };
}

/**
 * Runs the generations of one rule set: every persona's vector is one the oracle finds, each
 * generation reaches the oracle's best score when it covers every target of goals 1 to 3, and the
 * items covered both ways are counted
 */
function checkRuleSet(set: RuleSet): Coverage {
  const answer = oracleAnswerOf(set);
  const total: Coverage = { coverable: 0, covered: 0 };
  for (let generation = 0; generation < GENERATIONS; generation += 1) {
    const seed = set.index * GENERATIONS + generation + 1;
    const where = `${labelOf(set)}, generation seed ${seed}`;
    const outcomes = generatedOutcomes(set.branches, ORACLE_CONTEXT, ORACLE_TODAY, seed);
    for (const { vector } of outcomes) {
      expect(answer.vectors.has(vectorKeyOf(vector)), `${where}: ${vectorKeyOf(vector)}`).toBe(
        true
      );
    }
    if (reachable(answer)) {
      const score = vectorScoreOf(
        answer.targets,
        outcomes.map((outcome) => outcome.vector)
      );
      expect(score, `${where}: goals 1 to 3`).toEqual(answer.best);
    }
    const { coverable, covered } = coverageOf(answer.twoWay, outcomes);
    total.coverable += coverable;
    total.covered += covered;
  }
  return total;
}

describe(`generatePersonas against the oracle, ${CATALOGUE_SIZE} rule sets (SC-002)`, () => {
  it(
    'builds a catalogue of one to three branches over shared variables, with every kind of goal',
    () => {
      const sets = catalogue();
      expect(sets).toHaveLength(CATALOGUE_SIZE);
      const answers = sets.map(oracleAnswerOf);
      const share = (test: (answer: OracleAnswer, set: RuleSet) => boolean) =>
        sets.filter((set, index) => test(answers[index], set)).length / CATALOGUE_SIZE;
      for (const count of [1, 2, 3]) {
        const planned =
          BRANCH_COUNTS.filter((each) => each === count).length / BRANCH_COUNTS.length;
        expect(share((_, set) => set.branches.length === count)).toBeCloseTo(planned, 2);
      }
      // Rule sets with a branch no applicant meets, one every applicant meets, branches that
      // differ in every way, and items applicants can meet and fail
      expect(share((answer, set) => answer.full[0] < set.branches.length)).toBeGreaterThan(0.05);
      expect(share((answer, set) => answer.full[1] < set.branches.length)).toBeGreaterThan(0.05);
      expect(share((answer) => answer.vectors.size >= 4)).toBeGreaterThan(0.1);
      expect(share((answer) => answer.twoWay.flat().length > 0)).toBeGreaterThan(0.5);
      expect(share(reachable)).toBeGreaterThan(0.5);
    },
    CHUNK_TIMEOUT_MS
  );

  for (let from = 0; from < CATALOGUE_SIZE; from += CATALOGUE_CHUNK) {
    const to = Math.min(from + CATALOGUE_CHUNK, CATALOGUE_SIZE);
    it(
      `reaches the oracle’s best score for goals 1 to 3 and covers the items, rule sets ${from} to ${to - 1}`,
      () => {
        const total: Coverage = { coverable: 0, covered: 0 };
        for (const set of catalogue().slice(from, to)) {
          const { coverable, covered } = checkRuleSet(set);
          total.coverable += coverable;
          total.covered += covered;
        }
        // Every chunk holds the share, so the whole catalogue does
        expect(total.covered / total.coverable).toBeGreaterThanOrEqual(MIN_ITEM_COVERAGE);
      },
      CHUNK_TIMEOUT_MS
    );
  }
});

// The hand-written catalogue (research R14): the spec's example and its variants, on the catalog
// of `testData.ts`, with the realizable vectors worked out by hand. Every rule of these rule sets
// can be met and failed on its own, so goal 4 asks every item to be met and failed

/** A main branch like Standard, with Rule 01 at another age */
function standardAt(years: number): BranchInput {
  return mainBranch([
    { ...AGE, condition: { operator: 'at_least_years_ago', years } },
    CITY,
    CLASS_B,
    HELD_B,
  ]);
}

/** A branch based on `main` with Rule 01 at another age */
function basedAt(main: BranchInput, name: string, years: number): BranchInput {
  return must(
    changeItem(main, newBranch(main, 'based', name, null), {
      ...AGE,
      condition: { operator: 'at_least_years_ago', years },
    })
  );
}

/** Based on Standard, with a rule no applicant meets together with Rule 01: younger than 21 */
const NIGHT_SHIFTS = must(
  addRuleToBranch(
    newBranch(STANDARD, 'based', 'Night shifts', null),
    rule(5, target('pid', 'birthdate'), { operator: 'less_than_years_ago', years: 21 })
  )
);

/** Every applicant meets it: at least 21 years old, or younger */
const DAY_TRIPS: BranchInput = {
  ...newBranch(STANDARD, 'empty', 'Day trips', null),
  operator: 'or',
  items: [
    rule(6, target('pid', 'birthdate'), { operator: 'at_least_years_ago', years: 21 }),
    rule(7, target('pid', 'birthdate'), { operator: 'less_than_years_ago', years: 21 }),
  ],
};

/** A hand-written rule set, with its realizable vectors in tab order (`vectorKeyOf()`) */
interface HandRuleSet {
  name: string;
  branches: KeyedBranch[];
  realizable: string[];
}

const HAND_CATALOGUE: HandRuleSet[] = [
  {
    name: 'the spec’s example, Ambulance at 19',
    branches: EXAMPLE,
    realizable: ['mm', 'fm', 'ff'],
  },
  {
    name: 'the ages swapped, Ambulance at 21 and Standard at 19 (SC-004)',
    branches: [
      keyed(standardAt(19), 'standard'),
      keyed(basedAt(standardAt(19), 'Ambulance', 21), 'ambulance'),
    ],
    realizable: ['mm', 'mf', 'ff'],
  },
  {
    name: 'Ambulance at 21, which is Standard: one class',
    branches: [keyed(STANDARD, 'standard'), keyed(basedAt(STANDARD, 'Ambulance', 21), 'ambulance')],
    realizable: ['mm', 'ff'],
  },
  {
    name: 'with a variant no applicant can meet',
    branches: [...EXAMPLE, keyed(NIGHT_SHIFTS, 'night')],
    realizable: ['mmf', 'fmf', 'fff'],
  },
  {
    name: 'with a variant every applicant meets',
    branches: [...EXAMPLE, keyed(DAY_TRIPS, 'day')],
    realizable: ['mmm', 'fmm', 'ffm'],
  },
];

describe('generatePersonas: the spec’s example and its variants (SC-002)', () => {
  it('reads rule sets whose every rule is checked', () => {
    for (const { branches } of HAND_CATALOGUE) {
      for (const { checked } of checkedBranchesOf(branches, CONTEXT, TODAY)) {
        expect(checked.leftOut).toEqual([]);
      }
    }
  });

  for (const { name, branches, realizable } of HAND_CATALOGUE) {
    it(`${name}: 20 generations each reach goals 1 to 4`, () => {
      const vectors = realizable.map((key) => [...key].map((letter) => letter === 'm'));
      const targets = vectorTargetsOf(vectors, branches.length);
      const full = [1, 2, 3].map((goal) => targets.filter((each) => each.goal === goal).length);
      for (const seed of SEEDS) {
        const outcomes = generatedOutcomes(branches, CONTEXT, TODAY, seed);
        for (const { vector } of outcomes) {
          expect(realizable, `seed ${seed}`).toContain(vectorKeyOf(vector));
        }
        const score = vectorScoreOf(
          targets,
          outcomes.map((outcome) => outcome.vector)
        );
        expect(score, `seed ${seed}: goals 1 to 3`).toEqual(full);
        branches.forEach((branch, at) => {
          for (const id of Object.keys(outcomes[0].items[at])) {
            const met = outcomes.map((outcome) => outcome.items[at][id]);
            expect(met, `seed ${seed}: ${branch.key} ${id}`).toContain(true);
            expect(met, `seed ${seed}: ${branch.key} ${id}`).toContain(false);
          }
        });
      }
    });
  }
});

// Filled slots (US3, FR-020; research R8; tasks.md T050): the persona's values stay, only the
// fields it lacks are new, and the personas still reach the goals on the rule set as it is now

/** A new rule on a field the example's personas have no value for (US3-AS2) */
const NATIONALITY = rule(41, target('pid', 'nationalities'), {
  operator: 'includes_one_of',
  values: ['DE'],
});
const NATIONALITY_KEY = 'pid.nationalities';

/** The example with the nationality rule in Standard and so in Ambulance, which is based on it */
const WITH_NATIONALITY: KeyedBranch[] = (() => {
  const standard = mainBranch([AGE, CITY, CLASS_B, HELD_B, NATIONALITY]);
  return [keyed(standard, 'standard'), keyed(basedAt(standard, 'Ambulance', 19), 'ambulance')];
})();

/** Three personas of the example, generated before the rule existed */
function oldPersonas(seed: number): Persona[] {
  return generated(EXAMPLE, seed);
}

/** A request that fills the personas' missing fields, on `branches`; `kinds` per persona */
function fillRequestOf(
  branches: readonly KeyedBranch[],
  seed: number,
  personas: readonly Persona[],
  kinds: readonly SlotKind[] = ['filled', 'filled', 'filled']
): GenerationRequest {
  return requestOf(
    branches,
    seed,
    personas.map((persona, index) => ({
      kind: kinds[index],
      name: persona.name,
      values: kinds[index] === 'free' ? {} : persona.values,
    }))
  );
}

/** Which of the branches the persona meets, as `meet` and `fail` joined */
function vectorOfPersona(
  persona: Persona,
  branches: readonly KeyedBranch[],
  fields: readonly PersonaField[]
): string {
  return branches.map((branch) => (meets(persona, branch, fields) ? 'meet' : 'fail')).join('/');
}

/** Whether `ids`'s item is met by one persona and failed by another, in the first branch */
function metAndFailed(
  personas: readonly Persona[],
  branch: KeyedBranch,
  fields: readonly PersonaField[],
  id: string
): boolean {
  const met = personas.map((persona) => itemOutcomes(persona, branch, fields)[id]);
  return met.includes(true) && met.includes(false);
}

describe('generatePersonas: filled slots (FR-020)', () => {
  const fields = personaFieldsOf(WITH_NATIONALITY, CONTEXT);

  it('reads the example with the rule, whose field the old personas lack', () => {
    for (const { checked } of requestOf(WITH_NATIONALITY, 1).branches) {
      expect(checked.leftOut).toEqual([]);
    }
    const old = oldPersonas(1);
    expect(fields.some((each) => each.key === NATIONALITY_KEY)).toBe(true);
    for (const persona of old) {
      expect(persona.values).not.toHaveProperty(NATIONALITY_KEY);
    }
  });

  it('answers the absent fields only, and changes no value the persona has', () => {
    for (const seed of SEEDS) {
      const old = oldPersonas(seed);
      const request = fillRequestOf(WITH_NATIONALITY, seed + 50, old);
      const result = generatePersonas(request, NO_DEADLINE);
      result.slots.forEach((slot, index) => {
        expect(Object.keys(slot.values), `seed ${seed}`).toEqual([NATIONALITY_KEY]);
        expect(slot.name).toBeNull();
        for (const key of Object.keys(slot.values)) {
          expect(old[index].values).not.toHaveProperty(key);
        }
      });
      const personas = personasOf(request, result);
      personas.forEach((persona, index) => {
        for (const [key, value] of Object.entries(old[index].values)) {
          expect(persona.values[key]).toEqual(value);
        }
        expect(persona.name).toBe(old[index].name);
      });
      expectValid(personas, fields);
    }
  });

  it('keeps the personas’ vectors and lets one meet the new rule and another fail it (US3-AS2)', () => {
    for (const seed of SEEDS) {
      const old = oldPersonas(seed);
      const request = fillRequestOf(WITH_NATIONALITY, seed + 50, old);
      const personas = personasOf(request, generatePersonas(request, NO_DEADLINE));
      // Goals 1 to 3 as before the rule: the filled personas still reach every vector
      expect(
        personas.map((persona) => vectorOfPersona(persona, WITH_NATIONALITY, fields)).sort(),
        `seed ${seed}`
      ).toEqual(['fail/fail', 'fail/meet', 'meet/meet']);
      for (const branch of WITH_NATIONALITY) {
        expect(
          metAndFailed(personas, branch, fields, 'rule-41'),
          `${branch.key}, seed ${seed}`
        ).toBe(true);
      }
    }
  });

  it('treats an empty value as a value, and a hidden one as fixed', () => {
    for (const seed of SEEDS.slice(0, 10)) {
      const old = oldPersonas(seed);
      const request = requestOf(WITH_NATIONALITY, seed + 50, [
        // No nationality, which the rule counts as not met, and a hidden value
        {
          kind: 'filled',
          name: old[0].name,
          values: { ...old[0].values, [NATIONALITY_KEY]: [], 'pid.family_name': 'Muster' },
        },
        { kind: 'filled', name: old[1].name, values: old[1].values },
        { kind: 'filled', name: old[2].name, values: old[2].values },
      ]);
      const result = generatePersonas(request, NO_DEADLINE);
      expect(result.slots[0], `seed ${seed}`).toEqual({ values: {}, name: null });
      expect(Object.keys(result.slots[1].values)).toEqual([NATIONALITY_KEY]);
      const personas = personasOf(request, result);
      expect(personas[0].values['pid.family_name']).toBe('Muster');
      expect(personas[0].values[NATIONALITY_KEY]).toEqual([]);
      // The empty value fails the rule, so a persona that can meet it does
      expect(metAndFailed(personas, WITH_NATIONALITY[0], fields, 'rule-41'), `seed ${seed}`).toBe(
        true
      );
    }
  });

  it('plans a filled slot between a kept and a free one, each as its kind asks', () => {
    for (const seed of SEEDS.slice(0, 10)) {
      const old = oldPersonas(seed);
      const request = fillRequestOf(WITH_NATIONALITY, seed + 50, old, ['kept', 'filled', 'free']);
      const result = generatePersonas(request, NO_DEADLINE);
      expect(result.slots[0], `seed ${seed}`).toEqual({ values: {}, name: null });
      expect(Object.keys(result.slots[1].values)).toEqual([NATIONALITY_KEY]);
      expect(Object.keys(result.slots[2].values).sort()).toEqual(fields.map((f) => f.key).sort());
      const personas = personasOf(request, result);
      expect(personas[0].values).toBe(old[0].values);
      expect(personas[1].values).toMatchObject(old[1].values);
      expectValid(personas.slice(1), fields);
    }
  });

  it('answers nothing for a filled slot with no absent field', () => {
    const personas = generated(EXAMPLE, 4);
    const request = fillRequestOf(EXAMPLE, 5, personas);
    expect(generatePersonas(request, NO_DEADLINE).slots).toEqual([
      { values: {}, name: null },
      { values: {}, name: null },
      { values: {}, name: null },
    ]);
  });

  it('covers the new rule when the old rules’ outcomes are already decided by fixed values', () => {
    // Height is new; the nationality of two personas is fixed, so that rule's outcome is decided
    // for them: they count for it, and the new rule on the height is still met and failed
    const height = rule(42, target('mdl', 'height'), { operator: 'greater_than', value: 170 });
    const standard = mainBranch([AGE, CITY, CLASS_B, HELD_B, NATIONALITY, height]);
    const branches = [keyed(standard, 'standard')];
    const branchFields = personaFieldsOf(branches, CONTEXT);
    for (const seed of SEEDS.slice(0, 10)) {
      const old = oldPersonas(seed).map((persona, index) => ({
        ...persona,
        values: {
          ...persona.values,
          ...(index < 2 ? { [NATIONALITY_KEY]: [index === 0 ? 'DE' : 'FR'] } : {}),
        },
      }));
      const request = fillRequestOf(branches, seed + 50, old);
      const result = generatePersonas(request, NO_DEADLINE);
      expect(Object.keys(result.slots[0].values), `seed ${seed}`).toEqual(['mdl.height']);
      expect(Object.keys(result.slots[2].values).sort(), `seed ${seed}`).toEqual(
        ['mdl.height', NATIONALITY_KEY].sort()
      );
      const personas = personasOf(request, result);
      expectValid(personas, branchFields);
      expect(metAndFailed(personas, branches[0], branchFields, 'rule-41')).toBe(true);
      expect(metAndFailed(personas, branches[0], branchFields, 'rule-42')).toBe(true);
    }
  });

  it('returns valid personas when the clock passes the deadline during a fill', () => {
    for (const reads of [1, 5, 20, 80, 300]) {
      let clock = 0;
      const old = oldPersonas(reads);
      const request = fillRequestOf(WITH_NATIONALITY, reads, old);
      const result = generatePersonas(request, { deadline: reads, now: () => (clock += 1) });
      expectValid(personasOf(request, result), fields);
      result.slots.forEach((slot) => expect(Object.keys(slot.values)).toEqual([NATIONALITY_KEY]));
    }
  });

  it('gives equal results for equal seeds', () => {
    const old = oldPersonas(3);
    const answer = (seed: number) =>
      JSON.stringify(generatePersonas(fillRequestOf(WITH_NATIONALITY, seed, old), NO_DEADLINE));
    expect(answer(9)).toBe(answer(9));
  });
});
