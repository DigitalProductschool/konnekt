// The module worker of the rule checks (specs/003-rule-consistency-checks, research R10, R15;
// contracts/rule-checks.md "Worker protocol"). On a 'check' message, it checks the branches in the
// order given and posts each branch's result as it finishes, then 'done'. It holds no state between
// messages, logs nothing and sends nothing elsewhere (FR-018 to FR-020)
import { checkBranch } from '@konnekt/rules/checks/findings';
import type { CheckMessage, WorkerMessage } from '@konnekt/rules/checks/types';

/**
 * The part of the worker's global scope this entry uses. `tsconfig.app.json` has the `DOM`
 * library, which conflicts with `WebWorker`, so the scope is typed here (research R15)
 */
interface CheckWorkerScope {
  onmessage: ((event: MessageEvent<CheckMessage>) => void) | null;
  postMessage: (message: WorkerMessage) => void;
}

const scope = self as unknown as CheckWorkerScope;

/** The clock the deadline is measured on, the same as the main thread's */
function now(): number {
  return performance.timeOrigin + performance.now();
}

scope.onmessage = (event) => {
  const { type, runId, deadline, branches } = event.data;
  if (type !== 'check') {
    return;
  }
  for (const checked of branches) {
    scope.postMessage({ type: 'result', runId, check: checkBranch(checked, { deadline, now }) });
  }
  scope.postMessage({ type: 'done', runId });
};
