import { generatePath, Link } from 'react-router';

import { ROUTES } from '../../constants';
import { DETAIL_COPY } from '../FormConnectionDetail/constants';
import ApprovalLinkCards from './ApprovalLinkCards';
import { APPROVAL_COPY } from './constants';
import type { ApprovalUrlsProps } from './types';

/**
 * After publishing or reactivating (S3 `done`): the connection URLs to copy into serviceBW, in the
 * details page's link cards, the trigger URL once and every variant's pull URL, and "Open the
 * connection", which leads to its details.
 */
export default function ApprovalUrls({ urls, formConnectionId }: ApprovalUrlsProps) {
  return (
    <section
      aria-labelledby="approval-links-title"
      className="rounded-kern-large border-kern-neutral-100 bg-kern-layout-background-default flex flex-col items-start gap-16 border px-16 py-24 sm:px-40"
    >
      <h2
        id="approval-links-title"
        className="text-kern-adaptive-large text-kern-layout-text-default font-semibold"
      >
        {DETAIL_COPY.linksTitle}
      </h2>
      <p className="text-kern-static-medium text-kern-layout-text-muted">{DETAIL_COPY.linksLead}</p>
      <div className="w-full pt-8">
        <ApprovalLinkCards urls={urls} />
      </div>
      <Link
        to={generatePath(ROUTES.formConnection, { id: formConnectionId })}
        className="kern-link"
      >
        {APPROVAL_COPY.openConnection}
      </Link>
    </section>
  );
}
