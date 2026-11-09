import { generatePath, Link } from 'react-router';

import { ROUTES } from '../../constants';
import { DETAIL_COPY } from '../FormConnectionDetail/constants';
import ApprovalLinkCards from './ApprovalLinkCards';
import { APPROVAL_COPY } from './constants';
import type { ApprovalUrlsProps } from './types';

/**
 * After publishing or reactivating (S3 `done`): the connection URLs to add to the service, in the
 * details' Links card (`ApprovalLinkCards`) under "Add both links to your form. Each one goes in
 * its own field.", then "Open the connection" (`kern-link`), which leads to its details.
 */
export default function ApprovalUrls({
  urls,
  formConnectionId,
  deactivated = false,
}: ApprovalUrlsProps) {
  return (
    <div className="flex w-full flex-col items-start gap-24">
      <ApprovalLinkCards urls={urls} lead={DETAIL_COPY.linksLead} deactivated={deactivated} />
      <Link
        to={generatePath(ROUTES.formConnection, { id: formConnectionId })}
        className="kern-link"
      >
        {APPROVAL_COPY.openConnection}
      </Link>
    </div>
  );
}
