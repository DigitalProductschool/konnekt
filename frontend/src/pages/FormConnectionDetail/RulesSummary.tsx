import { requestedRuleDocuments, ruleDocumentsOf } from '@connection-portal/rules/conditions';
import { useMemo, useRef, useState } from 'react';

import { useDocumentTypes } from '../../hooks/useDocumentTypes';
import { useLanguage } from '../../hooks/useLanguage';
import { draftRuleDocumentsOf } from '../../utils/connectionSummary';
import { CONNECTION_DETAIL_COPY } from './constants';
import DetailAccordion from './DetailAccordion';
import PdfDownload, { PdfFailure } from './PdfDownload';
import RulesSummaryBody from './RulesSummaryBody';
import type { RulesSummaryProps } from './types';
import { requestedDocumentsOf, summaryCountsOf } from './utils';

/**
 * The Summary accordion (S15; FR-046 (b), (i); U82 6396:48191, U91 7203:50531): "Summary" with
 * the counts "2 documents · 9 data items · 3 variants · 4 rules" and "View summary" / "Hide
 * summary" (`DetailAccordion`, T078); open, the documents part, a 1px line in action blue at 30 %,
 * then "Rules" with the variants as tabs and the findings (`RulesSummaryContent`), the parts 24px
 * apart. In the header, between the counts and the toggle, the content's version and "Download
 * PDF" (spec 011, which lifts F53; FR-001, FR-032, design-notes §2): both details, a published
 * connection's and a stored draft's, pass `version` and the page's download (`pdf`), the approval
 * page neither (FR-006). A failed run's alert sits under the header row (`PdfFailure`). There is
 * no "Edit rules": the footer's "Edit connection" is the one way into editing (FR-046 (a); U83
 * #35). The open part is `RulesSummaryBody`, memoised without `pdf`, so that a run's state changes
 * render only the header (T050).
 *
 * The catalog names what the checks read on a published connection (FR-047: the requested
 * documents with their requested fields, as the approval page checks a draft), and, on a draft,
 * the data its rules check without requesting it (FR-004). A draft's rules aren't checked. Until
 * the catalog loads, or if it fails, a published connection's rules show unchecked and a draft's
 * statements name only the requested documents.
 */
export default function RulesSummary({
  branches,
  documents,
  open,
  onToggle,
  draft = false,
  version,
  pdf,
}: RulesSummaryProps) {
  // Without `open`, the accordion keeps its own state (both details pages pass `open` today)
  const [ownOpen, setOwnOpen] = useState(true);
  // "Try again" goes with its alert: the focus moves to "Download PDF", busy, not to the page
  const pdfButtonRef = useRef<HTMLButtonElement>(null);
  const { status, documentTypes } = useDocumentTypes();
  const { language } = useLanguage();
  const copy = CONNECTION_DETAIL_COPY[language];
  // The statements in the language (spec 009, R4): a switch rebuilds the context
  const context = useMemo(
    () => ({
      documents: draft
        ? draftRuleDocumentsOf(documents, documentTypes)
        : ruleDocumentsOf(documents),
      optionSets: [],
      language,
    }),
    [draft, documents, documentTypes, language]
  );
  const checkDocuments = useMemo(
    () =>
      !draft && status === 'loaded'
        ? requestedRuleDocuments(documentTypes, requestedDocumentsOf(documents))
        : null,
    [draft, status, documentTypes, documents]
  );

  return (
    <DetailAccordion
      title={copy.summaryTitle}
      counts={summaryCountsOf(documents, branches, language)}
      viewLabel={copy.viewSummary}
      hideLabel={copy.hideSummary}
      open={open ?? ownOpen}
      onToggle={onToggle ?? (() => setOwnOpen((isOpen) => !isOpen))}
      actions={
        version !== undefined && (
          <PdfDownload version={version} pdf={pdf} buttonRef={pdfButtonRef} />
        )
      }
      notice={
        pdf?.state.status === 'failed' && (
          <PdfFailure
            notice={pdf.state.notice}
            onRetry={() => {
              pdfButtonRef.current?.focus();
              pdf.download();
            }}
          />
        )
      }
    >
      <RulesSummaryBody
        branches={branches}
        documents={documents}
        draft={draft}
        context={context}
        checkDocuments={checkDocuments}
      />
    </DetailAccordion>
  );
}
