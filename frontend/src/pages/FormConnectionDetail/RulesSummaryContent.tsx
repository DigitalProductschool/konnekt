import { KernAlert } from '@kern-ux-annex/kern-react-kit';
import { namesOf, tabFindingsOf } from '@konnekt/rules/checks/findingMessages';
import { type KeyboardEvent, useId, useMemo, useState } from 'react';

import BranchName from '../../components/BranchName';
import FeedbackLoader from '../../components/FeedbackLoader';
import { useLanguage } from '../../hooks/useLanguage';
import { useOptionSets } from '../../hooks/useOptionSets';
import { useRuleChecks } from '../../hooks/useRuleChecks';
import { TAB_ROW_CLASSES } from '../FormConnectionEditor/RulesStep/constants';
import FindingsBannerLine from '../FormConnectionEditor/RulesStep/FindingsBannerLine';
import { tabAfterKey } from '../FormConnectionEditor/RulesStep/utils';
import { CONNECTION_DETAIL_COPY } from './constants';
import SummaryBranch from './SummaryBranch';
import type { RulesSummaryContentProps } from './types';
import { keyedBranchesOf, summaryFindingsOf } from './utils';

/**
 * The Summary's rules (FR-046 (h), FR-047; U82 6650:37774, U85 6760:48704): the findings lines,
 * then the variants as tabs, main variant first, and the open tab's rules read-only. The tabs are
 * `BranchName`'s tab form (T026) without a ⋯ or "+ Add variant" (U03 #25), 24px apart on the 1px
 * line, with the description's ⓘ or the findings' icon after the name (FR-041), and WAI-ARIA's
 * keys (the arrow keys, Home, End). As on the test step, the tab list is an empty element that
 * owns the tabs, since each icon sits beside its tab.
 *
 * The rule checks (FR-047, research R7) run in the browser on these rules once the value sets
 * and `checkDocuments` are there, in the checks' module Worker through `useRuleChecks()`, one
 * instance as on the approval page, the open tab checked first. Each variant with findings gets a
 * line, the publish dialog's sentence (C4), warnings first, read-only: the names are no links
 * (CLAR #36), and its tab the findings' icon and tooltip. Nothing about the findings is stored,
 * sent or logged; nothing shows while a variant hasn't been checked (W13). Without
 * `checkDocuments` (a draft, the approval page), nothing is checked.
 *
 * The statements read enum values by their label, so the value sets load first (FR-005), as the
 * rest of the page says when loading fails. A draft's variants have no id, and a draft may have
 * none yet: it then reads as a variant without rules does.
 */
export default function RulesSummaryContent({
  branches,
  context,
  checkDocuments = null,
}: RulesSummaryContentProps) {
  const { status, optionSets, retry } = useOptionSets();
  const { language } = useLanguage();
  const copy = CONNECTION_DETAIL_COPY[language];
  const keyed = useMemo(() => keyedBranchesOf(branches), [branches]);
  const [selected, setSelected] = useState(keyed[0]?.key ?? '');
  const baseId = useId();
  const checkContext = useMemo(
    () =>
      status === 'loaded' && checkDocuments ? { documents: checkDocuments, optionSets } : null,
    [status, checkDocuments, optionSets]
  );
  const shown = keyed.find((branch) => branch.key === selected) ?? keyed[0];
  const { byBranch } = useRuleChecks(keyed, checkContext, shown?.key ?? '');
  const tabId = (index: number) => `${baseId}-tab-${index}`;
  const panelId = `${baseId}-panel`;

  if (status === 'loading') {
    return <FeedbackLoader label={copy.loadingRules} />;
  }
  if (status === 'failed') {
    return (
      <div className="flex flex-col items-start gap-16">
        <KernAlert variant="danger" title={copy.rulesErrorTitle} className="w-full">
          {copy.rulesErrorText}
        </KernAlert>
        <button type="button" onClick={retry} className="kern-btn kern-btn--secondary">
          <span className="kern-label">{copy.retry}</span>
        </button>
      </div>
    );
  }
  if (!shown) {
    return (
      <p className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)">
        {copy.noRules}
      </p>
    );
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = tabAfterKey(event.key, index, keyed.length);
    if (next === null) {
      return;
    }
    event.preventDefault();
    setSelected(keyed[next].key);
    document.getElementById(tabId(next))?.focus();
  }

  const findings = summaryFindingsOf(keyed, byBranch, language);
  const shownIndex = keyed.indexOf(shown);
  return (
    <>
      {findings.length > 0 && (
        // 8px under the last line, then the column's 24 (U85 6760:48704: 293 → 377)
        <ul className="flex flex-col gap-4 pb-8">
          {findings.map((item) => (
            <li key={item.key}>
              <FindingsBannerLine item={item} branchKey={item.key} plainItemId={null} />
            </li>
          ))}
        </ul>
      )}
      <div className={TAB_ROW_CLASSES}>
        <div
          role="tablist"
          aria-label={copy.variants}
          aria-owns={keyed.map((_, index) => tabId(index)).join(' ')}
          // Out of the row's flow, so that the row's gap doesn't count it
          className="absolute"
        />
        {keyed.map((branch, index) => {
          const check = byBranch[branch.key];
          return (
            <BranchName
              key={branch.key}
              name={branch.name}
              description={branch.description}
              findings={
                check ? tabFindingsOf(check, branch, namesOf(branch.items), language) : null
              }
              tab={{
                id: tabId(index),
                panelId,
                selected: branch === shown,
                onSelect: () => setSelected(branch.key),
                onKeyDown: (event) => handleKeyDown(event, index),
              }}
            />
          );
        })}
      </div>
      <SummaryBranch
        branch={shown}
        context={{ ...context, optionSets }}
        panelId={panelId}
        tabId={tabId(shownIndex)}
      />
    </>
  );
}
