import { useCopy } from '../../hooks/useLanguage';
import ApprovalLinkCards from './ApprovalLinkCards';
import { BODY_TEXT_CLASSES, STATUS_BODIES } from './constants';
import DescriptionLine from './DescriptionLine';
import type { StatusSummaryProps } from './types';

/**
 * The body of `deactivate`, `reactivate` and `delete` (S3 "Body"): the description line, then the
 * details' Links card (`ApprovalLinkCards`) whose lead says what becomes of the connection URLs,
 * and under it, where it applies, that requests in progress are cancelled and that deleting can't
 * be undone. A deactivated connection's copy buttons are off, as on its details (T028, W21).
 */
export default function StatusSummary({ action, connection, urls }: StatusSummaryProps) {
  const body = useCopy(STATUS_BODIES)[action];
  return (
    <div className="flex flex-col gap-24">
      {connection.description && <DescriptionLine description={connection.description} />}
      <ApprovalLinkCards urls={urls} lead={body.lead} deactivated={!connection.is_active} />
      {(body.cancelsRequests || body.final) && (
        <div className="flex flex-col gap-8">
          {body.cancelsRequests && <p className={BODY_TEXT_CLASSES}>{body.cancelsRequests}</p>}
          {body.final && <p className={`${BODY_TEXT_CLASSES} font-semibold`}>{body.final}</p>}
        </div>
      )}
    </div>
  );
}
