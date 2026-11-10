import { describe, expect, it } from 'vitest';

import type { Language } from '../language';
import { initialPersonaState, personaStateReducer } from './personaState';
import type {
  GeneratedMessage,
  PersonaAction,
  PersonaField,
  PersonaState,
  PersonaValue,
} from './types';

const CITY = 'pid.address_locality';
const CLASSES = 'mdl.driving_privileges.classes';
const ISSUE_B = 'mdl.driving_privileges.issue_date#B';

function field(key: string, kind: PersonaField['kind'], licenceClass: string | null): PersonaField {
  return {
    key,
    documentType: 'x',
    documentLabel: 'X',
    label: key,
    field: key,
    part: null,
    licenceClass,
    kind,
    optionSet: null,
    multiple: kind === 'enum',
    dateOfBirth: false,
  };
}
const NAMES = ['Mia Schulz', 'Anna Berger', 'Jonas Weber'];
const BRANCH_KEYS = ['b-main', 'b-ambulance'];

/** The fields the actions carry: the city, and the issue date of class B */
const FIELDS: PersonaField[] = [
  field(CITY, 'text', null),
  field(CLASSES, 'enum', null),
  field(ISSUE_B, 'date', 'B'),
];

/** The fields the personas of `answer()` have values for: the city only */
const CITY_FIELDS: PersonaField[] = [field(CITY, 'text', null)];

function opened(
  openBranchKey: string | null = 'b-ambulance',
  now = 1000,
  branchKeys: string[] = BRANCH_KEYS
): PersonaAction {
  return { type: 'opened', fields: CITY_FIELDS, openBranchKey, branchKeys, now };
}

/** A generated answer: per slot, its city and its name drawn (or none) */
function answer(cities: string[], names: (string | null)[] = [null, null, null]) {
  return cities.map((city, index) => ({
    values: { [CITY]: city } as Record<string, PersonaValue>,
    name: names[index],
  })) satisfies GeneratedMessage['slots'];
}

function succeeded(state: PersonaState, slots: GeneratedMessage['slots']): PersonaAction {
  if (state.run === null) {
    throw new Error('no run');
  }
  return { type: 'runSucceeded', runId: state.run.runId, slots };
}

function reduce(state: PersonaState, ...actions: PersonaAction[]): PersonaState {
  return actions.reduce(personaStateReducer, state);
}

/** The first run, started by opening the step */
function firstRun(): PersonaState {
  return reduce(initialPersonaState, opened());
}

/** Three ready personas, from the first run */
function ready(): PersonaState {
  const running = firstRun();
  return reduce(running, succeeded(running, answer(['Stuttgart', 'Ulm', 'Köln'], NAMES)));
}

function cities(state: PersonaState): PersonaValue[] {
  return (state.personas ?? []).map((persona) => persona.values[CITY]);
}

function statuses(state: PersonaState): string[] {
  return (state.personas ?? []).map((persona) => persona.status);
}

describe('initialPersonaState', () => {
  it('has no personas, no run, no failure, and the first persona selected', () => {
    expect(initialPersonaState).toEqual({
      personas: null,
      selected: 0,
      branchKey: null,
      run: null,
      lastRunId: 0,
      failed: false,
      editing: null,
      confirm: null,
      announcement: '',
      announcementId: 0,
    });
  });
});

describe('opened', () => {
  it('[empty] → [first run]: selects the open branch and starts a run with every slot free', () => {
    const state = reduce(initialPersonaState, opened('b-ambulance', 1234));
    expect(state.branchKey).toBe('b-ambulance');
    expect(state.run).toEqual({ runId: 1, startedAt: 1234, slots: ['free', 'free', 'free'] });
    expect(state.lastRunId).toBe(1);
    expect(state.personas).toBeNull();
    expect(state.failed).toBe(false);
  });

  it('selects the first branch when the open one is gone, and none without branches', () => {
    expect(reduce(initialPersonaState, opened('b-deleted')).branchKey).toBe('b-main');
    expect(reduce(initialPersonaState, opened(null)).branchKey).toBe('b-main');
    expect(reduce(initialPersonaState, opened('b-main', 1000, [])).branchKey).toBeNull();
  });

  it('never starts a second run while one is running', () => {
    const running = firstRun();
    const state = reduce(running, opened('b-main', 2000));
    expect(state.run).toBe(running.run);
    expect(state.lastRunId).toBe(1);
    expect(state.branchKey).toBe('b-main');
  });

  it('starts no run when the personas exist, and keeps the selected persona', () => {
    const before = reduce(ready(), { type: 'select', slot: 2 });
    const state = reduce(before, opened('b-main', 5000));
    expect(state.run).toBeNull();
    expect(state.personas).toBe(before.personas);
    expect(state.selected).toBe(2);
    expect(state.branchKey).toBe('b-main');
  });

  it('keeps the failure state after a failed first run, until "Try again"', () => {
    const running = firstRun();
    const failed = reduce(running, { type: 'runFailed', runId: 1 });
    const state = reduce(failed, opened('b-main', 9000));
    expect(state.failed).toBe(true);
    expect(state.run).toBeNull();
    expect(state.lastRunId).toBe(1);
  });

  it('returns the same state when nothing changes', () => {
    const before = ready();
    expect(reduce(before, opened())).toBe(before);
  });

  it('ends edit mode: coming back from the rules step opens the panel in read mode', () => {
    const before: PersonaState = { ...ready(), selected: 1, editing: 1 };
    const state = reduce(before, opened('b-main', 5000));
    expect(state.editing).toBeNull();
    expect(state.selected).toBe(1);
    expect(state.personas).toBe(before.personas);
  });
});

/** The fields after the rules step added a field the personas have no value for */
const NEW_FIELD = 'pid.address_region';
const MORE_FIELDS: PersonaField[] = [...CITY_FIELDS, field(NEW_FIELD, 'text', null)];

function openedWith(
  fields: PersonaField[],
  now = 5000,
  openBranchKey = 'b-ambulance'
): PersonaAction {
  return { type: 'opened', fields, openBranchKey, branchKeys: BRANCH_KEYS, now };
}

const readyWithCities = ready;

describe('opened: the fill run (FR-020)', () => {
  it('starts no fill run without missing values, also for empty values and a field gone', () => {
    const before = readyWithCities();
    // Fewer fields than the personas have values for: the values are hidden, not missing
    expect(reduce(before, openedWith(CITY_FIELDS))).toBe(before);
    expect(reduce(before, openedWith([]))).toBe(before);
    // An empty value is a value (the team member cleared it, or the document doesn't give it)
    const emptied = reduce(before, {
      type: 'setValue',
      slot: 0,
      key: CITY,
      value: null,
      before: {},
      after: {},
      branches: [],
    });
    expect(reduce(emptied, openedWith(CITY_FIELDS))).toBe(emptied);
  });

  it('[ready] → [ready + run]: fills every persona that lacks a value, with their values kept', () => {
    const before = readyWithCities();
    const state = reduce(before, openedWith(MORE_FIELDS, 7000, 'b-main'));
    expect(state.run).toEqual({ runId: 2, startedAt: 7000, slots: ['filled', 'filled', 'filled'] });
    expect(state.lastRunId).toBe(2);
    expect(statuses(state)).toEqual(['filling', 'filling', 'filling']);
    // Their values stay: the hook sends them as the filled slots' fixed values
    expect(state.personas?.map((persona) => persona.values)).toEqual(
      before.personas?.map((persona) => persona.values)
    );
    expect(state.branchKey).toBe('b-main');
  });

  it('fills only the personas that lack a value and keeps the others', () => {
    const before = readyWithCities();
    const some: PersonaState = {
      ...before,
      personas:
        before.personas?.map((persona, index) =>
          index === 1 ? { ...persona, values: { ...persona.values, [NEW_FIELD]: 'BW' } } : persona
        ) ?? null,
    };
    const state = reduce(some, openedWith(MORE_FIELDS));
    expect(state.run?.slots).toEqual(['filled', 'kept', 'filled']);
    expect(statuses(state)).toEqual(['filling', 'ready', 'filling']);
    expect(state.personas?.[1]).toBe(some.personas?.[1]);
  });

  it('never fills a hidden value: a field that comes back keeps its earlier value (W6)', () => {
    const before = readyWithCities();
    const hidden = reduce(before, openedWith([]));
    expect(hidden.run).toBeNull();
    const back = reduce(hidden, openedWith(CITY_FIELDS, 6000));
    expect(back).toBe(hidden);
    expect(cities(back)).toEqual(['Stuttgart', 'Ulm', 'Köln']);
  });

  it('writes only the new fields into `values` and `generated`, and the persona is ready', () => {
    const running = reduce(ready(), openedWith(MORE_FIELDS));
    const answers = ['BW', 'BY', 'NW'].map((region, index) => ({
      // An answer that repeats an existing value doesn't change it
      values: { [CITY]: 'Changed', [NEW_FIELD]: region } as Record<string, PersonaValue>,
      name: index === 0 ? 'Other' : null,
    }));
    const state = reduce(running, succeeded(running, answers));
    expect(state.run).toBeNull();
    expect(statuses(state)).toEqual(['ready', 'ready', 'ready']);
    expect(cities(state)).toEqual(['Stuttgart', 'Ulm', 'Köln']);
    expect(state.personas?.map((persona) => persona.values[NEW_FIELD])).toEqual(['BW', 'BY', 'NW']);
    expect(state.personas?.[0].generated).toEqual({ [CITY]: 'Stuttgart', [NEW_FIELD]: 'BW' });
    expect(state.personas?.[0].name).toBe('Mia Schulz');
    // An edit made earlier survives, so a fill adds fields, never replaces values
    const edited = reduce(ready(), setCity(1, 'Heilbronn'));
    const filling = reduce(edited, openedWith(MORE_FIELDS));
    const done = reduce(filling, succeeded(filling, answers));
    expect(cities(done)).toEqual(['Stuttgart', 'Heilbronn', 'Köln']);
    expect(done.personas?.[1].generated[CITY]).toBe('Ulm');
  });

  it('a persona being filled has neither edit mode nor "Generate again" (FR-013)', () => {
    const editing: PersonaState = { ...ready(), editing: 0 };
    const state = reduce(editing, openedWith(MORE_FIELDS));
    expect(state.editing).toBeNull();
    expect(reduce(state, { type: 'startEditing', slot: 0 })).toBe(state);
    expect(reduce(state, setCity(0, 'X'))).toBe(state);
    expect(
      reduce(state, { type: 'generateAll', fields: MORE_FIELDS, now: 9000 }).confirm
    ).toBeNull();
  });

  it('opening again while the fill runs changes nothing', () => {
    const filling = reduce(ready(), openedWith(MORE_FIELDS, 7000));
    expect(reduce(filling, openedWith(MORE_FIELDS, 8000))).toBe(filling);
  });

  it('merges a fill into a running "Generate again": the generated slot stays free', () => {
    const generating = reduce(ready(), {
      type: 'generateOne',
      slot: 0,
      fields: FIELDS,
      now: 3000,
    });
    expect(generating.run?.slots).toEqual(['free', 'kept', 'kept']);
    const state = reduce(generating, openedWith(MORE_FIELDS, 4000));
    expect(state.run).toEqual({ runId: 3, startedAt: 4000, slots: ['free', 'filled', 'filled'] });
    expect(statuses(state)).toEqual(['generating', 'filling', 'filling']);
    // The superseded run's answer is ignored
    expect(reduce(state, { type: 'runSucceeded', runId: 2, slots: answer(['A', 'B', 'C']) })).toBe(
      state
    );
    const answers = ['Esslingen', 'Neu-Ulm', 'Z'].map((city, index) => ({
      values: (index === 0 ? { [CITY]: city, [NEW_FIELD]: 'BW' } : { [NEW_FIELD]: 'BY' }) as Record<
        string,
        PersonaValue
      >,
      name: null,
    }));
    const done = reduce(state, succeeded(state, answers));
    expect(cities(done)).toEqual(['Esslingen', 'Ulm', 'Köln']);
    expect(statuses(done)).toEqual(['ready', 'ready', 'ready']);
    expect(done.personas?.map((persona) => persona.values[NEW_FIELD])).toEqual(['BW', 'BY', 'BY']);
  });

  it('merges a "Generate again" into a running fill: the slot becomes free', () => {
    const filling = reduce(ready(), openedWith(MORE_FIELDS, 7000));
    const state = reduce(filling, { type: 'generateOne', slot: 1, fields: MORE_FIELDS, now: 7500 });
    expect(state.run).toEqual({ runId: 3, startedAt: 7500, slots: ['filled', 'free', 'filled'] });
    expect(statuses(state)).toEqual(['filling', 'generating', 'filling']);
    // "Generate all again" frees all three
    const all = reduce(state, { type: 'generateAll', fields: MORE_FIELDS, now: 7600 });
    expect(all.run?.slots).toEqual(['free', 'free', 'free']);
    expect(statuses(all)).toEqual(['generating', 'generating', 'generating']);
  });

  it('a failed fill leaves the personas ready with their values, and the failure stays', () => {
    const before = ready();
    const filling = reduce(before, openedWith(MORE_FIELDS));
    const failed = reduce(filling, { type: 'runFailed', runId: 2 });
    expect(failed.failed).toBe(true);
    expect(statuses(failed)).toEqual(['ready', 'ready', 'ready']);
    expect(failed.personas?.map((persona) => persona.values)).toEqual(
      before.personas?.map((persona) => persona.values)
    );
    // Opening again starts no run: the failure stays until "Try again"
    expect(reduce(failed, openedWith(MORE_FIELDS, 9000))).toBe(failed);
    const retried = reduce(failed, { type: 'retry', now: 9500 });
    expect(retried.run?.slots).toEqual(['free', 'free', 'free']);
  });

  it('selects the open branch while it fills, and the first when the open one was deleted', () => {
    const ambulance = reduce(ready(), openedWith(MORE_FIELDS, 7000, 'b-ambulance'));
    expect(ambulance.branchKey).toBe('b-ambulance');
    const deleted = reduce(
      { ...ready(), branchKey: 'b-deleted' },
      openedWith(MORE_FIELDS, 7000, 'b-deleted')
    );
    expect(deleted.branchKey).toBe('b-main');
    expect(deleted.run?.slots).toEqual(['filled', 'filled', 'filled']);
  });

  it('keeps the selected persona through a fill', () => {
    const state = reduce({ ...ready(), selected: 2 }, openedWith(MORE_FIELDS));
    expect(state.selected).toBe(2);
  });
});

describe('runSucceeded', () => {
  it('[first run] → [ready]: creates the three personas, the first one selected', () => {
    const running = firstRun();
    const state = reduce(running, succeeded(running, answer(['Stuttgart', 'Ulm', 'Köln'], NAMES)));
    expect(state.personas).toEqual([
      {
        id: 'persona-1',
        name: 'Mia Schulz',
        values: { [CITY]: 'Stuttgart' },
        generated: { [CITY]: 'Stuttgart' },
        status: 'ready',
      },
      {
        id: 'persona-2',
        name: 'Anna Berger',
        values: { [CITY]: 'Ulm' },
        generated: { [CITY]: 'Ulm' },
        status: 'ready',
      },
      {
        id: 'persona-3',
        name: 'Jonas Weber',
        values: { [CITY]: 'Köln' },
        generated: { [CITY]: 'Köln' },
        status: 'ready',
      },
    ]);
    expect(state.selected).toBe(0);
    expect(state.run).toBeNull();
    expect(state.failed).toBe(false);
  });

  it('keeps `values` and `generated` apart, so that an edit never changes `generated`', () => {
    const [persona] = ready().personas ?? [];
    expect(persona.values).not.toBe(persona.generated);
  });

  it('fails the first run when an answer brings no name for a new persona', () => {
    const running = firstRun();
    const state = reduce(
      running,
      succeeded(running, answer(['Stuttgart', 'Ulm', 'Köln'], ['Mia Schulz', null, 'Jonas Weber']))
    );
    expect(state.personas).toBeNull();
    expect(state.failed).toBe(true);
    expect(state.run).toBeNull();
  });

  it('fails a run whose answer doesn’t have a slot per persona', () => {
    const running = firstRun();
    const state = reduce(running, succeeded(running, answer(['Stuttgart', 'Ulm'], NAMES)));
    expect(state.failed).toBe(true);
    expect(state.run).toBeNull();
  });

  it('ignores an answer without a run', () => {
    const before = ready();
    expect(
      reduce(before, { type: 'runSucceeded', runId: 1, slots: answer(['A', 'B', 'C'], NAMES) })
    ).toBe(before);
  });
});

describe('runFailed', () => {
  it('[first run] → [failed]: no personas, no run', () => {
    const state = reduce(firstRun(), { type: 'runFailed', runId: 1 });
    expect(state.failed).toBe(true);
    expect(state.run).toBeNull();
    expect(state.personas).toBeNull();
  });

  it('[ready + run] → [failed]: the personas keep their last values and are ready again', () => {
    const before = ready();
    const running = reduce(before, { type: 'generateAll', fields: FIELDS, now: 3000 });
    expect(statuses(running)).toEqual(['generating', 'generating', 'generating']);
    const state = reduce(running, { type: 'runFailed', runId: 2 });
    expect(state.failed).toBe(true);
    expect(state.run).toBeNull();
    expect(cities(state)).toEqual(['Stuttgart', 'Ulm', 'Köln']);
    expect(statuses(state)).toEqual(['ready', 'ready', 'ready']);
    expect(state.personas?.[1].generated).toBe(before.personas?.[1].generated);
  });

  it('fails whatever runs when the failure belongs to no run (a module that can’t load)', () => {
    expect(reduce(initialPersonaState, { type: 'runFailed', runId: null })).toMatchObject({
      failed: true,
      run: null,
      personas: null,
    });
    expect(reduce(firstRun(), { type: 'runFailed', runId: null })).toMatchObject({
      failed: true,
      run: null,
    });
  });

  it('ignores a failure of a superseded run', () => {
    const running = reduce(ready(), { type: 'generateOne', slot: 1, fields: FIELDS, now: 3000 });
    const merged = reduce(running, { type: 'generateOne', slot: 0, fields: FIELDS, now: 3500 });
    expect(reduce(merged, { type: 'runFailed', runId: 2 })).toBe(merged);
    expect(reduce(ready(), { type: 'runFailed', runId: 1 }).failed).toBe(false);
  });
});

describe('retry', () => {
  it('[failed] → [run, all free]: clears the failure and starts a run with a new id', () => {
    const failed = reduce(firstRun(), { type: 'runFailed', runId: 1 });
    const state = reduce(failed, { type: 'retry', now: 7000 });
    expect(state.failed).toBe(false);
    expect(state.run).toEqual({ runId: 2, startedAt: 7000, slots: ['free', 'free', 'free'] });
    const done = reduce(state, succeeded(state, answer(['A', 'B', 'C'], NAMES)));
    expect(done.personas?.map((persona) => persona.name)).toEqual(NAMES);
    expect(done.failed).toBe(false);
  });

  it('keeps the names of the personas that exist, and ignores an older answer', () => {
    const failed = reduce(
      ready(),
      { type: 'generateAll', fields: FIELDS, now: 3000 },
      { type: 'runFailed', runId: 2 }
    );
    const state = reduce(failed, { type: 'retry', now: 7000 });
    expect(statuses(state)).toEqual(['generating', 'generating', 'generating']);
    expect(reduce(state, { type: 'runSucceeded', runId: 2, slots: answer(['X', 'Y', 'Z']) })).toBe(
      state
    );
    const done = reduce(state, succeeded(state, answer(['A', 'B', 'C'], ['Lea', 'Tom', 'Ida'])));
    expect(done.personas?.map((persona) => persona.name)).toEqual(NAMES);
    expect(cities(done)).toEqual(['A', 'B', 'C']);
  });
});

describe('generateOne and generateAll', () => {
  it('[ready] → [ready + run]: one persona generated anew, the others kept', () => {
    const before = ready();
    const state = reduce(before, { type: 'generateOne', slot: 1, fields: FIELDS, now: 3000 });
    expect(state.run).toEqual({ runId: 2, startedAt: 3000, slots: ['kept', 'free', 'kept'] });
    expect(statuses(state)).toEqual(['ready', 'generating', 'ready']);
    expect(state.personas?.[0]).toBe(before.personas?.[0]);
    expect(state.personas?.[1].values).toBe(before.personas?.[1].values);
  });

  it('[ready] → [ready + run]: all three generated anew', () => {
    const state = reduce(ready(), { type: 'generateAll', fields: FIELDS, now: 3000 });
    expect(state.run).toEqual({ runId: 2, startedAt: 3000, slots: ['free', 'free', 'free'] });
    expect(statuses(state)).toEqual(['generating', 'generating', 'generating']);
  });

  it('[ready + run] → [ready]: new values for the free slot, the rest unchanged', () => {
    const before = reduce(ready(), { type: 'generateOne', slot: 1, fields: FIELDS, now: 3000 });
    const state = reduce(before, succeeded(before, answer(['X', 'Neu-Ulm', 'Z'])));
    expect(cities(state)).toEqual(['Stuttgart', 'Neu-Ulm', 'Köln']);
    expect(state.personas?.[1]).toMatchObject({
      name: 'Anna Berger',
      generated: { [CITY]: 'Neu-Ulm' },
      status: 'ready',
    });
    expect(state.personas?.[0]).toBe(before.personas?.[0]);
    expect(state.personas?.[2]).toBe(before.personas?.[2]);
    expect(state.run).toBeNull();
  });

  it('drops the hidden values of a free slot, and keeps a kept slot’s', () => {
    const base = ready();
    const hidden = { [CLASSES]: [], [ISSUE_B]: '2020-01-01' };
    const withHidden: PersonaState = {
      ...base,
      personas: (base.personas ?? []).map((persona) => ({
        ...persona,
        values: { ...persona.values, ...hidden },
        generated: { ...persona.generated, ...hidden },
      })),
    };
    const running = reduce(withHidden, { type: 'generateOne', slot: 0, fields: FIELDS, now: 3000 });
    const state = reduce(running, succeeded(running, answer(['Esslingen', 'Y', 'Z'])));
    expect(state.personas?.[0].values).toEqual({ [CITY]: 'Esslingen' });
    expect(state.personas?.[1].values[ISSUE_B]).toBe('2020-01-01');
  });

  it('merges a request into the running run: a new run id, the free slots united', () => {
    const first = reduce(ready(), { type: 'generateOne', slot: 1, fields: FIELDS, now: 3000 });
    const merged = reduce(first, { type: 'generateOne', slot: 0, fields: FIELDS, now: 3500 });
    expect(merged.run).toEqual({ runId: 3, startedAt: 3500, slots: ['free', 'free', 'kept'] });
    expect(statuses(merged)).toEqual(['generating', 'generating', 'ready']);
    // The superseded run's answer is ignored
    expect(reduce(merged, { type: 'runSucceeded', runId: 2, slots: answer(['X', 'Y', 'Z']) })).toBe(
      merged
    );
    const state = reduce(merged, succeeded(merged, answer(['Esslingen', 'Neu-Ulm', 'Z'])));
    expect(cities(state)).toEqual(['Esslingen', 'Neu-Ulm', 'Köln']);
    expect(statuses(state)).toEqual(['ready', 'ready', 'ready']);
  });

  it('merges "Generate all again" into a running "Generate again": every slot free', () => {
    const first = reduce(ready(), { type: 'generateOne', slot: 2, fields: FIELDS, now: 3000 });
    const state = reduce(first, { type: 'generateAll', fields: FIELDS, now: 3200 });
    expect(state.run).toEqual({ runId: 3, startedAt: 3200, slots: ['free', 'free', 'free'] });
  });

  it('changes nothing when the running run already generates what is asked', () => {
    const one = reduce(ready(), { type: 'generateOne', slot: 1, fields: FIELDS, now: 3000 });
    expect(reduce(one, { type: 'generateOne', slot: 1, fields: FIELDS, now: 3100 })).toBe(one);
    const all = reduce(ready(), { type: 'generateAll', fields: FIELDS, now: 3000 });
    expect(reduce(all, { type: 'generateOne', slot: 0, fields: FIELDS, now: 3100 })).toBe(all);
    expect(reduce(all, { type: 'retry', now: 3100 })).toBe(all);
  });

  it('frees every slot while there are no personas yet', () => {
    const running = firstRun();
    expect(reduce(running, { type: 'generateOne', slot: 1, fields: FIELDS, now: 2000 })).toBe(
      running
    );
    const failed = reduce(running, { type: 'runFailed', runId: 1 });
    const state = reduce(failed, { type: 'generateOne', slot: 1, fields: FIELDS, now: 2000 });
    expect(state.run).toEqual({ runId: 2, startedAt: 2000, slots: ['free', 'free', 'free'] });
  });

  it('clears an earlier failure when a run starts', () => {
    const failed = reduce(
      ready(),
      { type: 'generateAll', fields: FIELDS, now: 3000 },
      { type: 'runFailed', runId: 2 }
    );
    const state = reduce(failed, { type: 'generateOne', slot: 0, fields: FIELDS, now: 4000 });
    expect(state.failed).toBe(false);
    expect(state.run).toEqual({ runId: 3, startedAt: 4000, slots: ['free', 'kept', 'kept'] });
  });

  it('ends edit mode for a persona being generated, not for another one', () => {
    const editing: PersonaState = { ...ready(), editing: 1 };
    expect(
      reduce(editing, { type: 'generateOne', slot: 1, fields: FIELDS, now: 3000 }).editing
    ).toBeNull();
    expect(
      reduce(editing, { type: 'generateOne', slot: 0, fields: FIELDS, now: 3000 }).editing
    ).toBe(1);
    expect(reduce(editing, { type: 'generateAll', fields: FIELDS, now: 3000 }).editing).toBeNull();
  });
});

describe('select and selectBranch', () => {
  it('changes the persona, keeps the variant and ends edit mode', () => {
    const before: PersonaState = { ...ready(), branchKey: 'b-ambulance', editing: 0 };
    const state = reduce(before, { type: 'select', slot: 2 });
    expect(state.selected).toBe(2);
    expect(state.branchKey).toBe('b-ambulance');
    expect(state.editing).toBeNull();
  });

  it('changes the variant, keeps the persona and ends edit mode (FR-004)', () => {
    const before: PersonaState = { ...ready(), selected: 1, branchKey: 'b-main', editing: 1 };
    const state = reduce(before, { type: 'selectBranch', branchKey: 'b-ambulance' });
    expect(state.branchKey).toBe('b-ambulance');
    expect(state.selected).toBe(1);
    expect(state.editing).toBeNull();
  });

  it('changes nothing when the selection stays', () => {
    const before: PersonaState = { ...ready(), selected: 1, branchKey: 'b-main', editing: 1 };
    expect(reduce(before, { type: 'select', slot: 1 })).toBe(before);
    expect(reduce(before, { type: 'selectBranch', branchKey: 'b-main' })).toBe(before);
  });

  it('leaves the run alone', () => {
    const running = reduce(ready(), { type: 'generateOne', slot: 0, fields: FIELDS, now: 3000 });
    const state = reduce(
      running,
      { type: 'select', slot: 1 },
      { type: 'selectBranch', branchKey: 'b-main' }
    );
    expect(state.run).toBe(running.run);
    expect(state.personas).toBe(running.personas);
  });
});

/** Mia's city edited, as the hook dispatches it */
function setCity(
  slot: 0 | 1 | 2,
  value: PersonaValue,
  before: Record<string, boolean | undefined> = {},
  after: Record<string, boolean | undefined> = {},
  key = CITY,
  language?: Language
): PersonaAction {
  return {
    type: 'setValue',
    slot,
    key,
    value,
    before,
    after,
    branches: [
      { key: 'b-main', name: 'Standard' },
      { key: 'b-ambulance', name: 'Ambulance' },
    ],
    ...(language === undefined ? {} : { language }),
  };
}

describe('setValue', () => {
  it('changes one value, never `generated`, and the other personas stay', () => {
    const before = ready();
    const state = reduce(before, setCity(1, 'Heilbronn'));
    expect(cities(state)).toEqual(['Stuttgart', 'Heilbronn', 'Köln']);
    expect(state.personas?.[1].generated[CITY]).toBe('Ulm');
    expect(state.personas?.[0]).toBe(before.personas?.[0]);
    expect(state.personas?.[2]).toBe(before.personas?.[2]);
  });

  it('announces the changes of outcome, in tab order, with the full name', () => {
    const state = reduce(
      ready(),
      setCity(
        0,
        'Ulm',
        { 'b-main': true, 'b-ambulance': true },
        { 'b-main': false, 'b-ambulance': false }
      )
    );
    expect(state.announcement).toBe(
      'Mia Schulz no longer meets the rules of Standard. ' +
        'Mia Schulz no longer meets the rules of Ambulance.'
    );
    expect(state.announcementId).toBe(1);
  });

  it('announces in the language the action carries, the language of the moment (spec 009)', () => {
    const before = { 'b-main': true, 'b-ambulance': false };
    const after = { 'b-main': false, 'b-ambulance': true };
    const edit = setCity(0, 'Ulm', before, after);
    const german = reduce(ready(), setCity(0, 'Ulm', before, after, CITY, 'de'));
    expect(german.announcement).toBe(
      'Mia Schulz erfüllt die Regeln von Standard nicht mehr. ' +
        'Mia Schulz erfüllt jetzt die Regeln von Ambulance.'
    );
    expect(german.announcementId).toBe(1);
    // Omitted, the language is English; an explicit 'en' is the same
    expect(reduce(ready(), setCity(0, 'Ulm', before, after, CITY, 'en')).announcement).toBe(
      reduce(ready(), edit).announcement
    );
    // The next change follows a switch; the persona's values are the same in both languages
    const back = reduce(
      german,
      setCity(0, 'Stuttgart', { 'b-main': false }, { 'b-main': true }, CITY, 'en')
    );
    expect(back.announcement).toBe('Mia Schulz now meets the rules of Standard.');
    expect(back.announcementId).toBe(2);
    expect(german.personas).toEqual(reduce(ready(), edit).personas);
  });

  it('keeps a stored announcement as it was composed when other actions come (R4)', () => {
    const german = reduce(
      ready(),
      setCity(0, 'Ulm', { 'b-main': true }, { 'b-main': false }, CITY, 'de')
    );
    const state = reduce(
      german,
      { type: 'select', slot: 1 },
      { type: 'rename', slot: 0, name: 'Mia Roth' }
    );
    expect(state.announcement).toBe('Mia Schulz erfüllt die Regeln von Standard nicht mehr.');
    expect(state.announcementId).toBe(german.announcementId);
  });

  it('announces nothing when no outcome changed, and clears the earlier text', () => {
    const first = reduce(ready(), setCity(0, 'Ulm', { 'b-main': true }, { 'b-main': false }));
    expect(first.announcement).not.toBe('');
    const second = reduce(first, setCity(0, 'Ulm2', { 'b-main': false }, { 'b-main': false }));
    expect(second.announcement).toBe('');
    expect(second.announcementId).toBe(first.announcementId);
  });

  it('raises the announcement id for the same sentence twice in a row', () => {
    const edit = setCity(0, 'Ulm', { 'b-main': true }, { 'b-main': false });
    const once = reduce(ready(), edit);
    const twice = reduce(once, edit);
    expect(twice.announcement).toBe(once.announcement);
    expect(twice.announcementId).toBe(once.announcementId + 1);
  });

  it('is ignored for a persona being generated and while there are no personas', () => {
    const running = reduce(ready(), { type: 'generateOne', slot: 1, fields: FIELDS, now: 3000 });
    expect(reduce(running, setCity(1, 'X'))).toBe(running);
    const first = firstRun();
    expect(reduce(first, setCity(0, 'X'))).toBe(first);
  });

  it('keeps the edit through a fill run, and leaves the run alone', () => {
    const running = reduce(ready(), { type: 'generateOne', slot: 2, fields: FIELDS, now: 3000 });
    const state = reduce(running, setCity(0, 'Mainz'));
    expect(state.run).toBe(running.run);
    expect(cities(state)[0]).toBe('Mainz');
  });
});

describe('rename', () => {
  it('changes the name, nothing else, and announces nothing', () => {
    const announced = reduce(ready(), setCity(0, 'Ulm', { 'b-main': true }, { 'b-main': false }));
    const state = reduce(announced, { type: 'rename', slot: 2, name: 'Yusuf Kaya' });
    expect(state.personas?.map((persona) => persona.name)).toEqual([
      'Mia Schulz',
      'Anna Berger',
      'Yusuf Kaya',
    ]);
    expect(state.personas?.[2].values).toBe(announced.personas?.[2].values);
    expect(state.announcement).toBe(announced.announcement);
    expect(state.announcementId).toBe(announced.announcementId);
  });

  it('ignores an empty or blank name, since a name is never empty', () => {
    const before = ready();
    expect(reduce(before, { type: 'rename', slot: 0, name: '' })).toBe(before);
    expect(reduce(before, { type: 'rename', slot: 0, name: '   ' })).toBe(before);
  });

  it('is ignored for a persona being generated', () => {
    const running = reduce(ready(), { type: 'generateOne', slot: 0, fields: FIELDS, now: 3000 });
    expect(reduce(running, { type: 'rename', slot: 0, name: 'Eva' })).toBe(running);
  });
});

describe('startEditing and stopEditing', () => {
  it('sets and clears the persona in edit mode', () => {
    const editing = reduce(ready(), { type: 'startEditing', slot: 1 });
    expect(editing.editing).toBe(1);
    expect(reduce(editing, { type: 'stopEditing' }).editing).toBeNull();
  });

  it('refuses a persona being generated (FR-013) and a state without personas', () => {
    const running = reduce(ready(), { type: 'generateOne', slot: 1, fields: FIELDS, now: 3000 });
    expect(reduce(running, { type: 'startEditing', slot: 1 })).toBe(running);
    expect(reduce(running, { type: 'startEditing', slot: 0 }).editing).toBe(0);
    const first = firstRun();
    expect(reduce(first, { type: 'startEditing', slot: 0 })).toBe(first);
  });

  it('changes nothing when already so', () => {
    const before = ready();
    expect(reduce(before, { type: 'stopEditing' })).toBe(before);
    const editing = reduce(before, { type: 'startEditing', slot: 0 });
    expect(reduce(editing, { type: 'startEditing', slot: 0 })).toBe(editing);
  });
});

describe('the question before generating anew', () => {
  const NOW = 5000;

  /** Anna (slot 1) has an edited city; Mia (0) an edited hidden value only */
  function edited(): PersonaState {
    const base = ready();
    return reduce(
      base,
      setCity(1, 'Heilbronn'),
      // a hidden value, a class date of a class not held, never counts
      setCity(0, '2020-01-01', {}, {}, ISSUE_B)
    );
  }

  it('asks instead of starting when the persona has changes', () => {
    const state = reduce(edited(), {
      type: 'generateOne',
      slot: 1,
      fields: FIELDS,
      now: NOW,
    });
    expect(state.confirm).toEqual({ type: 'one', slot: 1 });
    expect(state.run).toBeNull();
    expect(statuses(state)).toEqual(['ready', 'ready', 'ready']);
  });

  it('starts at once when the persona has no changes, hidden values included', () => {
    const state = reduce(edited(), { type: 'generateOne', slot: 0, fields: FIELDS, now: NOW });
    expect(state.confirm).toBeNull();
    expect(state.run?.slots).toEqual(['free', 'kept', 'kept']);
  });

  it('starts at once when an edit was put back', () => {
    const back = reduce(edited(), setCity(1, 'Ulm'));
    const state = reduce(back, { type: 'generateOne', slot: 1, fields: FIELDS, now: NOW });
    expect(state.confirm).toBeNull();
    expect(state.run).not.toBeNull();
  });

  it('names every persona with changes for "Generate all again"', () => {
    const twice = reduce(edited(), setCity(0, 'Mainz'));
    const state = reduce(twice, { type: 'generateAll', fields: FIELDS, now: NOW });
    expect(state.confirm).toEqual({ type: 'all', changed: [0, 1] });
    expect(state.run).toBeNull();
  });

  it('starts "Generate all again" at once when nobody has changes', () => {
    const state = reduce(ready(), { type: 'generateAll', fields: FIELDS, now: NOW });
    expect(state.confirm).toBeNull();
    expect(state.run?.slots).toEqual(['free', 'free', 'free']);
  });

  it('does not ask again about a persona that is already being generated', () => {
    const running = reduce(edited(), { type: 'generateOne', slot: 1, fields: FIELDS, now: NOW });
    const confirmed = reduce(
      reduce(edited(), { type: 'generateOne', slot: 1, fields: FIELDS, now: NOW }),
      { type: 'confirmed', now: NOW }
    );
    expect(running.confirm).not.toBeNull();
    const state = reduce(confirmed, { type: 'generateAll', fields: FIELDS, now: NOW + 100 });
    expect(state.confirm).toBeNull();
    expect(state.run?.slots).toEqual(['free', 'free', 'free']);
  });

  it('"confirmed" starts the run the question was about and closes it', () => {
    const asked = reduce(edited(), { type: 'generateOne', slot: 1, fields: FIELDS, now: NOW });
    const state = reduce(asked, { type: 'confirmed', now: 6000 });
    expect(state.confirm).toBeNull();
    expect(state.run).toEqual({ runId: 2, startedAt: 6000, slots: ['kept', 'free', 'kept'] });
    expect(statuses(state)).toEqual(['ready', 'generating', 'ready']);
    const all = reduce(reduce(edited(), { type: 'generateAll', fields: FIELDS, now: NOW }), {
      type: 'confirmed',
      now: 6000,
    });
    expect(all.run?.slots).toEqual(['free', 'free', 'free']);
  });

  it('merges a confirmed run into a running one, as in T023', () => {
    const running = reduce(edited(), { type: 'generateOne', slot: 2, fields: FIELDS, now: NOW });
    const asked = reduce(running, { type: 'generateOne', slot: 1, fields: FIELDS, now: NOW + 10 });
    const state = reduce(asked, { type: 'confirmed', now: NOW + 20 });
    expect(state.run).toEqual({ runId: 3, startedAt: NOW + 20, slots: ['kept', 'free', 'free'] });
  });

  it('"cancelled" closes the question and changes nothing else', () => {
    const asked = reduce(edited(), { type: 'generateOne', slot: 1, fields: FIELDS, now: NOW });
    const state = reduce(asked, { type: 'cancelled' });
    expect(state.confirm).toBeNull();
    expect(state.run).toBeNull();
    expect(state.personas).toBe(asked.personas);
    expect(reduce(state, { type: 'cancelled' })).toBe(state);
  });

  it('"confirmed" without a question changes nothing', () => {
    const before = ready();
    expect(reduce(before, { type: 'confirmed', now: NOW })).toBe(before);
  });

  it('generating anew keeps the names and drops the edits (R10, FR-012)', () => {
    const asked = reduce(edited(), { type: 'generateOne', slot: 1, fields: FIELDS, now: NOW });
    const running = reduce(asked, { type: 'confirmed', now: NOW });
    const renamed = reduce(running, { type: 'rename', slot: 0, name: 'Eva Roth' });
    const done = reduce(renamed, succeeded(renamed, answer(['', 'Bonn', ''], [null, null, null])));
    expect(done.personas?.map((persona) => persona.name)).toEqual([
      'Eva Roth',
      'Anna Berger',
      'Jonas Weber',
    ]);
    expect(done.personas?.[1].values[CITY]).toBe('Bonn');
    expect(done.personas?.[1].generated[CITY]).toBe('Bonn');
  });
});

describe('edit mode and the other actions', () => {
  it('"confirmed" ends edit mode for a persona generated anew', () => {
    const asked = reduce(ready(), { type: 'startEditing', slot: 1 }, setCity(1, 'Heilbronn'), {
      type: 'generateOne',
      slot: 1,
      fields: FIELDS,
      now: 4000,
    });
    expect(asked.editing).toBe(1);
    expect(reduce(asked, { type: 'confirmed', now: 4100 }).editing).toBeNull();
  });

  it('an announcement stays when other actions come', () => {
    const announced = reduce(ready(), setCity(0, 'Ulm', { 'b-main': true }, { 'b-main': false }));
    const state = reduce(
      announced,
      { type: 'select', slot: 1 },
      { type: 'startEditing', slot: 1 },
      { type: 'stopEditing' }
    );
    expect(state.announcement).toBe(announced.announcement);
  });
});
