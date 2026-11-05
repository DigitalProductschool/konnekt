import type { LocalDraftRecord } from '../../utils/localDrafts/types';
import { CHANGED_AT_FORMAT, LOCAL_DRAFTS_COPY } from './constants';
import type { DiscardAction, DiscardFocus, DiscardState } from './types';

/** "4 Nov 2026, 14:32": the record's last change, in the browser's time zone */
export function formatChangedAt(iso: string): string {
  return CHANGED_AT_FORMAT.format(new Date(iso));
}

/** "New connection · Last change …", or "Draft · Last change …" for a stored draft */
export function metaLineOf(record: LocalDraftRecord): string {
  const date = formatChangedAt(record.changedAt);
  return record.draftId === null
    ? LOCAL_DRAFTS_COPY.localNew(date)
    : LOCAL_DRAFTS_COPY.localDraft(date);
}

/** The dialog's text: for a stored draft, it adds that the saved draft stays */
export function discardTextOf(record: LocalDraftRecord, name: string): string {
  const text = LOCAL_DRAFTS_COPY.discardText(name);
  return record.draftId === null ? text : `${text} ${LOCAL_DRAFTS_COPY.draftStays}`;
}

/** After discarding `flowKey`: the next item's "Resume", or else the section's heading */
export function focusAfterDiscard(drafts: LocalDraftRecord[], flowKey: string): DiscardFocus {
  const index = drafts.findIndex((record) => record.flowKey === flowKey);
  const next = index === -1 ? undefined : drafts[index + 1];
  return next ? { kind: 'resume', flowKey: next.flowKey } : { kind: 'heading' };
}

export function discardReducer(state: DiscardState, action: DiscardAction): DiscardState {
  switch (action.type) {
    case 'ask':
      return { ...state, pending: action.record };
    case 'cancel':
      return { ...state, pending: null };
    case 'discarded':
      return {
        pending: null,
        focus: action.focus,
        discards: state.discards + 1,
        announced: false,
      };
    case 'focused':
      return { ...state, focus: null };
    case 'announce':
      return { ...state, announced: true };
  }
}
