import { useId } from 'react';

import { DETAIL_COPY } from './constants';

/**
 * A draft's card in place of the Links accordion (S16; U93 "Links card · not created yet (draft)"
 * 7362:54905, U07 #25): the closed accordion's card with the heading "Links for your service" and
 * "Created when the connection is published and active." under it, 4px apart, 24px from the
 * card's edges, and no toggle: a draft has no links (FR-049, 005-S6: no connection URL anywhere).
 */
export default function DraftCard() {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className="rounded-kern-large bg-kern-layout-background-default flex flex-col gap-4 border border-(--kern-color-decorative-border-default) p-24"
    >
      <h2
        id={titleId}
        className="text-kern-static-medium text-kern-layout-text-default leading-(--kern-typography-line-height-medium-static) font-semibold break-words"
      >
        {DETAIL_COPY.linksTitle}
      </h2>
      <p className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)">
        {DETAIL_COPY.draftLinksText}
      </p>
    </section>
  );
}
