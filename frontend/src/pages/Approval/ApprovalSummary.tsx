import { APPROVAL_COPY } from './constants';
import DescriptionLine from './DescriptionLine';
import PublishSummary from './PublishSummary';
import type { ApprovalSummaryProps } from './types';
import { lastSavedLineOf } from './utils';

/**
 * What the request acts on (S3 "Body"): for `publish`, the publish step's summary; for
 * `delete_draft`, the description line, the draft's last save, and that its content will be gone
 * for good. Nothing once the draft is gone. The other actions' bodies come with T082.
 */
export default function ApprovalSummary({ action, draft }: ApprovalSummaryProps) {
  if (draft === null) {
    return null;
  }
  if (action === 'publish') {
    return <PublishSummary draft={draft} />;
  }
  if (action !== 'delete_draft') {
    return null;
  }
  return (
    <div className="flex flex-col gap-8">
      {draft.description && <DescriptionLine description={draft.description} />}
      <p className="text-kern-static-medium text-kern-layout-text-default">
        {lastSavedLineOf(draft.updated_at)}
      </p>
      <p className="text-kern-static-medium text-kern-layout-text-default font-semibold">
        {APPROVAL_COPY.goneForGood}
      </p>
    </div>
  );
}
