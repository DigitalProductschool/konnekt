import { usePinned } from '../../../hooks/usePinned';
import { RULES_COPY, SELECTION_BAR_STATES } from './constants';
import type { SelectionBarProps } from './types';
import { selectionText } from './utils';

/**
 * Figma "Rules/Selection bar" (U36 6616:44187, 6616:44214, 6616:44240; U64 6616:44309,
 * 6616:44355): at the top of the rules card in select mode, below the link strip in a variant
 * based on Standard (U64 6524:38500), on the info tint: what is chosen and what grouping makes
 * (label/default), "Cancel" as KERN's small tertiary button without the 4px above and below
 * that make its 48px slot (Figma draws it 40 tall in the bar's 56), and "Group rules" as the
 * primary button at the footer's 40px, which stays disabled until two rules are chosen. Its text is
 * announced as it changes. In a based variant, two chosen rules at the top level say that the
 * group is added there only (U64 6616:44355). Once the card's top scrolls past, the bar pins
 * under the step header and the variant tabs until the card's end (U64 note 6524:38720, U01
 * #19): the rules card hands it the bottom of the pinned tabs as `--wizard-sticky-top` (T056).
 * z-1 paints it over the rows' select boxes and KERN buttons, under the pinned tabs (z-10), the
 * step header and the footer (z-15), the popups (z-20) and the user menu. The text takes the
 * row's whole width once less than 192px is left beside the buttons, which then wrap under it.
 */
export default function SelectionBar({
  selection,
  branch,
  mainName,
  onCancel,
  onGroup,
}: SelectionBarProps) {
  const { sentinelRef, barRef, pinned } = usePinned<HTMLDivElement>();
  const ready = selection.ids.length >= 2;
  const based = branch.origin === 'based';
  const text =
    based && ready && selection.parentId === null
      ? RULES_COPY.selectedInVariant(selection.ids.length, branch.name.trim(), mainName.trim())
      : selectionText(selection, branch);
  const look = pinned ? 'pinned' : based ? 'belowStrip' : 'resting';
  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" className="-mb-px h-px" />
      <div
        ref={barRef}
        className={`bg-kern-feedback-info-background sticky top-(--wizard-sticky-top) z-1 flex flex-wrap items-center gap-8 px-16 py-8 ${SELECTION_BAR_STATES[look]}`}
      >
        <p
          role="status"
          className="text-kern-static-medium text-kern-layout-text-default min-w-0 flex-1 basis-192 leading-(--kern-typography-line-height-medium-static) font-semibold break-words"
        >
          {text}
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="kern-btn kern-btn--tertiary kern-btn--small my-0!"
        >
          <span className="kern-label">{RULES_COPY.cancel}</span>
        </button>
        <button
          type="button"
          aria-disabled={!ready}
          onClick={ready ? onGroup : undefined}
          className="kern-btn kern-btn--primary min-h-40!"
        >
          <span className="kern-label">{RULES_COPY.groupRules}</span>
        </button>
      </div>
    </>
  );
}
