// The personas' state and lifecycle (specs/004-rule-test-personas, data-model.md "Persona state";
// research R9, R10; FR-004, FR-012, FR-013): `personaStateReducer()` decides which run to start
// and with which slot kinds, merges a request into the running run, ignores answers of superseded
// runs, and keeps the selections. Pure: the hook passes the request's time as `now`. Bundle rule
// (research R9, R16): this module is in the main bundle and imports neither `results.ts`,
// `fields.ts`, `evaluation.ts` nor anything that reaches `checks/checkedTree.ts` or `checks/text.ts`.
// The announcement is composed in the language `setValue` carries (spec 009, R4), the language of
// the moment; one already stored isn't recomposed when the language switches (a live region)
import { DEFAULT_LANGUAGE } from '../language';
import { announcementOf } from './announcements';
import { PERSONA_IDS } from './constants';
import type {
  GeneratedMessage,
  Persona,
  PersonaAction,
  PersonaField,
  PersonaSlot,
  PersonaState,
  SlotKind,
} from './types';
import { changedKeys } from './values';

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
  announcementId: 0,
};

/** Every persona generated anew: the first run, "Generate all again" and "Try again" */
const ALL_FREE: readonly SlotKind[] = ['free', 'free', 'free'];

/**
 * How much of a slot a run generates, for merging two requests: a free slot stays free, a filled
 * one stays filled unless the other request frees it (research R8, R9)
 */
const SLOT_RANK: Readonly<Record<SlotKind, number>> = { kept: 0, filled: 1, free: 2 };

/** The `setValue` action */
type SetValueAction = Extract<PersonaAction, { type: 'setValue' }>;

/** The personas' state after `action` */
export function personaStateReducer(state: PersonaState, action: PersonaAction): PersonaState {
  switch (action.type) {
    case 'opened':
      return opened(state, action.fields, action.openBranchKey, action.branchKeys, action.now);
    case 'generateOne':
      return generateOne(state, action.slot, action.fields, action.now);
    case 'generateAll':
      return generateAll(state, action.fields, action.now);
    case 'confirmed':
      return confirmed(state, action.now);
    case 'cancelled':
      return state.confirm === null ? state : { ...state, confirm: null };
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
    case 'setValue':
      return setValue(state, action);
    case 'rename':
      return rename(state, action.slot, action.name);
    case 'startEditing':
      return startEditing(state, action.slot);
    case 'stopEditing':
      return state.editing === null ? state : { ...state, editing: null };
  }
}

/** The persona in `slot` when it is ready, otherwise null: a persona being generated can't be edited */
function readyPersona(state: PersonaState, slot: PersonaSlot): Persona | null {
  const persona = state.personas?.[slot];
  return persona?.status === 'ready' ? persona : null;
}

/** The state with the question closed, the same object when none is open */
function withoutConfirm(state: PersonaState): PersonaState {
  return state.confirm === null ? state : { ...state, confirm: null };
}

/** "Generate again": asks first when the persona has changes, otherwise starts the run */
function generateOne(
  state: PersonaState,
  slot: PersonaSlot,
  fields: readonly PersonaField[],
  now: number
): PersonaState {
  const persona = readyPersona(state, slot);
  if (persona !== null && changedKeys(persona, fields).length > 0) {
    return { ...state, confirm: { type: 'one', slot } };
  }
  return requestRun(withoutConfirm(state), oneFree(slot), now);
}

/**
 * "Generate all again": asks first, naming every ready persona with changes, otherwise starts the
 * run. A persona being generated is not asked about again: its question was answered (FR-012)
 */
function generateAll(
  state: PersonaState,
  fields: readonly PersonaField[],
  now: number
): PersonaState {
  const changed = ([0, 1, 2] as const).filter((slot) => {
    const persona = readyPersona(state, slot);
    return persona !== null && changedKeys(persona, fields).length > 0;
  });
  if (changed.length > 0) {
    return { ...state, confirm: { type: 'all', changed } };
  }
  return requestRun(withoutConfirm(state), ALL_FREE, now);
}

/** The question's "Generate new data": closes it and starts the run it was about */
function confirmed(state: PersonaState, now: number): PersonaState {
  const { confirm } = state;
  if (confirm === null) {
    return state;
  }
  return requestRun(
    withoutConfirm(state),
    confirm.type === 'one' ? oneFree(confirm.slot) : ALL_FREE,
    now
  );
}

/**
 * One value of a ready persona changes; `generated` never does. The announcement is the text of
 * the outcome changes, or '' when none moved (FR-017), in the action's language (English when it
 * has none); every text raises `announcementId`
 */
function setValue(state: PersonaState, action: SetValueAction): PersonaState {
  const persona = readyPersona(state, action.slot);
  if (persona === null || state.personas === null) {
    return state;
  }
  const announcement = announcementOf(
    action.before,
    action.after,
    persona,
    action.branches,
    action.language ?? DEFAULT_LANGUAGE
  );
  const personas = state.personas.map((other, index) =>
    index === action.slot
      ? { ...other, values: { ...other.values, [action.key]: action.value } }
      : other
  );
  return {
    ...state,
    personas,
    announcement,
    announcementId: announcement === '' ? state.announcementId : state.announcementId + 1,
  };
}

/** A new name for a ready persona; an empty or blank one is ignored, since a name is never empty */
function rename(state: PersonaState, slot: PersonaSlot, name: string): PersonaState {
  const persona = readyPersona(state, slot);
  if (persona === null || state.personas === null || name.trim() === '') {
    return state;
  }
  return {
    ...state,
    personas: state.personas.map((other, index) => (index === slot ? { ...other, name } : other)),
  };
}

/** Edit mode for a persona, never for one being generated, or while there are no personas (FR-013) */
function startEditing(state: PersonaState, slot: PersonaSlot): PersonaState {
  if (readyPersona(state, slot) === null || state.editing === slot) {
    return state;
  }
  return { ...state, editing: slot };
}

/** Whether the persona has no value, not even an empty one, for a current field (FR-020) */
function lacksValue(persona: Persona, fields: readonly PersonaField[]): boolean {
  return fields.some((field) => !Object.hasOwn(persona.values, field.key));
}

/**
 * The step opens: selects the rules step's open branch, or the first one when it is gone. Without
 * personas, without a run and without a failure, starts the first run with every slot free. With
 * personas, a persona that lacks a value for a current field is filled and the others are kept: a
 * fill run, merged into a running one (research R9; FR-020). Hidden values are values, so a field
 * that comes back is never filled. A running run is never started twice, and a failure stays until
 * "Try again" (FR-013)
 */
function opened(
  state: PersonaState,
  fields: readonly PersonaField[],
  openBranchKey: string | null,
  branchKeys: readonly string[],
  now: number
): PersonaState {
  const branchKey =
    openBranchKey !== null && branchKeys.includes(openBranchKey)
      ? openBranchKey
      : (branchKeys[0] ?? null);
  // Opening the step again ends edit mode: the drafts went with the panel (design-notes 5.3)
  const next =
    branchKey === state.branchKey && state.editing === null
      ? state
      : { ...state, branchKey, editing: null };
  if (next.personas === null) {
    return next.run === null && !next.failed ? requestRun(next, ALL_FREE, now) : next;
  }
  if (next.failed) {
    return next;
  }
  const request = next.personas.map((persona): SlotKind =>
    lacksValue(persona, fields) ? 'filled' : 'kept'
  );
  return request.includes('filled') ? requestRun(next, request, now) : next;
}

/** One persona generated anew, the other two kept (FR-012) */
function oneFree(slot: PersonaSlot): SlotKind[] {
  return [0, 1, 2].map((index) => (index === slot ? 'free' : 'kept'));
}

/**
 * Starts a run for `request`, or merges it into the running one: a new run id whose slots are the
 * union of both, so that the hook supersedes the running worker (research R9). Without personas
 * every slot is free. A request the running run already covers changes nothing. The personas of
 * free slots become placeholders (`'generating'`), those of filled slots too, for their new
 * fields (`'filling'`), and a persona being generated or filled leaves edit mode (FR-013)
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
    personas: personas?.map((persona, index) => placeholderOf(persona, slots[index])) ?? null,
    run: { runId, startedAt: now, slots },
    lastRunId: runId,
    failed: false,
    editing: state.editing !== null && slots[state.editing] !== 'kept' ? null : state.editing,
  };
}

/**
 * The persona as a run of `kind` leaves it: a free slot's is `'generating'`, a filled slot's
 * `'filling'` unless it is generated anyway, a kept slot's stays as it is
 */
function placeholderOf(persona: Persona, kind: SlotKind): Persona {
  const status =
    kind === 'free' ? 'generating' : kind === 'filled' ? fillingStatusOf(persona) : persona.status;
  return status === persona.status ? persona : { ...persona, status };
}

/** `'filling'` for a persona that is ready, and what it is for one that is already a placeholder */
function fillingStatusOf(persona: Persona): Persona['status'] {
  return persona.status === 'ready' ? 'filling' : persona.status;
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
        case 'filled': {
          // Only the fields that were absent: a value the persona has is fixed (FR-020)
          const added = Object.fromEntries(
            Object.entries(answer.values).filter(([key]) => !Object.hasOwn(persona.values, key))
          );
          return {
            ...persona,
            values: { ...persona.values, ...added },
            generated: { ...persona.generated, ...added },
            status: 'ready',
          };
        }
        case 'kept':
          return persona;
      }
    });
  }
  return { ...state, personas, run: null, failed: false };
}

/**
 * The failure state (FR-013, F7): no run, and the personas keep their last values, those being
 * generated or filled back to `'ready'` with them
 */
function failed(state: PersonaState): PersonaState {
  return {
    ...state,
    personas:
      state.personas?.map((persona) =>
        persona.status === 'ready' ? persona : { ...persona, status: 'ready' }
      ) ?? null,
    run: null,
    failed: true,
  };
}
