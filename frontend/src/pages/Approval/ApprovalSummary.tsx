import { useLanguage } from '../../hooks/useLanguage';
import { APPROVAL_COPY, BODY_TEXT_CLASSES } from './constants';
import DescriptionLine from './DescriptionLine';
import PublishSummary from './PublishSummary';
import StatusSummary from './StatusSummary';
import type { ApprovalSummaryProps } from './types';
import { isStatusAction, lastSavedLineOf } from './utils';

/**
 * What the request acts on (S3 "Body"): for `publish`, the publish dialog's summary, the rule
 * checks and the draft in full (`PublishSummary`); for `delete_draft`, the description line, the
 * draft's last save ("Last saved 04.11.2026, 14:32", design-notes §3 "Dates"), and that its
 * content will be gone for good; for `deactivate`, `reactivate`, `delete` and `set_start_date`
 * (spec 010), the connection's URLs and what will happen (`StatusSummary`). Nothing once the
 * draft or the connection is gone. The start date the agent asked for is part of what will happen
 * (FR-065).
 */
export default function ApprovalSummary({
  action,
  draft,
  connection,
  urls,
  startDate,
}: ApprovalSummaryProps) {
  const { language } = useLanguage();
  if (isStatusAction(action)) {
    return (
      connection && (
        <StatusSummary action={action} connection={connection} urls={urls} startDate={startDate} />
      )
    );
  }
  if (draft === null) {
    return null;
  }
  if (action === 'publish') {
    return <PublishSummary draft={draft} startDate={startDate} />;
  }
  return (
    <div className="flex flex-col gap-8">
      {draft.description && <DescriptionLine description={draft.description} />}
      <p className={BODY_TEXT_CLASSES}>{lastSavedLineOf(draft.updated_at, language)}</p>
      <p className={`${BODY_TEXT_CLASSES} font-semibold`}>{APPROVAL_COPY[language].goneForGood}</p>
    </div>
  );
}
