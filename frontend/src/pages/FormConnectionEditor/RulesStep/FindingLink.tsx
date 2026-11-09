import { FINDING_LINK_CLASSES } from './constants';
import type { FindingLinkProps } from './types';
import { goToItem } from './utils';

/**
 * A rule's or group's name in the findings banner (S12, F39; spec 003 S2.16, ACC.3; FR-041d;
 * Figma `Rules/Finding item` 6750:40604, U45 6753:40144, 6750:41077, 6753:40851): a button that
 * looks like a link, in `action-default` and underlined as drawn, which moves the focus to its
 * rule's row or its group's header, which the item's note describes, and scrolls it into view
 * (`goToItem()`). The design draws some names as plain text (U44 6750:40882, U45 6753:40514);
 * F39 makes every name a link, except the rule open in the editor (`FindingsBannerLine`).
 */
export default function FindingLink({ reference, branchKey }: FindingLinkProps) {
  return (
    <button
      type="button"
      onClick={() => goToItem(branchKey, reference.itemId)}
      className={FINDING_LINK_CLASSES}
    >
      {reference.name}
    </button>
  );
}
