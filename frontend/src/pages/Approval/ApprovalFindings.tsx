import { requestedRuleDocuments } from '@konnekt/rules/conditions';
import { useId, useMemo } from 'react';

import { useLanguage } from '../../hooks/useLanguage';
import { useOptionSets } from '../../hooks/useOptionSets';
import { useRuleChecks } from '../../hooks/useRuleChecks';
import PublishFindingLine from '../FormConnectionEditor/PublishFindingLine';
import { findingLinesOf, warningsFirst } from '../FormConnectionEditor/utils';
import { APPROVAL_COPY, BODY_TEXT_CLASSES, SECTION_TITLE_CLASSES } from './constants';
import type { ApprovalFindingsProps } from './types';
import { checkedBranchesOf, requestedDocumentsOf } from './utils';

/**
 * "Rule checks" (S3 "Body", `publish`; FR-023): the checks of the draft's variants, run in the
 * browser as in the editor, over the requested documents with their requested fields and the
 * value sets, listed as the publish dialog lists them (T076; U77 6760:47353): one line per
 * variant with findings in C4's words (`PublishFindingLine`), warnings first, 4px apart; or "No
 * findings.". While a variant hasn't been checked yet, "Checking the rules…" in a polite status
 * region, which stays rendered so that its text is announced. The findings never block approving,
 * and nothing about them is stored, sent or logged.
 */
export default function ApprovalFindings({ draft, catalog }: ApprovalFindingsProps) {
  const titleId = useId();
  const { language } = useLanguage();
  const copy = APPROVAL_COPY[language];
  const { status: catalogStatus, documentTypes } = catalog;
  const { status: optionSetsStatus, optionSets } = useOptionSets();
  const branches = useMemo(() => checkedBranchesOf(draft), [draft]);
  const loaded = catalogStatus === 'loaded' && optionSetsStatus === 'loaded';
  const failed = catalogStatus === 'failed' || optionSetsStatus === 'failed';
  const context = useMemo(
    () =>
      loaded
        ? {
            documents: requestedRuleDocuments(documentTypes, requestedDocumentsOf(draft.documents)),
            optionSets,
          }
        : null,
    [loaded, documentTypes, draft.documents, optionSets]
  );
  const { byBranch } = useRuleChecks(branches, context, branches[0]?.key ?? '');
  const pending = !failed && (!loaded || branches.some((branch) => !byBranch[branch.key]));
  const lines =
    pending || failed ? [] : warningsFirst(findingLinesOf(branches, byBranch, language));

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-8">
      <h2 id={titleId} className={SECTION_TITLE_CLASSES}>
        {copy.checksTitle}
      </h2>
      {/* Empty, it leaves the flow (no gap) but stays rendered, so its text is announced */}
      <p
        role="status"
        className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static) empty:absolute"
      >
        {pending ? copy.checking : ''}
      </p>
      {failed && (
        <p className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)">
          {copy.checksFailed}
        </p>
      )}
      {!pending && !failed && lines.length === 0 && (
        <p className={BODY_TEXT_CLASSES}>{copy.noFindings}</p>
      )}
      {lines.length > 0 && (
        // "Rule findings" (U77 6760:47353): 4 between the lines
        <ul className="flex flex-col gap-4">
          {lines.map((line) => (
            <PublishFindingLine key={line.key} line={line} />
          ))}
        </ul>
      )}
    </section>
  );
}
