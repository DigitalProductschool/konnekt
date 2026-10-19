import type { EditLocationState } from '../../types/routing';
import type { EditorStep } from '../FormConnectionEditor/types';

/** The step to open at: the documents when the details' "Edit documents" asked for them. */
export function initialStepOf(state: unknown): EditorStep {
  return (state as EditLocationState | null)?.step === 'documents' ? 'documents' : 'connection';
}
