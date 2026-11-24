// The worker thread of the rule checks (research R14), the Node counterpart of the SPA's
// `frontend/src/workers/checks.ts` (contracts/rule-checks.md of spec 003, "Worker protocol"). On a
// 'check' message, it checks the branches in the order given and posts each branch's result as it
// finishes, then 'done'. It holds no state between messages, logs nothing and sends nothing
// elsewhere (FR-035). `runChecks()` in `checks.ts` starts it and ends it
import { parentPort } from 'node:worker_threads';
import { checkBranch } from '@konnekt/rules/checks/findings';
import type { CheckMessage, WorkerMessage } from '@konnekt/rules/checks/types';

/** The clock the deadline is measured on, the same as the main thread's */
function now(): number {
  return performance.timeOrigin + performance.now();
}

/** Posts one message of the protocol to the thread that started this one */
function post(message: WorkerMessage): void {
  parentPort?.postMessage(message);
}

parentPort?.on('message', (message: CheckMessage) => {
  const { type, runId, deadline, branches } = message;
  if (type !== 'check') {
    return;
  }
  for (const checked of branches) {
    post({ type: 'result', runId, check: checkBranch(checked, { deadline, now }) });
  }
  post({ type: 'done', runId });
});
