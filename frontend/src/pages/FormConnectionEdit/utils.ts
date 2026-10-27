import type { EditLocationState } from '../../types/routing';
import type { EditorStep } from '../FormConnectionEditor/types';

/**
 * The step to open at: the documents when the details' "Edit documents" asked for them, the
 * rules when their rules card's "Edit rules" did (FR-030), and otherwise the connection.
 */
export function initialStepOf(state: unknown): EditorStep {
  const step = (state as EditLocationState | null)?.step;
  return step === 'documents' || step === 'rules' ? step : 'connection';
}
