import { useId } from 'react';

import InfoTooltip from '../../components/InfoTooltip';
import LinkCardUrl from './LinkCardUrl';
import type { LinkCardProps } from './types';

/**
 * Figma "Publish/Link card": a numbered connection URL with its copy button, or one per variant,
 * each labelled with the variant's name (FR-026, U37 6396:47723), the number then beside the
 * title. On narrow screens the number goes above the links, which then have the card's full
 * width.
 */
export default function LinkCard({ number, title, links, infoLabel, info }: LinkCardProps) {
  const titleId = useId();
  return (
    <li
      className={`rounded-kern-large border-kern-neutral-100 bg-kern-layout-background-default flex flex-col items-start gap-16 border p-16 sm:flex-row sm:p-24 ${links.length > 1 ? 'sm:items-start' : 'sm:items-center'}`}
    >
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
        {links.map((link) => (
          <LinkCardUrl key={link.key} link={link} titleId={titleId} />
        ))}
      </div>
    </li>
  );
}
