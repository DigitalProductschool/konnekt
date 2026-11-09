import { useId } from 'react';

import InfoTooltip from '../../components/InfoTooltip';
import LinkCardUrl from './LinkCardUrl';
import type { LinkCardProps } from './types';

/**
 * One part of the Links accordion (U80 "Link · Request link" 6809:46445, "Link · Result link"
 * 6809:46459): the 24px number, the title (title/small) with its ⓘ 4px after it, then the URL
 * rows indented 32px under the title, 8px under it; with variants, 12px under it, one group
 * per variant 24px apart (U07 #9). Padding 24. On narrow screens the URL box and its button
 * stack and take the full width (the column stretches its items).
 */
export default function LinkCard({
  number,
  title,
  links,
  infoLabel,
  info,
  deactivated = false,
}: LinkCardProps) {
  const titleId = useId();
  const labelled = links.some((link) => link.branch);
  return (
    <li className={`flex flex-col p-24 ${labelled ? 'gap-12' : 'gap-8'}`}>
      <div className="flex items-start gap-8">
        {/* The list is ordered, so the number is only visual */}
        <span
          aria-hidden="true"
          className="rounded-kern-circle bg-kern-action-default text-kern-static-small text-kern-action-on-default flex size-24 shrink-0 items-center justify-center leading-(--kern-typography-line-height-medium-static) font-semibold"
        >
          {number}
        </span>
        <div className="flex min-w-0 items-center gap-4">
          <h3
            id={titleId}
            className="text-kern-static-medium text-kern-layout-text-default leading-(--kern-typography-line-height-medium-static) font-semibold"
          >
            {title}
          </h3>
          <InfoTooltip label={infoLabel} text={info} iconSize="small" />
        </div>
      </div>
      <div className="flex flex-col gap-24 pl-32">
        {links.map((link) => (
          <LinkCardUrl key={link.key} link={link} titleId={titleId} deactivated={deactivated} />
        ))}
      </div>
    </li>
  );
}
