import type { FindingLinkProps } from './types';
import { goToItem } from './utils';

/**
 * A rule's or group's name in the findings banner (spec 003, S2; A1, W19; FR-013; Figma
 * `Rules/Finding item` 6750:40604, U05 6753:40144): a button that looks like a link, in
 * `action-default` and underlined, which scrolls its rule or group into view and moves the focus
 * to its row or group frame, which the item's note describes.
 */
export default function FindingLink({ reference, branchKey }: FindingLinkProps) {
  return (
    <button
      type="button"
      onClick={() => goToItem(branchKey, reference.itemId)}
      className="text-kern-action-default rounded-kern-small focus-visible:outline-kern-action-focus-default cursor-pointer text-left underline focus-visible:outline-4 focus-visible:outline-offset-2"
    >
      {reference.name}
    </button>
  );
}
