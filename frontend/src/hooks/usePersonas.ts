// The personas of the test step (specs/004-rule-test-personas, research R9, R10;
// contracts/personas.md "usePersonas()"; FR-004, FR-013, FR-019, FR-021). The state is the pure
// reducer of `personas/personaState.ts`; this hook does what touches the browser: the dynamic
// import of `personas/results.ts`, the clock, today in Germany, the worker, its messages and the
// watchdog. Nothing about the personas is stored, sent or logged: the worker talks only to this
// page.
//
// Bundle (research R9, R16): `results.ts` reaches the evaluator, `fields.ts`,
// `checks/checkedTree.ts` and the case-folding table, so this module imports only their types, and
// loads them with the one dynamic `import()` below
import {
  type Dispatch,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';

import type { BranchInput } from '../types/form-connections';
import type { KeyedBranch } from '../utils/rules/checks/checkedTree';
import type { AnnouncedBranch, MetByBranch } from '../utils/rules/personas/announcements';
import { GENERATION_STOP_MS, GENERATION_WATCHDOG_MS } from '../utils/rules/personas/constants';
import { initialPersonaState, personaStateReducer } from '../utils/rules/personas/personaState';
import type {
  checkedBranchesOf,
  personaFieldsOf,
  resultViewOf,
  testResultsOf,
} from '../utils/rules/personas/results';
import type {
  GeneratedMessage,
  GenerateMessage,
  GenerationRun,
  Persona,
  PersonaAction,
  PersonaBranchResult,
  PersonaField,
  PersonaSlot,
  PersonaState,
  PersonaValue,
  ResultView,
  TestResults,
} from '../utils/rules/personas/types';
import type { RuleContext } from '../utils/rules/types';
import { useTodayInGermany } from './useTodayInGermany';

/** What `usePersonas()` reads from the editor page */
export interface PersonasInput {
  /** Whether the test step is shown */
  active: boolean;
  /**
   * The rules state's branches, in tab order (`RulesBranch` fits): the names are the tabs', for
   * the announcements
   */
  branches: readonly (KeyedBranch & Pick<BranchInput, 'name'>)[];
  /** The requested documents and value sets, or `null` while they load */
  context: RuleContext | null;
  /** The rules step's open branch */
  openBranchKey: string | null;
}

/** What `setValue()` compares: each branch's `met`, by branch key */
function metByBranchOf(results: Partial<Record<string, PersonaBranchResult>> | undefined) {
  const met: Record<string, boolean | undefined> = {};
  for (const [key, result] of Object.entries(results ?? {})) {
    met[key] = result?.met;
  }
  return met satisfies MetByBranch;
}

/** One persona's result for one variant, as the test step shows it: `resultViewOf()` */
export type PersonaViewOf = (
  result: PersonaBranchResult,
  branch: Pick<BranchInput, 'items'>,
  persona: Pick<Persona, 'name' | 'values'>
) => ResultView;

/** What `usePersonas()` gives the test step */
export interface Personas {
  state: PersonaState;
  /** The persona fields for the current branches; empty while `results.ts` loads */
  fields: PersonaField[];
  /** Every ready persona against every branch, or `null` while `results.ts` loads */
  results: TestResults | null;
  /** `YYYY-MM-DD`, today in Germany (`useTodayInGermany()`) */
  today: string;
  /** The reducer's dispatch, for selections, edits and confirm answers */
  dispatch: Dispatch<PersonaAction>;
  /**
   * "Generate again" for one persona. Starts the run, or sets `state.confirm` when the persona has
   * changes (FR-012)
   */
  generateOne: (slot: PersonaSlot) => void;
  /** "Generate all again". Starts the run, or sets `state.confirm` when a persona has changes */
  generateAll: () => void;
  /** The question's "Generate new data": starts the run `state.confirm` was about */
  confirmed: () => void;
  /** The question's "Cancel": closes it */
  cancelled: () => void;
  /**
   * One valid entry for a persona's field (FR-006): changes the value, and sets
   * `state.announcement` (and raises `state.announcementId`) when a variant's outcome moved
   * (FR-017). Empties should be committed as `null`, lists in value-set order
   */
  setValue: (slot: PersonaSlot, key: string, value: PersonaValue) => void;
  /** A new, non-empty name (FR-009); no announcement */
  rename: (slot: PersonaSlot, name: string) => void;
  /** "Edit data": no effect for a persona being generated (FR-013) */
  startEditing: (slot: PersonaSlot) => void;
  /** "Done" */
  stopEditing: () => void;
  /** "Try again" after a failure; loads `results.ts` again if it couldn't load */
  retry: () => void;
  /**
   * The loaded module's `resultViewOf()` with the current context and fields, so that the step
   * never imports `results.ts`; `null` exactly when `results` is
   */
  viewOf: PersonaViewOf | null;
}

/**
 * The part of `personas/results.ts` the hook uses, once its dynamic `import()` has loaded it.
 * Only its types are imported statically
 */
interface ResultsModule {
  testResultsOf: typeof testResultsOf;
  resultViewOf: typeof resultViewOf;
  personaFieldsOf: typeof personaFieldsOf;
  checkedBranchesOf: typeof checkedBranchesOf;
}

/** Whether `results.ts` has loaded: `'idle'` before the first activation, and after "Try again" */
type ModuleLoad =
  { status: 'idle' } | { status: 'loaded'; resultsModule: ResultsModule } | { status: 'failed' };

/** The worker and the run it was last given */
interface PersonaWorker {
  worker: Worker;
  /** The run posted last, 0 before the first */
  runId: number;
  /** Its run hasn't answered yet: a superseded or failed run's worker is terminated */
  busy: boolean;
}

/** No fields while `results.ts` or the context loads. Never changed */
const NO_FIELDS: PersonaField[] = [];

/** The clock of the deadline and the watchdog, the same as the worker's */
function clockNow(): number {
  return performance.timeOrigin + performance.now();
}

/** A seed for the run, from `crypto.getRandomValues()` */
function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

/**
 * Creates the personas' worker, or returns null when it can't be constructed. Its answer for the
 * run it was last given goes to the reducer; its `error` or `messageerror` terminates it and fails
 * that run (research R9)
 */
function createWorker(
  workerRef: { current: PersonaWorker | null },
  dispatch: Dispatch<PersonaAction>
): PersonaWorker | null {
  let worker: Worker;
  try {
    worker = new Worker(new URL('../utils/rules/personas/worker.ts', import.meta.url), {
      type: 'module',
    });
  } catch {
    return null;
  }
  const entry: PersonaWorker = { worker, runId: 0, busy: false };
  const fail = () => {
    worker.terminate();
    if (workerRef.current === entry) {
      workerRef.current = null;
    }
    dispatch({ type: 'runFailed', runId: entry.runId });
  };
  worker.addEventListener('message', (event: MessageEvent<GeneratedMessage>) => {
    const message = event.data;
    if (message.type !== 'generated' || message.runId !== entry.runId) {
      return;
    }
    entry.busy = false;
    dispatch({ type: 'runSucceeded', runId: message.runId, slots: message.slots });
  });
  worker.addEventListener('error', (event) => {
    // Handled here, so the browser doesn't log it: nothing about the personas is logged
    event.preventDefault();
    fail();
  });
  worker.addEventListener('messageerror', fail);
  return entry;
}

/** Terminates the worker if it exists */
function stopWorker(workerRef: { current: PersonaWorker | null }): void {
  workerRef.current?.worker.terminate();
  workerRef.current = null;
}

/** The 'generate' message of `run`: per slot its kind, the persona's name and its values */
function generateMessageOf(
  run: GenerationRun,
  personas: readonly Persona[] | null,
  resultsModule: ResultsModule,
  branches: readonly KeyedBranch[],
  context: RuleContext,
  fields: PersonaField[],
  today: string
): GenerateMessage {
  return {
    type: 'generate',
    runId: run.runId,
    deadline: run.startedAt + GENERATION_STOP_MS,
    seed: randomSeed(),
    today,
    branches: resultsModule.checkedBranchesOf(branches, context, today),
    fields,
    context: { documents: context.documents, optionSets: context.optionSets },
    slots: run.slots.map((kind, index) => ({
      kind,
      name: personas?.[index].name ?? null,
      values: personas?.[index].values ?? {},
    })),
  };
}

/**
 * Loads `personas/results.ts` on the first activation, with a dynamic `import()`. A load failure
 * fails whatever runs (`runFailed(null)`), and "Try again" sets the load back to `'idle'`
 */
function useResultsModule(
  active: boolean,
  dispatch: Dispatch<PersonaAction>
): [ModuleLoad, (load: ModuleLoad) => void] {
  const [load, setLoad] = useState<ModuleLoad>({ status: 'idle' });

  useEffect(() => {
    if (!active || load.status !== 'idle') {
      return;
    }
    let ignore = false;
    import('../utils/rules/personas/results').then(
      ({ testResultsOf, resultViewOf, personaFieldsOf, checkedBranchesOf }) => {
        if (!ignore) {
          setLoad({
            status: 'loaded',
            resultsModule: { testResultsOf, resultViewOf, personaFieldsOf, checkedBranchesOf },
          });
        }
      },
      () => {
        if (!ignore) {
          setLoad({ status: 'failed' });
          dispatch({ type: 'runFailed', runId: null });
        }
      }
    );
    return () => {
      ignore = true;
    };
  }, [active, load, dispatch]);

  return [load, setLoad];
}

/**
 * The personas of the test step, which live as long as the editor page (FR-019).
 *
 * - The first activation loads `results.ts`. Once it has loaded and `context` isn't null, each
 *   activation dispatches `opened` with the current fields, which may start the first run.
 * - No run starts while `active` is false, but a started run continues and its values apply.
 * - Each run gets the worker, created lazily: a superseded run's worker is terminated first, an
 *   idle one is reused. The request is posted with a fresh seed and `deadline = startedAt +
 *   GENERATION_STOP_MS`; the watchdog fails the run at `startedAt + GENERATION_WATCHDOG_MS`. A
 *   worker that can't be created, its `error` or `messageerror` fail the run.
 * - Editing: `setValue()` evaluates the persona before and after with the loaded module and lets
 *   the reducer announce the change; "Generate again" asks first for a persona with changes.
 * - `fields`, `results` and `viewOf` follow the branches, the personas, the context and today.
 * - The worker is terminated on unmount. Nothing is stored, sent or logged (FR-021)
 */
export function usePersonas({ active, branches, context, openBranchKey }: PersonasInput): Personas {
  const [state, dispatch] = useReducer(personaStateReducer, initialPersonaState);
  const [load, setLoad] = useResultsModule(active, dispatch);
  const today = useTodayInGermany();
  const workerRef = useRef<PersonaWorker | null>(null);
  const openedRef = useRef(false);
  const resultsModule = load.status === 'loaded' ? load.resultsModule : null;
  const { run, personas } = state;

  const fields = useMemo(
    () => (resultsModule && context ? resultsModule.personaFieldsOf(branches, context) : NO_FIELDS),
    [resultsModule, branches, context]
  );

  const results = useMemo(
    () =>
      resultsModule && context
        ? resultsModule.testResultsOf(personas ?? [], fields, branches, context, today)
        : null,
    [resultsModule, personas, fields, branches, context, today]
  );

  const viewOf = useMemo<PersonaViewOf | null>(
    () =>
      resultsModule && context
        ? (result, branch, persona) =>
            resultsModule.resultViewOf(result, branch, persona, context, fields)
        : null,
    [resultsModule, context, fields]
  );

  // Each activation opens the step once, as soon as the module and the context are there
  useEffect(() => {
    if (!active) {
      openedRef.current = false;
      return;
    }
    if (openedRef.current || !resultsModule || !context) {
      return;
    }
    openedRef.current = true;
    dispatch({
      type: 'opened',
      fields,
      openBranchKey,
      branchKeys: branches.map((branch) => branch.key),
      now: clockNow(),
    });
  }, [active, resultsModule, context, fields, openBranchKey, branches]);

  // The watchdog of each run, from its request, also while its request waits for the module
  useEffect(() => {
    if (!run) {
      return;
    }
    const { runId } = run;
    const watchdog = window.setTimeout(
      () => dispatch({ type: 'runFailed', runId }),
      Math.max(0, run.startedAt + GENERATION_WATCHDOG_MS - clockNow())
    );
    return () => window.clearTimeout(watchdog);
  }, [run]);

  // One worker, one run at a time: a superseded, failed or timed-out run's worker is terminated,
  // and each new run is posted once the module and the context are there
  useEffect(() => {
    const current = workerRef.current;
    if (current && current.busy && current.runId !== run?.runId) {
      stopWorker(workerRef);
    }
    if (!run || !resultsModule || !context || workerRef.current?.runId === run.runId) {
      return;
    }
    const entry = workerRef.current ?? createWorker(workerRef, dispatch);
    if (!entry) {
      const { runId } = run;
      // Dispatched after the effect, so that rendering never waits for it
      queueMicrotask(() => dispatch({ type: 'runFailed', runId }));
      return;
    }
    workerRef.current = entry;
    entry.runId = run.runId;
    entry.busy = true;
    entry.worker.postMessage(
      generateMessageOf(run, personas, resultsModule, branches, context, fields, today)
    );
  }, [run, personas, resultsModule, branches, context, fields, today]);

  useEffect(() => () => stopWorker(workerRef), []);

  const announced = useMemo<AnnouncedBranch[]>(
    () => branches.map(({ key, name }) => ({ key, name })),
    [branches]
  );

  const generateOne = useCallback(
    (slot: PersonaSlot) => {
      if (active) {
        dispatch({ type: 'generateOne', slot, fields, now: clockNow() });
      }
    },
    [active, fields]
  );

  const generateAll = useCallback(() => {
    if (active) {
      dispatch({ type: 'generateAll', fields, now: clockNow() });
    }
  }, [active, fields]);

  const confirmed = useCallback(() => {
    if (active) {
      dispatch({ type: 'confirmed', now: clockNow() });
    }
  }, [active]);

  const cancelled = useCallback(() => dispatch({ type: 'cancelled' }), []);

  // The persona's `met` per branch before (the memoised results) and after the change, with the
  // loaded module, so that the reducer never evaluates (Bundle rule). Without them, the value
  // changes and nothing is announced
  const setValue = useCallback(
    (slot: PersonaSlot, key: string, value: PersonaValue) => {
      const persona = personas?.[slot];
      let before: MetByBranch = {};
      let after: MetByBranch = {};
      if (persona && persona.status === 'ready' && resultsModule && context && results) {
        before = metByBranchOf(results[persona.id]);
        const changed = { ...persona, values: { ...persona.values, [key]: value } };
        after = metByBranchOf(
          resultsModule.testResultsOf([changed], fields, branches, context, today)[persona.id]
        );
      }
      dispatch({ type: 'setValue', slot, key, value, before, after, branches: announced });
    },
    [personas, resultsModule, context, results, fields, branches, today, announced]
  );

  const rename = useCallback(
    (slot: PersonaSlot, name: string) => dispatch({ type: 'rename', slot, name }),
    []
  );

  const startEditing = useCallback(
    (slot: PersonaSlot) => dispatch({ type: 'startEditing', slot }),
    []
  );

  const stopEditing = useCallback(() => dispatch({ type: 'stopEditing' }), []);

  const retry = useCallback(() => {
    if (!active) {
      return;
    }
    if (load.status === 'failed') {
      setLoad({ status: 'idle' });
    }
    dispatch({ type: 'retry', now: clockNow() });
  }, [active, load.status, setLoad]);

  return useMemo(
    () => ({
      state,
      fields,
      results,
      today,
      dispatch,
      generateOne,
      generateAll,
      confirmed,
      cancelled,
      setValue,
      rename,
      startEditing,
      stopEditing,
      retry,
      viewOf,
    }),
    [
      state,
      fields,
      results,
      today,
      generateOne,
      generateAll,
      confirmed,
      cancelled,
      setValue,
      rename,
      startEditing,
      stopEditing,
      retry,
      viewOf,
    ]
  );
}
