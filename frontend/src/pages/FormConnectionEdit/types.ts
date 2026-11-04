import type { FormConnectionDraft } from '../../types/form-connections';
import type { LocalDraftRecord } from '../../utils/localDrafts/types';
import type { EditorStep } from '../FormConnectionEditor/types';

/**
 * What a stored draft's local draft means on its edit route (contracts/local-drafts.md "Rules for
 * callers" 2): none, unsaved changes to ask about, or the stored draft's own content again
 */
export type RestoreChoice = 'none' | 'ask' | 'same';

/** The draft's flow: asking whether to restore the record, or the editor, restored or not */
export type DraftFlowState =
  | { kind: 'asking'; record: LocalDraftRecord }
  /** `restored`: the record whose changes the editor opens with; null for the stored draft */
  | { kind: 'open'; restored: LocalDraftRecord | null };

export type DraftFlowAction =
  /** "Restore changes" */
  | { type: 'restore' }
  /** "Discard them", once the record is removed */
  | { type: 'discard' };

export interface DraftEditFlowProps {
  draft: FormConnectionDraft;
  /** The step the stored draft opens at, from `initialStepOf()` */
  initialStep: EditorStep;
}

export interface RestoreDialogProps {
  /** The header's title, as the editor's frame shows it */
  title: string;
  /** The draft's name, "Untitled connection" when it has none */
  name: string;
  /** The record's last change, as "4 Nov 2026, 14:32" */
  changedAt: string;
  /** "Restore changes" */
  onRestore: () => void;
  /** "Discard them" */
  onDiscard: () => void;
  /** Escape: the draft's details, keeping the record */
  onEscape: () => void;
}
