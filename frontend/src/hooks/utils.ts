import type { EditorStep } from '@connection-portal/api-types/form-connections';
import { namesOf } from '@connection-portal/rules/checks/findingMessages';
import type { LiteralContext } from '@connection-portal/rules/checks/literals';
import type {
  BranchCheck,
  ChangeCause,
  ItemNames,
  RunAction,
  RunBranch,
  WorkerMessage,
} from '@connection-portal/rules/checks/types';

import { sameContent } from '../utils/localDrafts/content';
import type { LocalDraftContent } from '../utils/localDrafts/types';
import type {
  CheckableBranch,
  CheckedTreeModule,
  DocumentTypesAction,
  DocumentTypesState,
  FormConnectionAction,
  FormConnectionState,
  OptionSetsAction,
  OptionSetsState,
} from './types';

export const INITIAL_DOCUMENT_TYPES_STATE: DocumentTypesState = {
  status: 'loading',
  attempt: 0,
  documentTypes: [],
};

export function documentTypesReducer(
  state: DocumentTypesState,
  action: DocumentTypesAction
): DocumentTypesState {
  switch (action.type) {
    case 'loaded':
      return { status: 'loaded', attempt: state.attempt, documentTypes: action.documentTypes };
    case 'failed':
      return { status: 'failed', attempt: state.attempt, documentTypes: [] };
    case 'retry':
      return { status: 'loading', attempt: state.attempt + 1, documentTypes: [] };
  }
}

export const INITIAL_OPTION_SETS_STATE: OptionSetsState = {
  status: 'loading',
  attempt: 0,
  optionSets: [],
};

export function optionSetsReducer(
  state: OptionSetsState,
  action: OptionSetsAction
): OptionSetsState {
  switch (action.type) {
    case 'loaded':
      return { status: 'loaded', attempt: state.attempt, optionSets: action.optionSets };
    case 'failed':
      return { status: 'failed', attempt: state.attempt, optionSets: [] };
    case 'retry':
      return { status: 'loading', attempt: state.attempt + 1, optionSets: [] };
  }
}

export const INITIAL_FORM_CONNECTION_STATE: FormConnectionState = { status: 'loading', attempt: 0 };

/** The `loaded` state holds a published connection or a draft, as the API answered it */
export function formConnectionReducer(
  state: FormConnectionState,
  action: FormConnectionAction
): FormConnectionState {
  switch (action.type) {
    case 'loaded':
      return { status: 'loaded', attempt: state.attempt, formConnection: action.formConnection };
    case 'notFound':
      return { status: 'notFound', attempt: state.attempt };
    case 'failed':
      return { status: 'failed', attempt: state.attempt, notice: action.notice };
    case 'retry':
      return { status: 'loading', attempt: state.attempt + 1 };
  }
}

// useRuleChecks() (specs/003-rule-consistency-checks, research R10): what it does without React

/**
 * Every branch as a change hands it to the run state, in tab order: its key and current name, its
 * current names (`namesOf()`) and its checked tree, built on the main thread with today in Germany
 */
export function runBranchesOf(
  branches: readonly CheckableBranch[],
  context: LiteralContext,
  today: string,
  checkedTree: CheckedTreeModule
): RunBranch[] {
  return branches.map((branch) => ({
    branch: { key: branch.key, name: branch.name },
    names: namesOf(branch.items),
    checked: checkedTree.buildCheckedBranch(branch, context, today),
  }));
}

function sameNames(first: ItemNames, second: ItemNames): boolean {
  if (first.size !== second.size) {
    return false;
  }
  const others = [...second];
  return [...first].every(
    ([id, name], index) => others[index][0] === id && others[index][1] === name
  );
}

/**
 * Whether two lists of branches give the run state nothing new: the same keys in the same order,
 * with the same names, item names and fingerprints. A rename is new, as the notes and the
 * announcements name items by their current names; it starts no run (FR-011)
 */
export function sameRunBranches(
  first: readonly RunBranch[],
  second: readonly RunBranch[]
): boolean {
  return (
    first.length === second.length &&
    first.every((entry, index) => {
      const other = second[index];
      return (
        entry.branch.key === other.branch.key &&
        entry.branch.name === other.branch.name &&
        entry.checked.fingerprint === other.checked.fingerprint &&
        sameNames(entry.names, other.names)
      );
    })
  );
}

/**
 * The cause of a change: `'new_day'` when the day in Germany is another than at the last change,
 * which reruns every branch and announces nothing (FR-015), `'action'` otherwise
 */
export function causeOf(previousToday: string | null, today: string): ChangeCause {
  return previousToday !== null && previousToday !== today ? 'new_day' : 'action';
}

/** The run state's action for a message of the worker */
export function actionOf(message: WorkerMessage): RunAction {
  return message.type === 'result'
    ? { type: 'result', runId: message.runId, check: message.check }
    : { type: 'done', runId: message.runId };
}

/**
 * `RuleChecks.byBranch` for the current branches: the run state's result per key, and null for a
 * branch it doesn't know yet, such as every branch before the first change or one just added
 */
export function byBranchFor(
  branches: readonly CheckableBranch[],
  byBranch: Readonly<Record<string, BranchCheck | null>>
): Record<string, BranchCheck | null> {
  return Object.fromEntries(branches.map(({ key }) => [key, byBranch[key] ?? null]));
}

// useLocalDraft() (specs/005-connection-drafts, contracts/local-drafts.md "useLocalDraft";
// research R9): what it decides without React

/** What a flow's autosave compares: its content and its step */
export interface LocalDraftSnapshot {
  content: LocalDraftContent;
  step: EditorStep;
}

/**
 * Whether the flow changed between two renders: its content, structurally, since the memoised
 * content may get a new identity without a real change, or its step, which the record carries so
 * that a resume reopens there
 */
export function isLocalDraftChange(
  previous: LocalDraftSnapshot,
  next: LocalDraftSnapshot
): boolean {
  return previous.step !== next.step || !sameContent(previous.content, next.content);
}

/**
 * What a change does to the flow's record: `'remove'` when it brings the content back to the
 * baseline, what is already safe elsewhere, and `'write'` otherwise. Without a baseline every
 * change writes, and only `forget()` removes the record (data-model.md, section 6)
 */
export function localDraftActionOf(
  content: LocalDraftContent,
  baseline: LocalDraftContent | null
): 'write' | 'remove' {
  return baseline !== null && sameContent(content, baseline) ? 'remove' : 'write';
}

/**
 * How long a write waits, in milliseconds: 0 for the flow's first write and once `interval` has
 * passed since the last one, and otherwise the rest of the interval (trailing throttle)
 */
export function writeDelayOf(lastWriteAt: number | null, now: number, interval: number): number {
  return lastWriteAt === null ? 0 : Math.max(0, lastWriteAt + interval - now);
}
