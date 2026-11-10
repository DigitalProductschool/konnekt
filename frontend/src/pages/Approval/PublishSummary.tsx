import { countRules } from '@connection-portal/rules/tree';
import { useMemo } from 'react';

import { useDocumentTypes } from '../../hooks/useDocumentTypes';
import { useLanguage } from '../../hooks/useLanguage';
import { CONNECTION_DETAIL_COPY, SUMMARY_TABLE_CLASSES } from '../FormConnectionDetail/constants';
import RulesSummary from '../FormConnectionDetail/RulesSummary';
import { PUBLISH_DIALOG_COPY } from '../FormConnectionEditor/constants';
import PublishSummaryRow from '../FormConnectionEditor/PublishSummaryRow';
import ApprovalFindings from './ApprovalFindings';
import DescriptionLine from './DescriptionLine';
import type { PublishSummaryProps } from './types';
import { documentsInLanguageOf } from './utils';

/**
 * The body of `publish` (S3 "Body"; S14's look, T076): the description line, the publish dialog's
 * summary ("Dialog content/Publish · summary", U73 7058:62120: the 8px-round table with the
 * decorative border, its rows `PublishSummaryRow`, "Personal ID · 7 data items" per document and
 * "Standard · 2 rules" per variant in tab order), the rule checks' lines as the dialog lists them
 * (`ApprovalFindings`, C4), then the stored draft in full as the draft details show it: the
 * Summary card (`RulesSummary`, open) with the documents and their data items and the variants'
 * rules as tabs, rules on data the draft doesn't request included, which the catalog names. The
 * card runs no second check: a draft's rules are checked by `ApprovalFindings` only.
 *
 * The documents' and data items' labels come from the catalog in the website's language
 * (`documentsInLanguageOf()`, spec 009), so that a switch relabels them; the catalog is read here
 * once and handed to the rule checks.
 */
export default function PublishSummary({ draft }: PublishSummaryProps) {
  const { language } = useLanguage();
  const copy = PUBLISH_DIALOG_COPY[language];
  const catalog = useDocumentTypes();
  const { documentTypes } = catalog;
  const documents = useMemo(
    () => documentsInLanguageOf(draft.documents, documentTypes),
    [draft.documents, documentTypes]
  );
  const documentLines = documents.length
    ? documents.map((document) => copy.documentLine(document.label, document.fields.length))
    : [CONNECTION_DETAIL_COPY[language].noDocumentsYet];
  const ruleLines = draft.branches.map((branch) =>
    copy.ruleLine(branch.name.trim(), countRules(branch.items))
  );

  return (
    <div className="flex flex-col gap-24">
      {draft.description && <DescriptionLine description={draft.description} />}
      <dl className={SUMMARY_TABLE_CLASSES}>
        <PublishSummaryRow label={copy.documents} values={documentLines} divided />
        <PublishSummaryRow label={copy.rules} values={ruleLines} />
      </dl>
      <ApprovalFindings draft={draft} catalog={catalog} />
      <RulesSummary branches={draft.branches} documents={documents} draft />
    </div>
  );
}
