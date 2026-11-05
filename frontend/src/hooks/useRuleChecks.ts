// The rule checks of the editor page (specs/003-rule-consistency-checks, FR-010, FR-011; research
// R10; contracts/rule-checks.md "useRuleChecks"). The run state is the pure reducer of
// `checks/runState.ts`; this hook does what touches the browser: the dynamic import of the checked
// tree, the clock, today in Germany, the worker, its messages and the watchdog. Nothing about the
// findings is stored, sent or logged (FR-018 to FR-020)
import type { LiteralContext } from '@connection-portal/rules/checks/literals';
import {
  checkMessageOf,
  initialRunState,
  runStateReducer,
  watchdogAt,
} from '@connection-portal/rules/checks/runState';
import type {
  CheckMessage,
  RuleChecks,
  RunAction,
  WorkerMessage,
} from '@connection-portal/rules/checks/types';
import {
  type Dispatch,
  type RefObject,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';

import type { ActiveRun, CheckableBranch, CheckedTreeModule, SentChange } from './types';
import { useTodayInGermany } from './useTodayInGermany';
import { actionOf, byBranchFor, causeOf, runBranchesOf, sameRunBranches } from './utils';

/** The clock of the deadline and the watchdog, the same as the worker's */
function clockNow(): number {
  return performance.timeOrigin + performance.now();
}

/**
 * Loads `checks/checkedTree.ts` once `ready`, with a dynamic `import()`: a static import would put
 * the case-folding table, which it reaches through `literals.ts` and `text.ts`, into the main
 * bundle. Null until it has loaded, and if it can't load: no branch counts as checked then
 */
function useCheckedTree(ready: boolean): CheckedTreeModule | null {
  const [checkedTree, setCheckedTree] = useState<CheckedTreeModule | null>(null);

  useEffect(() => {
    if (!ready || checkedTree) {
      return;
    }
    let ignore = false;
    import('@connection-portal/rules/checks/checkedTree').then(
      ({ buildCheckedBranch }) => {
        if (!ignore) setCheckedTree({ buildCheckedBranch });
      },
      () => {
        // Without the module there is nothing to check; editing goes on (FR-010, FR-016)
      }
    );
    return () => {
      ignore = true;
    };
  }, [ready, checkedTree]);

  return checkedTree;
}

/**
 * Starts a worker for the run of `message`, and its watchdog at `watchdogTime`. A worker that
 * can't be created, or reports an error, ends the run as failed (research R10)
 */
function startRun(
  message: CheckMessage,
  watchdogTime: number,
  dispatch: Dispatch<RunAction>
): ActiveRun {
  const { runId } = message;
  let worker: Worker;
  try {
    worker = new Worker(new URL('../workers/checks.ts', import.meta.url), {
      type: 'module',
    });
  } catch {
    // Dispatched after the effect, so that rendering never waits for it
    queueMicrotask(() => dispatch({ type: 'failed', runId }));
    return { runId, worker: null, watchdog: null };
  }
  const fail = () => dispatch({ type: 'failed', runId });
  worker.addEventListener('message', (event: MessageEvent<WorkerMessage>) =>
    dispatch(actionOf(event.data))
  );
  worker.addEventListener('error', (event) => {
    // Handled here, so the browser doesn't log it: nothing about the checks is logged
    event.preventDefault();
    fail();
  });
  worker.addEventListener('messageerror', fail);
  worker.postMessage(message);
  const watchdog = window.setTimeout(
    () => dispatch({ type: 'watchdog', runId }),
    Math.max(0, watchdogTime - clockNow())
  );
  return { runId, worker, watchdog };
}

/** Terminates the current run's worker and its watchdog, if there is one */
function stopRun(activeRef: RefObject<ActiveRun | null>): void {
  const active = activeRef.current;
  if (active) {
    active.worker?.terminate();
    if (active.watchdog !== null) {
      window.clearTimeout(active.watchdog);
    }
  }
  activeRef.current = null;
}

/**
 * The rule checks of every branch, for the rules step and the publish and save dialog.
 *
 * - `branches`: every branch of the rules state, in tab order (`RulesBranch` fits).
 * - `context`: the requested documents with only their requested fields
 *   (`requestedRuleDocuments()`) and the value sets, or null while the catalog or the value sets
 *   are loading or failed to load. Nothing is checked before. Its identity should change only with
 *   its content (`useMemo`); an equal change is not handed on anyway.
 * - `shownBranchKey`: the branch shown, which the next run checks first. Its change alone runs no
 *   check.
 *
 * After every change of `branches` or `context`, and on a new day in Germany, it builds each
 * branch's checked tree on the main thread and hands the change to the run state, which reuses
 * cached results and starts a run for the rest. The run's worker checks them in the background:
 * the hook never blocks rendering, and nothing waits for it (FR-010, FR-016)
 */
export function useRuleChecks(
  branches: readonly CheckableBranch[],
  context: LiteralContext | null,
  shownBranchKey: string
): RuleChecks {
  const [state, dispatch] = useReducer(runStateReducer, initialRunState);
  const checkedTree = useCheckedTree(context !== null);
  const today = useTodayInGermany();
  const shownRef = useRef(shownBranchKey);
  const sentRef = useRef<SentChange | null>(null);
  const activeRef = useRef<ActiveRun | null>(null);

  // Another branch shown orders the next run; it starts none. Declared before the change, so that
  // a change in the same render checks the shown branch first
  useEffect(() => {
    shownRef.current = shownBranchKey;
    dispatch({ type: 'show', shownBranchKey });
  }, [shownBranchKey]);

  useEffect(() => {
    if (!context || !checkedTree) {
      return;
    }
    const now = clockNow();
    const runBranches = runBranchesOf(branches, context, today, checkedTree);
    const sent = sentRef.current;
    if (sent && sameRunBranches(sent.branches, runBranches)) {
      return;
    }
    sentRef.current = { branches: runBranches, today };
    dispatch({
      type: 'change',
      branches: runBranches,
      shownBranchKey: shownRef.current,
      cause: causeOf(sent?.today ?? null, today),
      now,
    });
  }, [branches, context, today, checkedTree]);

  // One worker at a time, for the current run: a new run terminates the worker of the one before,
  // whose results already posted stay, and an ended run terminates its own
  useEffect(() => {
    if ((activeRef.current?.runId ?? null) === (state.run?.runId ?? null)) {
      return;
    }
    stopRun(activeRef);
    const message = checkMessageOf(state);
    if (message && state.run) {
      activeRef.current = startRun(message, watchdogAt(state.run), dispatch);
    }
  }, [state]);

  useEffect(() => () => stopRun(activeRef), []);

  return useMemo(
    () => ({
      byBranch: byBranchFor(branches, state.byBranch),
      announcement: state.announcement,
    }),
    [branches, state.byBranch, state.announcement]
  );
}
