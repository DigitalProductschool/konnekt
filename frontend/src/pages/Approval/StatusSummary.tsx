import { DETAIL_COPY } from '../FormConnectionDetail/constants';
import ApprovalLinkCards from './ApprovalLinkCards';
import { STATUS_BODIES } from './constants';
import DescriptionLine from './DescriptionLine';
import type { StatusSummaryProps } from './types';

/**
 * The body of `deactivate`, `reactivate` and `delete` (S3 "Body"): the description line, then a
 * section under the details page's links title with what becomes of the connection URLs, the URLs
 * in the details page's link cards, and, where it applies, that requests in progress are cancelled
 * and that deleting can't be undone. The section's `h2` keeps the cards' `h3` titles one level
 * under it, as in the publish body.
 */
export default function StatusSummary({ action, connection, urls }: StatusSummaryProps) {
  const body = STATUS_BODIES[action];
  return (
    <div className="flex flex-col gap-32">
      {connection.description && <DescriptionLine description={connection.description} />}
      <section
        aria-labelledby="approval-status-links-title"
        className="rounded-kern-large bg-kern-layout-background-default flex flex-col gap-16 border border-(--kern-color-decorative-border-default) p-24"
      >
        <h2
          id="approval-status-links-title"
          className="text-kern-adaptive-medium text-kern-layout-text-default font-semibold"
        >
          {DETAIL_COPY.linksTitle}
        </h2>
        <p className="text-kern-static-medium text-kern-layout-text-default">{body.lead}</p>
        {urls && <ApprovalLinkCards urls={urls} />}
        {body.cancelsRequests && (
          <p className="text-kern-static-medium text-kern-layout-text-default">
            {body.cancelsRequests}
          </p>
        )}
        {body.final && (
          <p className="text-kern-static-medium text-kern-layout-text-default font-semibold">
            {body.final}
          </p>
        )}
      </section>
    </div>
  );
}
