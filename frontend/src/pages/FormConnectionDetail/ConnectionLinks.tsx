import { KernBadge } from '@kern-ux-annex/kern-react-kit';

import successTick from '../../assets/illustrations/success-tick.svg';
import { DETAIL_COPY } from './constants';
import LinkCard from './LinkCard';
import type { ConnectionLinksProps } from './types';

/**
 * Figma "Publish/Success card": the trigger URL ("Request link") and the pull URL ("Result
 * link"). Right after publishing it opens with the tick and "Your connection is live".
 */
export default function ConnectionLinks({
  formConnection,
  published,
  headingRef,
}: ConnectionLinksProps) {
  return (
    <section
      aria-labelledby="links-title"
      className="rounded-kern-large border-kern-neutral-100 bg-kern-layout-background-default flex flex-col items-center gap-16 border px-16 py-40 sm:px-40"
    >
      {published && (
        <>
          <img src={successTick} alt="" />
          <KernBadge
            variant="success"
            label={DETAIL_COPY.published}
            withIcon
            className="kern-badge--small"
          />
        </>
      )}
      <h2
        id="links-title"
        ref={headingRef}
        tabIndex={-1}
        className="text-kern-adaptive-large text-kern-layout-text-default text-center font-semibold focus:outline-none"
      >
        {published ? DETAIL_COPY.liveTitle : DETAIL_COPY.linksTitle}
      </h2>
      <p className="text-kern-static-medium text-kern-layout-text-muted text-center">
        {DETAIL_COPY.linksLead}
      </p>
      <ol className="flex w-full flex-col gap-12 pt-8">
        <LinkCard
          number={1}
          title={DETAIL_COPY.requestLink}
          url={formConnection.trigger_url}
          infoLabel={DETAIL_COPY.requestLinkInfoLabel}
          info={DETAIL_COPY.requestLinkInfo}
        />
        <LinkCard
          number={2}
          title={DETAIL_COPY.resultLink}
          url={formConnection.pull_url}
          infoLabel={DETAIL_COPY.resultLinkInfoLabel}
          info={DETAIL_COPY.resultLinkInfo}
        />
      </ol>
    </section>
  );
}
