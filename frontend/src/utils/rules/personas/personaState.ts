// The personas' state and lifecycle (specs/004-rule-test-personas, data-model.md "Persona state";
// research R9, R10; FR-004, FR-012, FR-013): `personaStateReducer()` decides which run to start
// and with which slot kinds, merges a request into the running run, ignores answers of superseded
// runs, and keeps the selections. Pure: the hook passes the request's time as `now`. Bundle rule
// (research R9, R16): this module is in the main bundle and imports neither `results.ts`,
// `fields.ts`, `evaluation.ts` nor anything that reaches `checks/checkedTree.ts` or `checks/text.ts`
import { PERSONA_IDS } from './constants';
import type {
  GeneratedMessage,
  Persona,
  PersonaAction,
  PersonaSlot,
  PersonaState,
  SlotKind,
} from './types';

/** Before the step first opens: no personas, no run, the first persona selected (FR-004) */
export const initialPersonaState: PersonaState = {
  personas: null,
  selected: 0,
  branchKey: null,
  run: null,
  lastRunId: 0,
  failed: false,
  editing: null,
  confirm: null,
  announcement: '',
};

/** Every persona generated anew: the first run, "Generate all again" and "Try again" */
const ALL_FREE: readonly SlotKind[] = ['free', 'free', 'free'];

/**
 * How much of a slot a run generates, for merging two requests: a free slot stays free, a filled
 * one stays filled unless the other request frees it (research R8, R9)
 */
const SLOT_RANK: Readonly<Record<SlotKind, number>> = { kept: 0, filled: 1, free: 2 };

/** The personas' state after `action` */
export function personaStateReducer(state: PersonaState, action: PersonaAction): PersonaState {
  switch (action.type) {
    case 'opened':
      return opened(state, action.openBranchKey, action.branchKeys, action.now);
    case 'generateOne':
      return requestRun(state, oneFree(action.slot), action.now);
    case 'generateAll':
      return requestRun(state, ALL_FREE, action.now);
    case 'retry':
      return requestRun(state, ALL_FREE, action.now);
    case 'runSucceeded':
      return runSucceeded(state, action.runId, action.slots);
    case 'runFailed':
      if (action.runId !== null && action.runId !== state.run?.runId) {
        return state;
      }
      return failed(state);
    case 'select':
      return action.slot === state.selected
        ? state
        : { ...state, selected: action.slot, editing: null };
    case 'selectBranch':
      return action.branchKey === state.branchKey
        ? state
        : { ...state, branchKey: action.branchKey, editing: null };
  }
}

/**
 * The step opens: selects the rules step's open branch, or the first one when it is gone. Without
 * personas, without a run and without a failure, starts the first run with every slot free. A
 * running run is never started twice, and a failure stays until "Try again" (FR-013)
 */
function opened(
  state: PersonaState,
  openBranchKey: string | null,
  branchKeys: readonly string[],
  now: number
): PersonaState {
  const branchKey =
    openBranchKey !== null && branchKeys.includes(openBranchKey)
      ? openBranchKey
      : (branchKeys[0] ?? null);
  const next = branchKey === state.branchKey ? state : { ...state, branchKey };
  if (next.personas === null && next.run === null && !next.failed) {
    return requestRun(next, ALL_FREE, now);
  }
  return next;
}

/** One persona generated anew, the other two kept (FR-012) */
function oneFree(slot: PersonaSlot): SlotKind[] {
  return [0, 1, 2].map((index) => (index === slot ? 'free' : 'kept'));
}

/**
 * Starts a run for `request`, or merges it into the running one: a new run id whose slots are the
 * union of both, so that the hook supersedes the running worker (research R9). Without personas
 * every slot is free. A request the running run already covers changes nothing. The personas of
 * free slots become placeholders, and a persona being generated leaves edit mode (FR-013)
 */
function requestRun(state: PersonaState, request: readonly SlotKind[], now: number): PersonaState {
  const { personas, run } = state;
  const slots =
    personas === null
      ? [...ALL_FREE]
      : request.map((kind, index) => (run === null ? kind : mergedSlot(run.slots[index], kind)));
  if (run !== null && slots.every((kind, index) => kind === run.slots[index])) {
    return state;
  }
  const runId = state.lastRunId + 1;
  return {
    ...state,
    personas:
      personas?.map((persona, index) =>
        slots[index] === 'free' ? { ...persona, status: 'generating' } : persona
      ) ?? null,
    run: { runId, startedAt: now, slots },
    lastRunId: runId,
    failed: false,
    editing: state.editing !== null && slots[state.editing] === 'free' ? null : state.editing,
  };
}

/** The kind of a slot that two requests ask for: the one that generates more of it */
function mergedSlot(running: SlotKind, requested: SlotKind): SlotKind {
  return SLOT_RANK[requested] > SLOT_RANK[running] ? requested : running;
}

/**
 * The worker's answer. For the running run only; an older run id is ignored. On the first
 * success, creates the three personas with the names drawn. A free slot's values are replaced,
 * which drops its hidden values; a filled slot gains the new fields; a kept slot stays as it was.
 * Names are kept (research R10). An answer that doesn't fit the run fails it
 */
function runSucceeded(
  state: PersonaState,
  runId: number,
  answers: GeneratedMessage['slots']
): PersonaState {
  const { run } = state;
  if (run === null || runId !== run.runId) {
    return state;
  }
  if (answers.length !== run.slots.length) {
    return failed(state);
  }
  let personas: Persona[];
  if (state.personas === null) {
    const names = answers.map((answer) => answer.name);
    if (names.some((name) => name === null || name === '')) {
      return failed(state);
    }
    personas = answers.map((answer, index) => ({
      id: PERSONA_IDS[index],
      name: names[index] as string,
      values: { ...answer.values },
      generated: { ...answer.values },
      status: 'ready',
    }));
  } else {
    personas = state.personas.map((persona, index) => {
      const answer = answers[index];
      switch (run.slots[index]) {
        case 'free':
          return {
            ...persona,
            values: { ...answer.values },
            generated: { ...answer.values },
            status: 'ready',
          };
        case 'filled':
          return {
            ...persona,
            values: { ...persona.values, ...answer.values },
            generated: { ...persona.generated, ...answer.values },
            status: 'ready',
          };
        case 'kept':
          return persona;
      }
    });
  }
  return { ...state, personas, run: null, failed: false };
}

/**
 * The failure state (FR-013, F7): no run, and the personas keep their last values, those being
 * generated back to `'ready'` with them
 */
function failed(state: PersonaState): PersonaState {
  return {
    ...state,
    personas:
      state.personas?.map((persona) =>
        persona.status === 'generating' ? { ...persona, status: 'ready' } : persona
      ) ?? null,
    run: null,
    failed: true,
  };
}
