import { useEffect, useState } from 'react';

import { LIVE_REGION_DELAY_MS, LOADING_STATUS_ID } from './constants';
import type { LoadingStatusProps } from './types';

/**
 * The loading status at the right end of the citizens row (S8.8; FR-004, FR-012; Figma U74
 * "Status (read out to screen readers)" 7062:51210, 7062:51497): body/small, muted, read out
 * politely (`role="status"`), and empty without a run, so that each run's text is announced when
 * it starts. It is a region of its own, apart from the announcements of S8.10 (research R16).
 *
 * The row and its status appear with the step, and again after the failure state; a region that
 * appears with its text is often not announced, so the text follows a moment later. It never
 * takes the focus by itself, but `TestStep` parks the focus here when the button that started a
 * run gives way to frame 18's skeleton (quickstart V9), hence `tabIndex={-1}` and a ring for
 * keyboard focus only
 */
export default function LoadingStatus({ text }: LoadingStatusProps) {
  const [known, setKnown] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setKnown(true), LIVE_REGION_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <p
      id={LOADING_STATUS_ID}
      role="status"
      tabIndex={-1}
      className="text-kern-static-small text-kern-layout-text-muted rounded-kern-small focus-visible:outline-kern-action-focus-default min-w-0 leading-(--kern-typography-line-height-medium-static) break-words focus-visible:outline-4 focus-visible:outline-offset-2"
    >
      {known ? text : ''}
    </p>
  );
}
