// The run state of the rule checks (specs/003-rule-consistency-checks, research R10; data-model.md
// "A check run: lifecycle"): the pure reducer behind `useRuleChecks()`. Per branch key, a branch
// is pending from a change that gives it a new fingerprint until its result is posted, or done.
// A cached result with the same fingerprint, such as the one before an undo, is used at once. The
// hook does what touches the browser: the worker, its messages, the clock and the watchdog
import { announcementsFor } from './announcements';
import { MAX_EARLIER_RESULTS, WATCHDOG_MS, WORKER_STOP_MS } from './constants';
import type {
  BranchCheck,
  BranchRun,
  ChangeAction,
  CheckedItem,
  CheckMessage,
  CheckRun,
  ItemFinding,
  ItemNames,
  ResultCache,
  RunAction,
  RunState,
} from './types';

/** No branch, no run, no result */
export const initialRunState: RunState = {
  branches: [],
  shownBranchKey: '',
  byBranch: {},
  run: null,
  nextRunId: 1,
  cache: { latest: {}, earlier: [] },
  announcement: '',
};

// The cache

/** Adds a complete result to the earlier ones, as the newest of its fingerprint, within the limit */
function withEarlier(earlier: readonly BranchCheck[], check: BranchCheck): BranchCheck[] {
  return [...earlier.filter((other) => other.fingerprint !== check.fingerprint), check].slice(
    -MAX_EARLIER_RESULTS
  );
}

/** Keeps a branch's latest result aside, as an earlier one, when it is complete */
function setAside(earlier: readonly BranchCheck[], check: BranchCheck | undefined): BranchCheck[] {
  return check?.complete ? withEarlier(earlier, check) : [...earlier];
}

/** Makes `check` the latest result of its branch, and keeps the one before aside */
function remember(cache: ResultCache, check: BranchCheck): ResultCache {
  const before = cache.latest[check.branchKey];
  const earlier =
    before && before.fingerprint !== check.fingerprint
      ? setAside(cache.earlier, before)
      : cache.earlier;
  return { latest: { ...cache.latest, [check.branchKey]: check }, earlier };
}

/**
 * A complete result with this fingerprint, latest ones first, then the newest earlier one, for
 * the branch `branchKey`. Equal fingerprints have equal results, whichever branch had it
 */
export function cachedResult(
  cache: ResultCache,
  fingerprint: string,
  branchKey: string
): BranchCheck | null {
  const latest = Object.values(cache.latest);
  const found =
    latest.find((check) => check.complete && check.fingerprint === fingerprint) ??
    [...cache.earlier].reverse().find((check) => check.fingerprint === fingerprint);
  return found ? { ...found, branchKey } : null;
}

// What to show

/** Every item a finding names: its own, and those of its reason */
function itemsOf(finding: ItemFinding): string[] {
  const { reason } = finding;
  if (reason === null) {
    return [finding.itemId];
  }
  switch (reason.type) {
    case 'with':
    case 'members':
      return [finding.itemId, ...reason.items];
    case 'condition':
      return [finding.itemId];
    case 'same':
      return [finding.itemId, reason.item];
    case 'implied_by':
      return [finding.itemId, ...reason.items, ...reason.orItems];
    case 'implies':
      return [finding.itemId, ...reason.items, ...reason.givenItems];
  }
}

/**
 * A pending branch's last result without the findings on items that are gone from its current
 * tree, its own or those of its reason, so that notes don't flicker while a run is pending
 */
export function withoutGoneItems(check: BranchCheck, names: ItemNames): BranchCheck {
  const findings = check.findings.filter((finding) =>
    itemsOf(finding).every((id) => names.has(id))
  );
  return findings.length === check.findings.length ? check : { ...check, findings };
}

function byBranchOf(branches: readonly BranchRun[], cache: ResultCache): RunState['byBranch'] {
  return Object.fromEntries(
    branches.map(({ branch, names, status }) => {
      const latest = cache.latest[branch.key] ?? null;
      const shown = latest && status === 'pending' ? withoutGoneItems(latest, names) : latest;
      return [branch.key, shown];
    })
  );
}

// Results and runs

/** The keys of `branches`, the shown one first, then tab order */
function inRunOrder(branches: readonly BranchRun[], shownBranchKey: string): string[] {
  const keys = branches.map(({ branch }) => branch.key);
  return keys.includes(shownBranchKey)
    ? [shownBranchKey, ...keys.filter((key) => key !== shownBranchKey)]
    : keys;
}

function countRules(items: readonly CheckedItem[]): number {
  return items.reduce(
    (count, item) => count + (item.type === 'rule' ? 1 : countRules(item.items)),
    0
  );
}

/** A pending branch's result when the run ended without it: incomplete, with no findings */
function notChecked({ branch, checked }: BranchRun): BranchCheck {
  return {
    branchKey: branch.key,
    fingerprint: checked.fingerprint,
    complete: false,
    notice: null,
    findings: [],
    checkedRules: countRules(checked.items),
  };
}

/**
 * Turns pending branches into done ones with these results, and announces what changed, the
 * shown branch first, then tab order. The announcement stays when there is nothing to say
 */
function settle(state: RunState, results: readonly BranchCheck[]): RunState {
  if (results.length === 0) {
    return state;
  }
  const done = new Map(results.map((check) => [check.branchKey, check]));
  let { cache } = state;
  const sentences = new Map<string, string[]>();
  const branches = state.branches.map((entry) => {
    const check = done.get(entry.branch.key);
    if (!check) {
      return entry;
    }
    const previous = cache.latest[entry.branch.key] ?? null;
    sentences.set(
      entry.branch.key,
      announcementsFor(previous, check, entry.cause, {
        branch: entry.branch,
        names: entry.names,
        shownBranch: state.shownBranchKey,
      })
    );
    cache = remember(cache, check);
    return { ...entry, status: 'done' as const };
  });
  const announcement = inRunOrder(branches, state.shownBranchKey)
    .flatMap((key) => sentences.get(key) ?? [])
    .join(' ');
  return { ...state, branches, cache, announcement: announcement || state.announcement };
}

function pendingKeys(branches: readonly BranchRun[]): string[] {
  return branches.filter(({ status }) => status === 'pending').map(({ branch }) => branch.key);
}

/** Ends the run when none of its branches is pending any more, and updates what to show */
function tidy(state: RunState): RunState {
  const pending = new Set(pendingKeys(state.branches));
  const run = state.run && state.run.branchKeys.some((key) => pending.has(key)) ? state.run : null;
  return { ...state, run, byBranch: byBranchOf(state.branches, state.cache) };
}

function change(state: RunState, action: ChangeAction): RunState {
  const before = new Map(state.branches.map((entry) => [entry.branch.key, entry]));
  const current = new Set(action.branches.map(({ branch }) => branch.key));
  const cached: BranchCheck[] = [];
  let changed = false;
  const branches = action.branches.map((input): BranchRun => {
    const old = before.get(input.branch.key);
    if (old && old.checked.fingerprint === input.checked.fingerprint) {
      return { ...input, status: old.status, cause: old.cause };
    }
    const check = cachedResult(state.cache, input.checked.fingerprint, input.branch.key);
    if (check) {
      cached.push(check);
    } else {
      changed = true;
    }
    return { ...input, status: 'pending', cause: action.cause };
  });
  // A branch that no longer exists leaves the state; its latest result stays as an earlier one
  const gone = Object.entries(state.cache.latest).filter(([key]) => !current.has(key));
  const cache: ResultCache = {
    latest: Object.fromEntries(
      Object.entries(state.cache.latest).filter(([key]) => current.has(key))
    ),
    earlier: gone.reduce((earlier, [, check]) => setAside(earlier, check), state.cache.earlier),
  };
  const settled = settle(
    { ...state, branches, shownBranchKey: action.shownBranchKey, cache },
    cached
  );
  if (!changed) {
    return tidy(settled);
  }
  // A new fingerprint without a cached result supersedes the run: the next one checks every
  // pending branch, those of the superseded run included
  const pending = new Set(pendingKeys(settled.branches));
  const run: CheckRun = {
    runId: state.nextRunId,
    startedAt: action.now,
    branchKeys: inRunOrder(settled.branches, action.shownBranchKey).filter((key) =>
      pending.has(key)
    ),
  };
  return tidy({ ...settled, run, nextRunId: state.nextRunId + 1 });
}

function result(state: RunState, runId: number, check: BranchCheck): RunState {
  const entry = state.branches.find(({ branch }) => branch.key === check.branchKey);
  if (
    state.run?.runId !== runId ||
    !state.run.branchKeys.includes(check.branchKey) ||
    entry?.status !== 'pending' ||
    entry.checked.fingerprint !== check.fingerprint
  ) {
    return state;
  }
  return tidy(settle(state, [check]));
}

function end(state: RunState, runId: number): RunState {
  const { run } = state;
  if (run?.runId !== runId) {
    return state;
  }
  const keys = new Set(run.branchKeys);
  const results = state.branches
    .filter(({ branch, status }) => status === 'pending' && keys.has(branch.key))
    .map(notChecked);
  return tidy({ ...settle(state, results), run: null });
}

/**
 * The reducer of `useRuleChecks()`. Messages of a run other than the current one are ignored, as
 * are results whose branch is gone or has another fingerprint by now
 */
export function runStateReducer(state: RunState, action: RunAction): RunState {
  switch (action.type) {
    case 'change':
      return change(state, action);
    case 'show':
      return { ...state, shownBranchKey: action.shownBranchKey };
    case 'result':
      return result(state, action.runId, action.check);
    case 'done':
    case 'watchdog':
    case 'failed':
      return end(state, action.runId);
  }
}

// What the hook reads

/**
 * The worker's `'check'` message of the current run: its branches' checked trees in the run's
 * order, and the deadline `WORKER_STOP_MS` after the change. Null without a run
 */
export function checkMessageOf(state: RunState): CheckMessage | null {
  const { run } = state;
  if (!run) {
    return null;
  }
  const checked = new Map(state.branches.map((entry) => [entry.branch.key, entry.checked]));
  return {
    type: 'check',
    runId: run.runId,
    deadline: run.startedAt + WORKER_STOP_MS,
    branches: run.branchKeys.flatMap((key) => {
      const tree = checked.get(key);
      return tree ? [tree] : [];
    }),
  };
}

/** When the watchdog ends a run whose worker hasn't posted `'done'`: `WATCHDOG_MS` after the change */
export function watchdogAt(run: CheckRun): number {
  return run.startedAt + WATCHDOG_MS;
}
