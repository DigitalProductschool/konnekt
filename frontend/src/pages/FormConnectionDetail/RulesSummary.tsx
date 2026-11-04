import { useId, useMemo, useState } from 'react';
import { generatePath, Link } from 'react-router';

import expandLessIcon from '../../assets/icons/expand-less.svg';
import expandMoreIcon from '../../assets/icons/expand-more.svg';
import { ROUTES } from '../../constants';
import { ruleDocumentsOf } from '../../utils/rules/conditions';
import { DETAIL_COPY, EDIT_RULES_STATE } from './constants';
import RulesSummaryContent from './RulesSummaryContent';
import type { RulesSummaryProps } from './types';
import { draftRuleDocumentsOf, rulesCountsOf } from './utils';

/**
 * Figma "Summary card" (U37 6396:47750, open 6396:48191; S6): the rules of every variant,
 * read-only, in a card that is closed until "View summary" (FYI #17). While closed, it counts the
 * variants and the rules under its title ("3 variants · 6 rules", Figma 10.11 6530:40737; B8).
 * "Download PDF", like the screen's activity, isn't built (F25). In its place, "Edit rules" opens the
 * edit wizard at the Rules step, which asks for confirmation when saving, not on entry (FR-030;
 * F27, W7). On phones the actions go under the title, and "Edit rules" shows only its icon, so
 * that both fit. A draft's card shows what the draft holds, incomplete rules included, without
 * "Edit rules": the draft's progress and "Continue" lead into its flow (spec 005, S6). Its rules
 * may check data it doesn't request (FR-004), which `catalog` names.
 */
export default function RulesSummary({
  formConnectionId,
  branches,
  documents,
  draft = false,
  catalog,
}: RulesSummaryProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const contentId = useId();
  const context = useMemo(
    () => ({
      documents: catalog ? draftRuleDocumentsOf(documents, catalog) : ruleDocumentsOf(documents),
      optionSets: [],
    }),
    [documents, catalog]
  );
  const counts = useMemo(() => rulesCountsOf(branches), [branches]);

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-kern-large bg-kern-layout-background-default overflow-hidden border border-(--kern-color-decorative-border-default)"
    >
      <div className="flex flex-wrap items-center gap-8 p-24">
        {/* Sized by its text, so that the actions wrap under it rather than squeeze it */}
        <div className="flex min-w-0 flex-auto flex-col">
          <h2
            id={titleId}
            className="text-kern-static-medium text-kern-layout-text-default font-semibold"
          >
            {DETAIL_COPY.rulesTitle}
          </h2>
          <p
            hidden={open}
            className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)"
          >
            {counts}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-8">
          {!draft && (
            <Link
              to={generatePath(ROUTES.editFormConnection, { id: formConnectionId })}
              state={EDIT_RULES_STATE}
              className="kern-btn kern-btn--secondary"
            >
              <span aria-hidden="true" className="kern-icon kern-icon--edit" />
              <span className="kern-label max-sm:sr-only">{DETAIL_COPY.editRules}</span>
            </Link>
          )}
          <button
            type="button"
            aria-expanded={open}
            aria-controls={contentId}
            onClick={() => setOpen((isOpen) => !isOpen)}
            className="kern-btn kern-btn--tertiary kern-btn--small"
          >
            <span className="kern-label">
              {open ? DETAIL_COPY.hideSummary : DETAIL_COPY.viewSummary}
            </span>
            <img src={open ? expandLessIcon : expandMoreIcon} alt="" className="size-20" />
          </button>
        </div>
      </div>
      <div id={contentId} hidden={!open} className="flex flex-col gap-24 px-24 pb-24">
        {open && <RulesSummaryContent branches={branches} context={context} />}
      </div>
    </section>
  );
}
