import { useId } from 'react';

import BranchName from '../../components/BranchName';
import CopyableUrl from '../../components/CopyableUrl';
import type { LinkCardUrlProps } from './types';

/**
 * A link card's URL with "Copy link" (U37 6396:47732–6396:47749), and with several variants the
 * variant's name above it, with its (i) (F24, F31). The copy button is described by the card's
 * title and the variant's name. The URL copies in full, however it wraps (FYI #13).
 */
export default function LinkCardUrl({ link, titleId }: LinkCardUrlProps) {
  const labelId = useId();
  if (!link.branch) {
    return <CopyableUrl url={link.url} describedBy={titleId} />;
  }
  return (
    <div className="flex flex-col gap-8">
      <BranchName name={link.branch.name} description={link.branch.description}>
        <p
          id={labelId}
          className="text-kern-static-small text-kern-layout-text-default leading-(--kern-typography-line-height-medium-static) font-semibold"
        >
          {link.branch.name}
        </p>
      </BranchName>
      <CopyableUrl url={link.url} describedBy={`${titleId} ${labelId}`} />
    </div>
  );
}
