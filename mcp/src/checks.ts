// The rule checks of the MCP server (research R14): `runChecks()` checks checked trees with
// `checkBranch()` off the request path, in the worker thread of `checksWorker.ts`, with the
// editor's budgets (`rules/src/checks/constants.ts`): the worker stops asking questions
// `WORKER_STOP_MS` after the call, and a watchdog terminates it `WATCHDOG_MS` after the call. A
// branch that didn't finish by then comes back as the editor shows it: not checked completely,
// with no findings. Nothing is stored or logged (FR-035)
import { Worker } from 'node:worker_threads';
import { WATCHDOG_MS, WORKER_STOP_MS } from '@konnekt/rules/checks/constants';
import type {
  BranchCheck,
  CheckedBranch,
  CheckedItem,
  CheckMessage,
  WorkerMessage,
} from '@konnekt/rules/checks/types';

/**
 * The worker's entry, next to this module once built (`dist/checksWorker.js`, the second output of
 * `vite.config.ts`). A build without it fails the run, which then reports every branch as not
 * checked completely, rather than checking on the main thread unnoticed
 */
const WORKER_URL = new URL('./checksWorker.js', import.meta.url);

/**
 * Whether this module runs from its TypeScript source (`vite-node` in `npm run dev`, and Vitest):
 * Node can't load the worker's TypeScript entry, whose `rules/` imports have no extensions, so the
 * checks then run on the main thread (`checkInProcess()`)
 */
const FROM_SOURCES = import.meta.url.endsWith('.ts');

/** The one run of a worker: every worker checks one call's branches, then is terminated */
const RUN_ID = 1;

/** What `runChecks()` may be given besides the branches; the defaults are the editor's */
export interface RunChecksOptions {
  /**
   * When the watchdog ends the run, in milliseconds after the call. Default: `deadlineMs` plus
   * the editor's margin (`WATCHDOG_MS - WORKER_STOP_MS`)
   */
  watchdogMs?: number;
  /**
   * Starts the worker; the default starts `checksWorker.js`, or none from the sources. For the
   * tests, which give the run a worker of their own. A worker that can't start may throw
   */
  startWorker?: () => Worker | null;
}

/** The clock of the deadline and the watchdog, the same as the worker's */
function now(): number {
  return performance.timeOrigin + performance.now();
}

function countRules(items: readonly CheckedItem[]): number {
  return items.reduce(
    (count, item) => count + (item.type === 'rule' ? 1 : countRules(item.items)),
    0
  );
}

/**
 * A branch's result when the run ended without it, as the editor's run state makes it: not
 * complete, no notice, no findings, and its rules counted
 */
export function notChecked(checked: CheckedBranch): BranchCheck {
  return {
    branchKey: checked.branchKey,
    fingerprint: checked.fingerprint,
    complete: false,
    notice: null,
    findings: [],
    checkedRules: countRules(checked.items),
  };
}

/** The results received, in the order of `branches`, and the branches without one not checked */
function completed(branches: readonly CheckedBranch[], results: readonly BranchCheck[]) {
  return branches.map((checked, index) => results[index] ?? notChecked(checked));
}

/** Starts `checksWorker.js` next to this module, or none from the sources */
function startBuiltWorker(): Worker | null {
  return FROM_SOURCES ? null : new Worker(WORKER_URL);
}

/**
 * Checks the branches on this thread, from the sources: the same `checkBranch()`
 * and deadline, a turn of the event loop between branches, and none started after the watchdog
 */
async function checkInProcess(
  branches: readonly CheckedBranch[],
  deadline: number,
  watchdog: number
): Promise<BranchCheck[]> {
  const { checkBranch } = await import('@konnekt/rules/checks/findings');
  const results: BranchCheck[] = [];
  try {
    for (const checked of branches) {
      if (now() >= watchdog) {
        break;
      }
      results.push(checkBranch(checked, { deadline, now }));
      await new Promise((resolve) => setImmediate(resolve));
    }
  } catch {
    // A branch the checks fail on is not checked, as when the editor's worker fails
  }
  return completed(branches, results);
}

/** Checks the branches in `worker`, until it posts 'done', fails, exits, or the watchdog ends it */
function checkInWorker(
  worker: Worker,
  branches: readonly CheckedBranch[],
  deadline: number,
  watchdogAfter: number
): Promise<BranchCheck[]> {
  return new Promise((resolve) => {
    const results: BranchCheck[] = [];
    let ended = false;
    const end = () => {
      if (ended) {
        return;
      }
      ended = true;
      clearTimeout(watchdog);
      worker.removeAllListeners();
      // Errors after the end, such as the exit of a terminated worker, are nobody's concern
      worker.on('error', () => {});
      void worker.terminate().catch(() => {});
      resolve(completed(branches, results));
    };
    const watchdog = setTimeout(end, Math.max(0, watchdogAfter));
    worker.on('message', (message: WorkerMessage) => {
      if (message.runId !== RUN_ID) {
        return;
      }
      if (message.type === 'result') {
        results.push(message.check);
      } else if (message.type === 'done') {
        end();
      }
    });
    // A worker that can't start, throws or exits ends the run at once, as the editor's 'failed'
    worker.on('error', end);
    worker.on('messageerror', end);
    worker.on('exit', end);
    const message: CheckMessage = {
      type: 'check',
      runId: RUN_ID,
      deadline,
      branches: [...branches],
    };
    worker.postMessage(message);
  });
}

/**
 * Runs the rule checks of `branches` (from `buildCheckedBranch()`) as the editor does, and
 * resolves with one `BranchCheck` per branch, in the order given; it never rejects.
 *
 * - `deadlineMs`: when the checks stop asking questions, in milliseconds after the call. Default
 *   `WORKER_STOP_MS` (4.5 s), the deadline the editor posts to its worker, so that results are
 *   in by `RUN_DEADLINE_MS` (5 s); the watchdog terminates the worker at `WATCHDOG_MS` (5.5 s).
 * - A branch that didn't finish (the deadline passed, the worker failed to start or failed, or
 *   the watchdog ended it) has `complete: false`; one the worker never reached also has
 *   `notice: null`, `findings: []` and its rules counted in `checkedRules` (`notChecked()`).
 */
export async function runChecks(
  branches: readonly CheckedBranch[],
  deadlineMs: number = WORKER_STOP_MS,
  options: RunChecksOptions = {}
): Promise<BranchCheck[]> {
  if (branches.length === 0) {
    return [];
  }
  const startedAt = now();
  const deadline = startedAt + deadlineMs;
  const watchdogMs = options.watchdogMs ?? deadlineMs + (WATCHDOG_MS - WORKER_STOP_MS);
  let worker: Worker | null;
  try {
    worker = (options.startWorker ?? startBuiltWorker)();
  } catch {
    return completed(branches, []);
  }
  if (worker === null) {
    return checkInProcess(branches, deadline, startedAt + watchdogMs);
  }
  return checkInWorker(worker, branches, deadline, startedAt + watchdogMs - now());
}
