import { requestedRuleDocuments } from '@connection-portal/rules/conditions';
import { useMemo } from 'react';

import { useDocumentTypes } from '../../hooks/useDocumentTypes';
import { useOptionSets } from '../../hooks/useOptionSets';
import { useRuleChecks } from '../../hooks/useRuleChecks';
import PublishFindingLine from '../FormConnectionEditor/PublishFindingLine';
import { findingLinesOf } from '../FormConnectionEditor/utils';
import { APPROVAL_COPY } from './constants';
import type { ApprovalFindingsProps } from './types';
import { checkedBranchesOf, requestedDocumentsOf } from './utils';

/**
 * "Rule checks" (S3 "Body", `publish`; FR-023): the checks of the draft's variants, run in the
 * browser as in the editor, over the requested documents with their requested fields and the
 * value sets, listed as the publish dialog lists them: one line per variant with findings, from
 * `dialogLineOf()`, or "No findings.". While a variant hasn't been checked yet, "Checking the
 * rules…" in a polite status region, which stays rendered so that its text is announced. The
 * findings never block approving, and nothing about them is stored, sent or logged.
 */
export default function ApprovalFindings({ draft }: ApprovalFindingsProps) {
  const { status: catalogStatus, documentTypes } = useDocumentTypes();
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
  const lines = pending || failed ? [] : findingLinesOf(branches, byBranch);

  return (
    <section
      aria-labelledby="approval-checks-title"
      className="rounded-kern-large bg-kern-layout-background-default flex flex-col gap-16 border border-(--kern-color-decorative-border-default) p-24"
    >
      <h2
        id="approval-checks-title"
        className="text-kern-adaptive-medium text-kern-layout-text-default font-semibold"
      >
        {APPROVAL_COPY.checksTitle}
      </h2>
      {/* Empty, it leaves the flow (no gap) but stays rendered, so its text is announced */}
      <p
        role="status"
        className="text-kern-static-medium text-kern-layout-text-muted empty:absolute"
      >
        {pending ? APPROVAL_COPY.checking : ''}
      </p>
      {failed && (
        <p className="text-kern-static-medium text-kern-layout-text-muted">
          {APPROVAL_COPY.checksFailed}
        </p>
      )}
      {!pending && !failed && lines.length === 0 && (
        <p className="text-kern-static-medium text-kern-layout-text-default">
          {APPROVAL_COPY.noFindings}
        </p>
      )}
      {lines.length > 0 && (
        <ul className="flex flex-col gap-8">
          {lines.map((line) => (
            <PublishFindingLine key={line.key} line={line} />
          ))}
        </ul>
      )}
    </section>
  );
}
