import { describe, expect, it } from 'vitest';

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
const NAMES = ['Mia Schulz', 'Anna Berger', 'Jonas Weber'];
const BRANCH_KEYS = ['b-main', 'b-ambulance'];

/** The fields `opened` carries; the reducer of US1 doesn't read them */
const FIELDS: PersonaField[] = [];

function opened(
  openBranchKey: string | null = 'b-ambulance',
  now = 1000,
  branchKeys: string[] = BRANCH_KEYS
): PersonaAction {
  return { type: 'opened', fields: FIELDS, openBranchKey, branchKeys, now };
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
    const running = reduce(before, { type: 'generateAll', now: 3000 });
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
    const running = reduce(ready(), { type: 'generateOne', slot: 1, now: 3000 });
    const merged = reduce(running, { type: 'generateOne', slot: 0, now: 3500 });
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
      { type: 'generateAll', now: 3000 },
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
    const state = reduce(before, { type: 'generateOne', slot: 1, now: 3000 });
    expect(state.run).toEqual({ runId: 2, startedAt: 3000, slots: ['kept', 'free', 'kept'] });
    expect(statuses(state)).toEqual(['ready', 'generating', 'ready']);
    expect(state.personas?.[0]).toBe(before.personas?.[0]);
    expect(state.personas?.[1].values).toBe(before.personas?.[1].values);
  });

  it('[ready] → [ready + run]: all three generated anew', () => {
    const state = reduce(ready(), { type: 'generateAll', now: 3000 });
    expect(state.run).toEqual({ runId: 2, startedAt: 3000, slots: ['free', 'free', 'free'] });
    expect(statuses(state)).toEqual(['generating', 'generating', 'generating']);
  });

  it('[ready + run] → [ready]: new values for the free slot, the rest unchanged', () => {
    const before = reduce(ready(), { type: 'generateOne', slot: 1, now: 3000 });
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
    const withHidden: PersonaState = {
      ...base,
      personas: (base.personas ?? []).map((persona) => ({
        ...persona,
        values: { ...persona.values, [CLASSES]: [], [ISSUE_B]: '2020-01-01' },
      })),
    };
    const running = reduce(withHidden, { type: 'generateOne', slot: 0, now: 3000 });
    const state = reduce(running, succeeded(running, answer(['Esslingen', 'Y', 'Z'])));
    expect(state.personas?.[0].values).toEqual({ [CITY]: 'Esslingen' });
    expect(state.personas?.[1].values[ISSUE_B]).toBe('2020-01-01');
  });

  it('merges a request into the running run: a new run id, the free slots united', () => {
    const first = reduce(ready(), { type: 'generateOne', slot: 1, now: 3000 });
    const merged = reduce(first, { type: 'generateOne', slot: 0, now: 3500 });
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
    const first = reduce(ready(), { type: 'generateOne', slot: 2, now: 3000 });
    const state = reduce(first, { type: 'generateAll', now: 3200 });
    expect(state.run).toEqual({ runId: 3, startedAt: 3200, slots: ['free', 'free', 'free'] });
  });

  it('changes nothing when the running run already generates what is asked', () => {
    const one = reduce(ready(), { type: 'generateOne', slot: 1, now: 3000 });
    expect(reduce(one, { type: 'generateOne', slot: 1, now: 3100 })).toBe(one);
    const all = reduce(ready(), { type: 'generateAll', now: 3000 });
    expect(reduce(all, { type: 'generateOne', slot: 0, now: 3100 })).toBe(all);
    expect(reduce(all, { type: 'retry', now: 3100 })).toBe(all);
  });

  it('frees every slot while there are no personas yet', () => {
    const running = firstRun();
    expect(reduce(running, { type: 'generateOne', slot: 1, now: 2000 })).toBe(running);
    const failed = reduce(running, { type: 'runFailed', runId: 1 });
    const state = reduce(failed, { type: 'generateOne', slot: 1, now: 2000 });
    expect(state.run).toEqual({ runId: 2, startedAt: 2000, slots: ['free', 'free', 'free'] });
  });

  it('clears an earlier failure when a run starts', () => {
    const failed = reduce(
      ready(),
      { type: 'generateAll', now: 3000 },
      { type: 'runFailed', runId: 2 }
    );
    const state = reduce(failed, { type: 'generateOne', slot: 0, now: 4000 });
    expect(state.failed).toBe(false);
    expect(state.run).toEqual({ runId: 3, startedAt: 4000, slots: ['free', 'kept', 'kept'] });
  });

  it('ends edit mode for a persona being generated, not for another one', () => {
    const editing: PersonaState = { ...ready(), editing: 1 };
    expect(reduce(editing, { type: 'generateOne', slot: 1, now: 3000 }).editing).toBeNull();
    expect(reduce(editing, { type: 'generateOne', slot: 0, now: 3000 }).editing).toBe(1);
    expect(reduce(editing, { type: 'generateAll', now: 3000 }).editing).toBeNull();
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
    const running = reduce(ready(), { type: 'generateOne', slot: 0, now: 3000 });
    const state = reduce(
      running,
      { type: 'select', slot: 1 },
      { type: 'selectBranch', branchKey: 'b-main' }
    );
    expect(state.run).toBe(running.run);
    expect(state.personas).toBe(running.personas);
  });
});
