import { countRules } from '@connection-portal/rules/tree';

import { DETAIL_COPY, SUMMARY_TABLE_CLASSES } from '../FormConnectionDetail/constants';
import RulesSummary from '../FormConnectionDetail/RulesSummary';
import { PUBLISH_COPY } from '../FormConnectionEditor/constants';
import PublishSummaryRow from '../FormConnectionEditor/PublishSummaryRow';
import ApprovalFindings from './ApprovalFindings';
import DescriptionLine from './DescriptionLine';
import type { PublishSummaryProps } from './types';

/**
 * The body of `publish` (S3 "Body"; S14's look, T076): the description line, the publish dialog's
 * summary ("Dialog content/Publish · summary", U73 7058:62120: the 8px-round table with the
 * decorative border, its rows `PublishSummaryRow`, "Personal ID · 7 data items" per document and
 * "Standard · 2 rules" per variant in tab order), the rule checks' lines as the dialog lists them
 * (`ApprovalFindings`, C4), then the stored draft in full as the draft details show it: the
 * Summary card (`RulesSummary`, open) with the documents and their data items and the variants'
 * rules as tabs, rules on data the draft doesn't request included, which the catalog names. The
 * card runs no second check: a draft's rules are checked by `ApprovalFindings` only.
 */
export default function PublishSummary({ draft }: PublishSummaryProps) {
  const documentLines = draft.documents.length
    ? draft.documents.map((document) =>
        PUBLISH_COPY.documentLine(document.label, document.fields.length)
      )
    : [DETAIL_COPY.noDocumentsYet];
  const ruleLines = draft.branches.map((branch) =>
    PUBLISH_COPY.ruleLine(branch.name.trim(), countRules(branch.items))
  );

  return (
    <div className="flex flex-col gap-24">
      {draft.description && <DescriptionLine description={draft.description} />}
      <dl className={SUMMARY_TABLE_CLASSES}>
        <PublishSummaryRow label={PUBLISH_COPY.documents} values={documentLines} divided />
        <PublishSummaryRow label={PUBLISH_COPY.rules} values={ruleLines} />
      </dl>
      <ApprovalFindings draft={draft} />
      <RulesSummary branches={draft.branches} documents={draft.documents} draft />
    </div>
  );
}
