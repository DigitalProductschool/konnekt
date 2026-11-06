import { DETAIL_COPY } from '../FormConnectionDetail/constants';
import LinkCard from '../FormConnectionDetail/LinkCard';
import type { ApprovalLinkCardsProps } from './types';
import { urlsLinksOf } from './utils';

/**
 * The connection URLs in the details page's link cards: the trigger URL once, and every variant's
 * pull URL. Shared by the outcome after publishing or reactivating (`ApprovalUrls`) and the body of
 * the status actions (`StatusSummary`), which words its own lead.
 */
export default function ApprovalLinkCards({ urls }: ApprovalLinkCardsProps) {
  const links = urlsLinksOf(urls);
  return (
    <ol className="flex w-full flex-col gap-12">
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
  );
}
