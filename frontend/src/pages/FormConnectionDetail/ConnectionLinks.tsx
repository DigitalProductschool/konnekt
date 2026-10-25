import { KernBadge } from '@kern-ux-annex/kern-react-kit';

import successTick from '../../assets/illustrations/success-tick.svg';
import { DETAIL_COPY } from './constants';
import LinkCard from './LinkCard';
import type { ConnectionLinksProps } from './types';
import { resultLinksOf } from './utils';

/**
 * Figma "Publish/Success card": the trigger URL ("Request link") once, and the pull URL ("Result
 * link") of every variant, Standard first, each labelled with the variant's name and its (i)
 * (FR-026, US3-AS7; F24, F31). With Standard only, the URLs show as spec 001 shows them, without
 * a name (W2). Right after publishing it opens with the tick and "Your connection is live".
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
          links={[{ key: 'trigger', url: formConnection.trigger_url, branch: null }]}
          infoLabel={DETAIL_COPY.requestLinkInfoLabel}
          info={DETAIL_COPY.requestLinkInfo}
        />
        <LinkCard
          number={2}
          title={DETAIL_COPY.resultLink}
          links={resultLinksOf(formConnection)}
          infoLabel={DETAIL_COPY.resultLinkInfoLabel}
          info={DETAIL_COPY.resultLinkInfo}
        />
      </ol>
    </section>
  );
}
