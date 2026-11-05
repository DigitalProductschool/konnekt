import { DRAFT_COPY } from './constants';
import type { EditorFooterProps } from './types';

/**
 * The footer's "Save and exit" (S0, S1; FR-001; F28, e.g. U09 6235:18684): a secondary button
 * that stores the flow as a draft. It is never `disabled`, so it keeps the focus while a save
 * runs: it is then `aria-disabled`, reads "Saving…" and ignores clicks (W9).
 */
export default function SaveAndExitButton({
  savingDraft,
  onSaveAndExit,
}: Pick<EditorFooterProps, 'savingDraft' | 'onSaveAndExit'>) {
  return (
    <button
      type="button"
      onClick={savingDraft ? undefined : onSaveAndExit}
      aria-disabled={savingDraft}
      className="kern-btn kern-btn--secondary"
    >
      <span className="kern-label">{savingDraft ? DRAFT_COPY.saving : DRAFT_COPY.saveAndExit}</span>
    </button>
  );
}
