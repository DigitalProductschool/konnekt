import { useId } from 'react';

import { useCopy } from '../../hooks/useLanguage';
import { CONNECTION_DETAIL_COPY } from '../FormConnectionDetail/constants';
import LinkCard from '../FormConnectionDetail/LinkCard';
import { BODY_TEXT_CLASSES, CARD_CLASSES, SECTION_TITLE_CLASSES } from './constants';
import type { ApprovalLinkCardsProps } from './types';
import { urlsLinksOf } from './utils';

/**
 * "Links for your service" as the details' Links card draws it (S15, U80 6396:47648; T078's
 * `LinkCard`): the card with its heading and, under it, the caller's lead, then the request link
 * once and every variant's result link, numbered and divided by a line (`divide-y`, as
 * `ConnectionLinks` lists them), each URL with T028's "Copy link" (`CopyableUrl`). Shared by the
 * body of the status actions (`StatusSummary`: what becomes of the URLs) and the outcome after
 * publishing or reactivating (`ApprovalUrls`: what to do with them). While the connection is
 * deactivated, the copy buttons are off and say why ("Activate the connection first", W21). The
 * section's `h2` keeps the cards' `h3` titles one level under it.
 */
export default function ApprovalLinkCards({
  urls,
  lead,
  deactivated = false,
}: ApprovalLinkCardsProps) {
  const titleId = useId();
  const copy = useCopy(CONNECTION_DETAIL_COPY);
  const links = urls ? urlsLinksOf(urls) : null;
  return (
    <section aria-labelledby={titleId} className={`${CARD_CLASSES} w-full`}>
      {/* The cards' own 24px padding follows the lead, so the header keeps none at its bottom */}
      <div className={`flex flex-col gap-4 px-24 pt-24 ${links ? '' : 'pb-24'}`}>
        <h2 id={titleId} className={SECTION_TITLE_CLASSES}>
          {copy.linksTitle}
        </h2>
        <p className={BODY_TEXT_CLASSES}>{lead}</p>
      </div>
      {links && (
        <ol className="flex flex-col divide-y divide-(--kern-color-decorative-border-default)">
          <LinkCard
            number={1}
            title={copy.requestLink}
            links={links.trigger}
            infoLabel={copy.requestLinkInfoLabel}
            info={copy.requestLinkInfo}
            deactivated={deactivated}
          />
          <LinkCard
            number={2}
            title={copy.resultLink}
            links={links.result}
            infoLabel={copy.resultLinkInfoLabel}
            info={copy.resultLinkInfo}
            deactivated={deactivated}
          />
        </ol>
      )}
    </section>
  );
}
