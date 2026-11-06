import { generatePath, Link } from 'react-router';

import { ROUTES } from '../../constants';
import { DETAIL_COPY } from '../FormConnectionDetail/constants';
import LinkCard from '../FormConnectionDetail/LinkCard';
import { APPROVAL_COPY } from './constants';
import type { ApprovalUrlsProps } from './types';
import { urlsLinksOf } from './utils';

/**
 * After publishing (S3 `done`): the connection URLs to copy into serviceBW, in the details page's
 * link cards, the trigger URL once and every variant's pull URL, and "Open the connection", which
 * leads to its details.
 */
export default function ApprovalUrls({ urls, formConnectionId }: ApprovalUrlsProps) {
  const links = urlsLinksOf(urls);
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
      <ol className="flex w-full flex-col gap-12 pt-8">
        <LinkCard
          number={1}
          title={DETAIL_COPY.requestLink}
          links={links.trigger}
          infoLabel={DETAIL_COPY.requestLinkInfoLabel}
          info={DETAIL_COPY.requestLinkInfo}
        />
        <LinkCard
          number={2}
          title={DETAIL_COPY.resultLink}
          links={links.result}
          infoLabel={DETAIL_COPY.resultLinkInfoLabel}
          info={DETAIL_COPY.resultLinkInfo}
        />
      </ol>
      <Link
        to={generatePath(ROUTES.formConnection, { id: formConnectionId })}
        className="kern-link"
      >
        {APPROVAL_COPY.openConnection}
      </Link>
    </section>
  );
}
