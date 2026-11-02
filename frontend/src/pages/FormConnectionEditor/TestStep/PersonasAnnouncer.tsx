import { useState } from 'react';

import type { PersonasAnnouncerProps } from './types';

/**
 * The announcements (S8.10; FR-017; F2): a visually hidden, polite `role="status"` region that
 * says, after an edit, which persona's outcome moved in which variant ("Mia Schulz now meets the
 * rules of Standard."). It never moves the focus, and there is no visible toast (F2).
 *
 * - **The same sentence twice** is announced twice: the text sits in an element keyed by
 *   `announcementId`, which `setValue` raises for every announcement, so React replaces the
 *   element and the region's content changes even when the words don't.
 * - **No stale text**: an announcement the state held before this region mounted (the step is
 *   shown again later) isn't rendered, as a region that appears with its text isn't announced
 *   reliably, and an old sentence would be wrong anyway.
 * - **Apart from the loading status** (`#test-loading-status`, S8.8) and outside the panel, whose
 *   `aria-busy` while a persona is generated would hold back what a descendant announces (research
 *   R16). Both regions are polite, so a screen reader queues one behind the other and neither
 *   interrupts the other. The region is always mounted and empty until the first announcement.
 */
export default function PersonasAnnouncer({
  announcement,
  announcementId,
}: PersonasAnnouncerProps) {
  const [initialId] = useState(announcementId);
  const current = announcementId > initialId ? announcement : '';
  return (
    <div role="status" className="sr-only">
      {current && <p key={announcementId}>{current}</p>}
    </div>
  );
}
