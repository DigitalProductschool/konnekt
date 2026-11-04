import type { Ref, RefObject } from 'react';

import type { LocalDraftRecord } from '../../utils/localDrafts/types';

export interface LocalDraftsOfferProps {
  /** The flow's own key on `/get-started`, whose record isn't offered */
  exceptFlowKey?: string;
  /**
   * The element that takes the focus when the last item is discarded (the page's `h1`, such as
   * `PageTitle`'s `ref`): the section, heading included, goes with that item
   */
  emptyFocusRef?: RefObject<HTMLElement | null>;
}

export interface LocalDraftItemProps {
  record: LocalDraftRecord;
  /** "Resume", which the offer focuses after the item above it was discarded */
  resumeRef: Ref<HTMLAnchorElement>;
  onDiscard: (record: LocalDraftRecord) => void;
}

/** Where the focus goes after a discard: the next item's "Resume", or the section's heading */
export type DiscardFocus = { kind: 'resume'; flowKey: string } | { kind: 'heading' };

export interface DiscardState {
  /** The record whose discard the dialog asks to confirm */
  pending: LocalDraftRecord | null;
  /** The focus target after a discard, until it has been focused */
  focus: DiscardFocus | null;
  /** How many records were discarded; each one announces the status again */
  discards: number;
  /** Whether the status shows its text: it follows the empty region a moment later */
  announced: boolean;
}

export type DiscardAction =
  | { type: 'ask'; record: LocalDraftRecord }
  | { type: 'cancel' }
  | { type: 'discarded'; focus: DiscardFocus }
  | { type: 'focused' }
  | { type: 'announce' };
