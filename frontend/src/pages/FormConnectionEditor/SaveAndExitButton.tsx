import { DRAFT_COPY } from './constants';
import type { EditorFooterProps } from './types';

/**
 * The footer's "Save and exit" (S0, S1; FR-001; Figma U17 6408:72735, U19 6699:45349): a
 * tertiary button with the "save" glyph (cosmetic 17) that stores the flow as a draft. It is
 * never `disabled`, so it keeps the focus while a save runs: it is then `aria-disabled`, reads
 * "Saving…" and ignores clicks, and the page's polite status says "Saving draft…" (F21, W20;
 * FR-033). It keeps its label at every width (005-ACC.4).
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
      className="kern-btn kern-btn--tertiary"
    >
      <span aria-hidden="true" className="kern-icon icon-save" />
      <span className="kern-label">{savingDraft ? DRAFT_COPY.saving : DRAFT_COPY.saveAndExit}</span>
    </button>
  );
}
