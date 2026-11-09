import type { FormConnectionDraft } from '@connection-portal/api-types/form-connections';

import type { LocalDraftRecord } from '../../utils/localDrafts/types';
import type { LinkNoticeKind } from '../FormConnectionEditor/RulesStep/types';
import type { EditorLinkProps, EditorStep } from '../FormConnectionEditor/types';

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

/**
 * What an opened link names (spec 007, S5; FR-030, FR-031), from `linkTargetOf()`: the variant
 * whose tab opens and the rule or group to bring into view, each null for none or when it isn't
 * there, and which of them isn't there, which the rules step's notice says
 */
export interface LinkTarget {
  variantId: string | null;
  itemId: string | null;
  notice: LinkNoticeKind | null;
}

export interface DraftEditFlowProps extends EditorLinkProps {
  draft: FormConnectionDraft;
  /** The step the stored draft opens at, from `initialStepOf()`; the rules step for a link */
  initialStep: EditorStep;
  /** A conflict's "Reload" (S2): fetches the draft again and opens it at its stored step */
  onReload: () => void;
  /** Opened anew by `onReload`: the focus starts on the page title */
  reloaded: boolean;
}

export interface RestoreDialogProps {
  /** The header's title, as the editor's frame shows it */
  title: string;
  /** The draft's name, "Untitled connection" when it has none */
  name: string;
  /** The record's last change, as "04.11.2026, 14:32" */
  changedAt: string;
  /** "Restore changes" */
  onRestore: () => void;
  /** "Discard them" */
  onDiscard: () => void;
  /** Escape: the draft's details, keeping the record */
  onEscape: () => void;
}
