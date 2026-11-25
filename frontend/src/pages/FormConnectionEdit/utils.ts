import type {
  BranchInput,
  FormConnection,
  FormConnectionDraft,
} from '@konnekt/api-types/form-connections';
import type { EditLocationState } from '@konnekt/api-types/routing';
import { findItem } from '@konnekt/rules/tree';

import { sameContent } from '../../utils/localDrafts/content';
import type { LocalDraftContent, LocalDraftRecord } from '../../utils/localDrafts/types';
import { LINK_PARAMS, LINK_STEP } from '../FormConnectionEditor/RulesStep/constants';
import type { EditorStep } from '../FormConnectionEditor/types';
import { initialStatesFromDraft, localContentOf } from '../FormConnectionEditor/utils';
import type { DraftFlowAction, DraftFlowState, LinkTarget, RestoreChoice } from './types';

/**
 * The step to open at. For a published connection: the documents when the details' "Edit
 * documents" asked for them, the rules when their rules card's "Edit rules" did (FR-030), and
 * otherwise the connection. For a draft: the step its details asked for, the test step included,
 * and otherwise the step it was saved in (FR-008). The URL's `?step=`, as a link's
 * `?step=rules` (spec 007, S5), wins over the router state, which the details' buttons pass.
 */
export function initialStepOf(
  state: unknown,
  draft?: FormConnectionDraft,
  searchStep: string | null = null
): EditorStep {
  const step = searchStep ?? (state as EditLocationState | null)?.step;
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

/**
 * The start date of a scheduled connection that the edit flow words its texts with (spec 010,
 * S18; FR-013, W6, W7): step 1's note, "Save changes?", "Save your changes?" and "Discard your
 * changes?". Null for an active or deactivated connection, and for a new connection or a stored
 * draft (no connection); saving never changes the date.
 */
export function scheduledStartOf(
  formConnection: Pick<FormConnection, 'state' | 'start_date'> | undefined
): string | null {
  return formConnection?.state === 'scheduled' ? formConnection.start_date : null;
}

/** No link, or one that names nothing to open */
const NO_LINK: LinkTarget = { variantId: null, itemId: null, notice: null };

/**
 * What a link names in the content the page loaded (spec 007, S5; research R11; FR-030, FR-031),
 * from its search parameters `?step=rules&variant={variantId}&item={itemId}`: the variant by its id
 * and, given one, its rule or group. A variant that isn't there names nothing to open, and the
 * notice says so (the first variant is shown); an item that isn't there in the variant leaves the
 * variant, and the notice says so. Never another item in its place. Without `step=rules` or a
 * variant, nothing.
 */
export function linkTargetOf(
  searchParams: URLSearchParams,
  branches: readonly Pick<BranchInput, 'id' | 'items'>[]
): LinkTarget {
  const variantId = searchParams.get(LINK_PARAMS.variant);
  if (searchParams.get(LINK_PARAMS.step) !== LINK_STEP || variantId === null) {
    return NO_LINK;
  }
  const branch = branches.find((candidate) => candidate.id === variantId);
  if (!branch) {
    return { ...NO_LINK, notice: 'variant' };
  }
  const itemId = searchParams.get(LINK_PARAMS.item);
  if (itemId === null) {
    return { ...NO_LINK, variantId };
  }
  return findItem(branch.items, itemId)
    ? { variantId, itemId, notice: null }
    : { variantId, itemId: null, notice: 'item' };
}

/**
 * The page's search parameters without a link's (S5), once the team member has moved from what it
 * opened to another step or variant: the address is the editor's own again, and a reload opens the
 * editor as it would without the link
 */
export function withoutLinkParams(searchParams: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  for (const name of Object.values(LINK_PARAMS)) {
    next.delete(name);
  }
  return next;
}
