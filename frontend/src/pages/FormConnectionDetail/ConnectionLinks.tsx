import { useLanguage } from '../../hooks/useLanguage';
import { CONNECTION_DETAIL_COPY } from './constants';
import DetailAccordion from './DetailAccordion';
import LinkCard from './LinkCard';
import type { ConnectionLinksProps } from './types';
import { linksCountsOf, resultLinksOf } from './utils';

/**
 * The Links accordion, "Links for your service" (U80 6396:47648, U91 7246:51436; FR-046,
 * FR-052f): the trigger URL ("Request link") once, then the pull URL ("Result link") of every
 * variant, Standard first, each labelled with the variant's name and its ⓘ (F51; F24); with
 * Standard only, its URL unlabelled, as in spec 001 (W2). The two parts are numbered and
 * divided by a line; no name header (U07 #9). Open right after publishing (U80). While the
 * connection is deactivated, the URLs stay readable and the copy buttons are off (40 %), each
 * explaining "Activate the connection first" on hover and focus (U89 6417:31309; FR-046, W21). A
 * scheduled connection isn't active yet, but its links are ready to be added to the service
 * before its start, so they copy as an active connection's do (spec 010, S15; FR-007).
 */
export default function ConnectionLinks({ formConnection, open, onToggle }: ConnectionLinksProps) {
  const deactivated = formConnection.state === 'deactivated';
  const { language } = useLanguage();
  const copy = CONNECTION_DETAIL_COPY[language];
  return (
    <DetailAccordion
      title={copy.linksTitle}
      counts={linksCountsOf(formConnection, language)}
      viewLabel={copy.viewLinks}
      hideLabel={copy.hideLinks}
      open={open}
      onToggle={onToggle}
    >
      <ol className="flex flex-col divide-y divide-(--kern-color-decorative-border-default)">
        <LinkCard
          number={1}
          title={copy.requestLink}
          links={[{ key: 'trigger', url: formConnection.trigger_url, branch: null }]}
          infoLabel={copy.requestLinkInfoLabel}
          info={copy.requestLinkInfo}
          deactivated={deactivated}
        />
        <LinkCard
          number={2}
          title={copy.resultLink}
          links={resultLinksOf(formConnection)}
          infoLabel={copy.resultLinkInfoLabel}
          info={copy.resultLinkInfo}
          deactivated={deactivated}
        />
      </ol>
    </DetailAccordion>
  );
}
