import { displayNameOf } from '../../utils/localDrafts/content';
import type { LocalDraftRecord } from '../../utils/localDrafts/types';
import { CHANGED_AT_FORMAT, LOCAL_DRAFTS_COPY } from './constants';
import type { DiscardAction, DiscardFocus, DiscardState } from './types';

/** "06.11.2026, 14:20": the record's last change, in the browser's time zone (cosmetic 3) */
export function formatChangedAt(iso: string): string {
  return CHANGED_AT_FORMAT.format(new Date(iso));
}

/** "New, never saved · …", or "Edited · …" for a stored draft's local changes (FR-029) */
export function metaLineOf(record: LocalDraftRecord): string {
  const date = formatChangedAt(record.changedAt);
  return record.draftId === null
    ? LOCAL_DRAFTS_COPY.neverSaved(date)
    : LOCAL_DRAFTS_COPY.edited(date);
}

/** The banner's heading: the one draft's name (FR-029d), or the count */
export function titleOf(drafts: LocalDraftRecord[]): string {
  return drafts.length === 1
    ? LOCAL_DRAFTS_COPY.titleOne(displayNameOf(drafts[0].content))
    : LOCAL_DRAFTS_COPY.titleSeveral(drafts.length);
}

/** The banner's sub-line: with the one draft's date, which no item line shows */
export function textOf(drafts: LocalDraftRecord[]): string {
  return drafts.length === 1
    ? LOCAL_DRAFTS_COPY.textOne(formatChangedAt(drafts[0].changedAt))
    : LOCAL_DRAFTS_COPY.textSeveral;
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
