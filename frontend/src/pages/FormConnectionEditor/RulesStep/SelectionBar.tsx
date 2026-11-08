import { usePinned } from '../../../hooks/usePinned';
import { RULES_COPY, SELECTION_BAR_STATES } from './constants';
import type { SelectionBarProps } from './types';
import { selectionText } from './utils';

/**
 * Figma "Selection bar" (U16 6344:53542, 6344:53572, 6344:53670): at the top of the rules card in
 * select mode, what is chosen and what grouping makes, "Cancel", and "Group rules", which stays
 * disabled until two rules are chosen. Its text is announced as it changes. Once the card's top
 * scrolls past, the bar pins under the wizard's head until the card's end (B3, Figma note
 * 6524:38720), so rules further down can be grouped without scrolling back: the page scrolls,
 * so it pins at `--wizard-sticky-top`, the bottom of the wizard's sticky header (WizardLayout;
 * U01 #19 and the pinned tabs are T056's). z-1 paints it over the rows' select boxes and KERN
 * buttons, under the step header and the footer (z-15), the popups (z-20) and the user menu. The
 * text takes the row's whole width once less than 192px is left beside the buttons, which then
 * wrap under it: squeezed beside them at 360px, it made the bar 280px tall.
 */
export default function SelectionBar({ selection, branch, onCancel, onGroup }: SelectionBarProps) {
  const { sentinelRef, barRef, pinned } = usePinned<HTMLDivElement>();
  const ready = selection.ids.length >= 2;
  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" className="-mb-px h-px" />
      <div
        ref={barRef}
        className={`bg-kern-layout-background-hued sticky top-(--wizard-sticky-top) z-1 flex flex-wrap items-center gap-8 px-16 py-8 ${SELECTION_BAR_STATES[pinned ? 'pinned' : 'resting']}`}
      >
        <p
          role="status"
          className="text-kern-static-small text-kern-layout-text-default min-w-0 flex-1 basis-192 leading-(--kern-typography-line-height-medium-static)"
        >
          {selectionText(selection, branch)}
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="kern-btn kern-btn--tertiary kern-btn--small"
        >
          <span className="kern-label">{RULES_COPY.cancel}</span>
        </button>
        <button
          type="button"
          aria-disabled={!ready}
          onClick={ready ? onGroup : undefined}
          className="kern-btn kern-btn--secondary"
        >
          <span className="kern-label">{RULES_COPY.groupRules}</span>
        </button>
      </div>
    </>
  );
}
