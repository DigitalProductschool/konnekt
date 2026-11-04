import type { FormConnectionDraft } from '../../types/form-connections';
import type { EditLocationState } from '../../types/routing';
import type { EditorStep } from '../FormConnectionEditor/types';

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
