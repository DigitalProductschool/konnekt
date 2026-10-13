import { useId } from 'react';

import CopyableUrl from '../../components/CopyableUrl';
import InfoTooltip from '../../components/InfoTooltip';
import type { LinkCardProps } from './types';

/**
 * Figma "Publish/Link card": a numbered connection URL with its copy button. On narrow
 * screens the number goes above the link, which then has the card's full width.
 */
export default function LinkCard({ number, title, url, infoLabel, info }: LinkCardProps) {
  const titleId = useId();
  return (
    <li className="rounded-kern-large border-kern-neutral-100 bg-kern-layout-background-default flex flex-col items-start gap-16 border p-16 sm:flex-row sm:items-center sm:p-24">
      {/* The list is ordered, so the number is only visual */}
      <span
        aria-hidden="true"
        className="rounded-kern-circle bg-kern-action-default text-kern-static-medium text-kern-action-on-default flex size-40 shrink-0 items-center justify-center font-semibold"
      >
        {number}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-8">
        <div className="flex items-center gap-6">
          <h3
            id={titleId}
            className="text-kern-static-medium text-kern-layout-text-default font-semibold"
          >
            {title}
          </h3>
          <InfoTooltip label={infoLabel} text={info} iconSize="small" />
        </div>
        <CopyableUrl url={url} describedBy={titleId} />
      </div>
    </li>
  );
}
