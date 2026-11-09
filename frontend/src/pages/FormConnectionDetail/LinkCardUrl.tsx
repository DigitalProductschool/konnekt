import { useId } from 'react';

import BranchName from '../../components/BranchName';
import CopyableUrl from '../../components/CopyableUrl';
import type { LinkCardUrlProps } from './types';

/**
 * A link's URL row with "Copy link" (U80 6809:46454; T028's `CopyableUrl`: one line cut with "…",
 * copied in full, "✓ Copied" for 2 s), and with several variants the variant's name 4px above
 * it (label/small), with its ⓘ holding the description (F51; none without one, 002-S4.3). The
 * copy button's name ends with the card's title and the variant's name. While the connection is
 * deactivated, the button is off and says why (W21).
 */
export default function LinkCardUrl({ link, titleId, deactivated = false }: LinkCardUrlProps) {
  const labelId = useId();
  if (!link.branch) {
    return <CopyableUrl url={link.url} describedBy={titleId} deactivated={deactivated} />;
  }
  return (
    <div className="flex flex-col gap-4">
      <BranchName name={link.branch.name} description={link.branch.description}>
        <p
          id={labelId}
          className="text-kern-static-small text-kern-layout-text-default leading-(--kern-typography-line-height-medium-static) font-semibold"
        >
          {link.branch.name}
        </p>
      </BranchName>
      <CopyableUrl url={link.url} describedBy={`${titleId} ${labelId}`} deactivated={deactivated} />
    </div>
  );
}
