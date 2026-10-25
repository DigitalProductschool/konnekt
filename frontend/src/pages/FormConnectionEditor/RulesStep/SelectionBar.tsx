import { RULES_COPY } from './constants';
import type { SelectionBarProps } from './types';
import { selectionText } from './utils';

/**
 * Figma "Selection bar" (U16 6344:53542, 6344:53572, 6344:53670): at the top of the rules card in
 * select mode, what is chosen and what grouping makes, "Cancel", and "Group rules", which stays
 * disabled until two rules are chosen. Its text is announced as it changes.
 */
export default function SelectionBar({ selection, branch, onCancel, onGroup }: SelectionBarProps) {
  const ready = selection.ids.length >= 2;
  return (
    // 7px: the card's 8px radius, inside its border
    <div className="bg-kern-layout-background-hued flex flex-wrap items-center gap-8 rounded-t-[7px] px-16 py-8">
      <p
        role="status"
        className="text-kern-static-small text-kern-layout-text-default min-w-0 flex-1 leading-(--kern-typography-line-height-medium-static)"
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
  );
}
