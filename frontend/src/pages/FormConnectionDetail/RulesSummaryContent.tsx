import { KernAlert } from '@kern-ux-annex/kern-react-kit';

import FeedbackLoader from '../../components/FeedbackLoader';
import { useOptionSets } from '../../hooks/useOptionSets';
import { DETAIL_COPY } from './constants';
import SummaryBranch from './SummaryBranch';
import type { RulesSummaryContentProps } from './types';

/**
 * The open summary: one section per variant, main variant first. The statements read enum values
 * by their label, so the value sets load first (FR-005), as the rest of the page says when
 * loading fails. A draft's variants have no id, and a draft may have none yet: it then reads as a
 * variant without rules does.
 */
export default function RulesSummaryContent({ branches, context }: RulesSummaryContentProps) {
  const { status, optionSets, retry } = useOptionSets();

  if (status === 'loading') {
    return <FeedbackLoader label={DETAIL_COPY.loadingRules} />;
  }
  if (status === 'failed') {
    return (
      <div className="flex flex-col items-start gap-16">
        <KernAlert variant="danger" title={DETAIL_COPY.rulesErrorTitle} className="w-full">
          {DETAIL_COPY.rulesErrorText}
        </KernAlert>
        <button type="button" onClick={retry} className="kern-btn kern-btn--secondary">
          <span className="kern-label">{DETAIL_COPY.retry}</span>
        </button>
      </div>
    );
  }
  if (branches.length === 0) {
    return (
      <p className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)">
        {DETAIL_COPY.noRules}
      </p>
    );
  }
  return (
    <>
      {branches.map((branch, index) => (
        <SummaryBranch
          // A draft's variants have no id yet, and don't move on this read-only page
          key={branch.id ?? `draft-${index}`}
          branch={branch}
          context={{ ...context, optionSets }}
        />
      ))}
    </>
  );
}
