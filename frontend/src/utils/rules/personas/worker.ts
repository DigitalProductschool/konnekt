// The module worker of persona generation (specs/004-rule-test-personas, research R9;
// contracts/personas.md "Worker protocol"). On a 'generate' message, it runs `generatePersonas()`
// with the message's deadline and the clock the page measures it on, then posts one 'generated'
// message with the same run id. It holds no state between messages, catches nothing (an error
// reaches the page's `error` event, and the run fails), logs nothing and sends nothing elsewhere
// (FR-021)
import { generatePersonas } from './generation';
import type { GeneratedMessage, GenerateMessage } from './types';

/**
 * The part of the worker's global scope this entry uses. `tsconfig.app.json` has the `DOM`
 * library, which conflicts with `WebWorker`, so the scope is typed here (as `checks/worker.ts`)
 */
interface PersonaWorkerScope {
  onmessage: ((event: MessageEvent<GenerateMessage>) => void) | null;
  postMessage: (message: GeneratedMessage) => void;
}

const scope = self as unknown as PersonaWorkerScope;

/** The clock the deadline is measured on, the same as the page's */
function now(): number {
  return performance.timeOrigin + performance.now();
}

scope.onmessage = (event) => {
  const request = event.data;
  if (request.type !== 'generate') {
    return;
  }
  const { slots } = generatePersonas(request, { deadline: request.deadline, now });
  scope.postMessage({ type: 'generated', runId: request.runId, slots });
};
