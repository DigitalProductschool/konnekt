import { APPROVAL_COPY } from './constants';
import type { ApprovalActionsProps } from './types';
import { busyTextOf } from './utils';

/**
 * "Approve" and "Decline" (S3 "Actions"). Approving deletes for `delete_draft` and `delete`, so
 * its button is KERN's danger variant there. After a failed approve it says "Try again". While a
 * call runs, both are `aria-disabled` and ignore clicks, and the status region under them says
 * "Publishing…" or "Working…"; it stays rendered, so that its text is announced.
 */
export default function ApprovalActions({
  action,
  running,
  retry,
  onApprove,
  onDecline,
}: ApprovalActionsProps) {
  const busy = running !== null;
  const danger = action === 'delete_draft' || action === 'delete';
  return (
    <div className="flex flex-col gap-16">
      <div className="flex flex-wrap gap-16">
        <button
          type="button"
          aria-disabled={busy}
          onClick={busy ? undefined : onApprove}
          className={`kern-btn kern-btn--primary ${danger ? 'kern-btn--danger' : ''}`}
        >
          <span className="kern-label">{retry ? APPROVAL_COPY.retry : APPROVAL_COPY.approve}</span>
        </button>
        <button
          type="button"
          aria-disabled={busy}
          onClick={busy ? undefined : onDecline}
          className="kern-btn kern-btn--secondary"
        >
          <span className="kern-label">{APPROVAL_COPY.decline}</span>
        </button>
      </div>
      {/* Empty, it leaves the flow (no gap) but stays rendered, so its text is announced */}
      <p
        role="status"
        className="text-kern-static-medium text-kern-layout-text-default empty:absolute"
      >
        {busyTextOf(action, running)}
      </p>
    </div>
  );
}
