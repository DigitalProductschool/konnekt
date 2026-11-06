import { APPROVAL_COPY } from './constants';
import DescriptionLine from './DescriptionLine';
import PublishSummary from './PublishSummary';
import StatusSummary from './StatusSummary';
import type { ApprovalSummaryProps } from './types';
import { isStatusAction, lastSavedLineOf } from './utils';

/**
 * What the request acts on (S3 "Body"): for `publish`, the publish step's summary; for
 * `delete_draft`, the description line, the draft's last save, and that its content will be gone
 * for good; for `deactivate`, `reactivate` and `delete`, the connection's URLs and what becomes of
 * them. Nothing once the draft or the connection is gone.
 */
export default function ApprovalSummary({ action, draft, connection, urls }: ApprovalSummaryProps) {
  if (isStatusAction(action)) {
    return connection && <StatusSummary action={action} connection={connection} urls={urls} />;
  }
  if (draft === null) {
    return null;
  }
  if (action === 'publish') {
    return <PublishSummary draft={draft} />;
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
