import { useId, useMemo, useState } from 'react';

import expandLessIcon from '../../assets/icons/expand-less.svg';
import expandMoreIcon from '../../assets/icons/expand-more.svg';
import { ruleDocumentsOf } from '../../utils/rules/conditions';
import { DETAIL_COPY } from './constants';
import RulesSummaryContent from './RulesSummaryContent';
import type { RulesSummaryProps } from './types';
import { rulesCountOf } from './utils';

/**
 * Figma "Summary card" (U37 6396:47750, open 6396:48191; S6): the rules of every variant,
 * read-only, in a card that is closed until "View summary" (FYI #17). Its "Download PDF", like
 * the screen's activity and counters, isn't built (F25).
 */
export default function RulesSummary({ branches, documents }: RulesSummaryProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const contentId = useId();
  const context = useMemo(
    () => ({ documents: ruleDocumentsOf(documents), optionSets: [] }),
    [documents]
  );

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-kern-large bg-kern-layout-background-default overflow-hidden border border-(--kern-color-decorative-border-default)"
    >
      <div className="flex items-center gap-8 p-24">
        <div className="flex min-w-0 flex-1 flex-col">
          <h2
            id={titleId}
            className="text-kern-static-medium text-kern-layout-text-default font-semibold"
          >
            {DETAIL_COPY.rulesTitle}
          </h2>
          <p className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)">
            {rulesCountOf(branches)}
          </p>
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen((isOpen) => !isOpen)}
          className="kern-btn kern-btn--tertiary kern-btn--small shrink-0"
        >
          <span className="kern-label">
            {open ? DETAIL_COPY.hideSummary : DETAIL_COPY.viewSummary}
          </span>
          <img src={open ? expandLessIcon : expandMoreIcon} alt="" className="size-20" />
        </button>
      </div>
      <div id={contentId} hidden={!open} className="flex flex-col gap-24 px-24 pb-24">
        {open && <RulesSummaryContent branches={branches} context={context} />}
      </div>
    </section>
  );
}
