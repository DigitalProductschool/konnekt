// runChecks() (research R14): from the sources, as under Vitest and `vite-node`, the checks run on
// the main thread and equal `checkBranch()`'s; a worker that answers, fails, never starts or never
// answers ends the call in time, its unfinished branches not checked completely
import { Worker } from 'node:worker_threads';
import type { RuleTreeItem } from '@konnekt/api-types/form-connections';
import { buildCheckedBranch } from '@konnekt/rules/checks/checkedTree';
import { checkBranch } from '@konnekt/rules/checks/findings';
import type { BranchCheck, CheckedBranch } from '@konnekt/rules/checks/types';
import { CONTEXT, mainBranch, rule, target, US1_RULES } from '@konnekt/rules/testData';
import { describe, expect, it } from 'vitest';

import { notChecked, runChecks } from './checks';

const TODAY = '2026-10-28';

/** The checked tree of a main branch with these items */
function checkedOf(key: string, items: RuleTreeItem[]): CheckedBranch {
  return buildCheckedBranch({ ...mainBranch(items), key }, CONTEXT, TODAY);
}

/** Rule 04 and Rule 05 can't be met together: at least 21 and less than 18 years ago */
const CONFLICTING = checkedOf('conflicting', [
  rule(4, target('pid', 'birthdate'), { operator: 'at_least_years_ago', years: 21 }),
  rule(5, target('pid', 'birthdate'), { operator: 'less_than_years_ago', years: 18 }),
]);

/** US1's three rules, the last two in a group */
const GROUPED = checkedOf('grouped', [
  US1_RULES[0],
  {
    type: 'group',
    id: 'group-1',
    name: 'Group 01',
    mark: null,
    operator: 'and',
    message: null,
    items: [US1_RULES[1], US1_RULES[2]],
  },
]);

const BRANCHES = [CONFLICTING, GROUPED];

/** The result of `checkBranch()` with all the time it needs */
function checkedInTime(checked: CheckedBranch): BranchCheck {
  return checkBranch(checked, { deadline: Number.POSITIVE_INFINITY, now: () => 0 });
}

/** A worker from code, as a test's stand-in for checksWorker.js */
function workerOf(code: string): () => Worker {
  return () => new Worker(code, { eval: true });
}

describe('runChecks', () => {
  it('equals checkBranch() per branch, in the order given', async () => {
    const results = await runChecks(BRANCHES);

    expect(results).toEqual(BRANCHES.map(checkedInTime));
    expect(results[0].complete).toBe(true);
    expect(results[0].findings.map((finding) => finding.kind)).toContain('conflicting');
  });

  it('answers no branches with no results', async () => {
    expect(await runChecks([])).toEqual([]);
  });

  it('reports the branches as not complete once the deadline has passed', async () => {
    const [result] = await runChecks([CONFLICTING], 0);

    expect(result.complete).toBe(false);
  });

  it('keeps the results the worker posted, and gives the others as not checked', async () => {
    const first = checkedInTime(CONFLICTING);
    const startWorker = workerOf(`
      const { parentPort } = require('node:worker_threads');
      parentPort.on('message', (message) => {
        parentPort.postMessage({ type: 'result', runId: message.runId, check: ${JSON.stringify(first)} });
      });
    `);

    const results = await runChecks(BRANCHES, 4500, { watchdogMs: 200, startWorker });

    expect(results).toEqual([first, notChecked(GROUPED)]);
  });

  it('ends a worker that never answers at the watchdog', async () => {
    const startWorker = workerOf(
      `require('node:worker_threads').parentPort.on('message', () => {});`
    );
    const started = Date.now();

    const results = await runChecks(BRANCHES, 4500, { watchdogMs: 100, startWorker });

    expect(results).toEqual(BRANCHES.map(notChecked));
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it.each([
    ['throws as it starts', workerOf(`throw new Error('broken');`)],
    ['exits', workerOf(`process.exit(0);`)],
    ['has no entry', () => new Worker(new URL('file:///nowhere/checksWorker.js'))],
    [
      'cannot be created',
      () => {
        throw new Error('no worker');
      },
    ],
  ])('ends the call at once when the worker %s', async (_case, startWorker) => {
    const started = Date.now();

    const results = await runChecks(BRANCHES, 4500, { watchdogMs: 10000, startWorker });

    expect(results).toEqual(BRANCHES.map(notChecked));
    expect(Date.now() - started).toBeLessThan(5000);
  });
});

describe('notChecked', () => {
  it('is incomplete, without notice or findings, and counts the rules of groups', () => {
    expect(notChecked(GROUPED)).toEqual({
      branchKey: 'grouped',
      fingerprint: GROUPED.fingerprint,
      complete: false,
      notice: null,
      findings: [],
      checkedRules: 3,
    });
  });
});
