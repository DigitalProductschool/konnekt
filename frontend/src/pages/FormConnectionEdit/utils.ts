import type { FormConnectionDraft } from '@connection-portal/api-types/form-connections';
import type { EditLocationState } from '@connection-portal/api-types/routing';

import { sameContent } from '../../utils/localDrafts/content';
import type { LocalDraftContent, LocalDraftRecord } from '../../utils/localDrafts/types';
import type { EditorStep } from '../FormConnectionEditor/types';
import { initialStatesFromDraft, localContentOf } from '../FormConnectionEditor/utils';
import type { DraftFlowAction, DraftFlowState, RestoreChoice } from './types';

/**
 * The step to open at. For a published connection: the documents when the details' "Edit
 * documents" asked for them, the rules when their rules card's "Edit rules" did (FR-030), and
 * otherwise the connection. For a draft: the step its details asked for, the test step included,
 * and otherwise the step it was saved in (FR-008).
 */
export function initialStepOf(state: unknown, draft?: FormConnectionDraft): EditorStep {
  const step = (state as EditLocationState | null)?.step;
  if (step === 'documents' || step === 'rules') return step;
  if (!draft) return 'connection';
  return step === 'connection' || step === 'test' ? step : draft.step;
}

/**
 * Whether a draft conflict's "Reload" opened the page, from a draft resumed through `?local=`
 * (spec 005, S2): then the focus starts on the page title, as after the page's own reload.
 */
export function reloadedOf(state: unknown): boolean {
  return (state as EditLocationState | null)?.reloaded === true;
}

/**
 * The stored draft as loaded, as a local draft's content (data-model.md section 6): what the
 * editor would hold on opening it, and the baseline after "Restore changes".
 */
export function storedContentOf(draft: FormConnectionDraft): LocalDraftContent {
  const { editor, rules } = initialStatesFromDraft(draft);
  return localContentOf(editor, rules);
}

/**
 * A record's content with the stored draft's variant ids where it has none, place by place: a
 * record saved before variants had ids (spec 007, research R10). Only the ids are taken, so a
 * record with other changes still differs.
 */
function withStoredIds(content: LocalDraftContent, stored: LocalDraftContent): LocalDraftContent {
  return {
    ...content,
    branches: content.branches.map((branch, index) =>
      typeof branch.id === 'string' ? branch : { ...branch, id: stored.branches[index]?.id ?? null }
    ),
  };
}

/**
 * What the record of `draft-<id>` means when the edit route loads the draft (contracts/
 * local-drafts.md "Rules for callers" 2; FR-016): `'none'` without a record, `'same'` when its
 * content is the stored draft's, which the page removes silently, and `'ask'` when it holds
 * changes, which the page offers to restore. A record saved before variants had ids is the same
 * when it differs only by them.
 */
export function restoreChoiceOf(
  record: LocalDraftRecord | null,
  draft: FormConnectionDraft
): RestoreChoice {
  if (record === null) {
    return 'none';
  }
  const stored = storedContentOf(draft);
  return sameContent(withStoredIds(record.content, stored), stored) ? 'same' : 'ask';
}

/** Where the draft's flow starts: the question for `'ask'`, and otherwise the stored draft. */
export function initialDraftFlowState(
  record: LocalDraftRecord | null,
  choice: RestoreChoice
): DraftFlowState {
  return choice === 'ask' && record !== null
    ? { kind: 'asking', record }
    : { kind: 'open', restored: null };
}

/** The answer to the question: the record's changes, or the stored draft. */
export function draftFlowReducer(state: DraftFlowState, action: DraftFlowAction): DraftFlowState {
  if (state.kind !== 'asking') {
    return state;
  }
  switch (action.type) {
    case 'restore':
      return { kind: 'open', restored: state.record };
    case 'discard':
      return { kind: 'open', restored: null };
  }
}
