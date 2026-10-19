import { KernAlert } from '@kern-ux-annex/kern-react-kit';

import ErrorNoticeText from '../../components/ErrorNoticeText';
import { DETAIL_COPY } from './constants';
import type { ConnectionStatusProps } from './types';

/**
 * The connection's status and what changes it (FR-006), which the design has no frame for:
 * deactivating or reactivating, and deleting. One button deactivates and reactivates, so that
 * the focus stays on it, or comes back to it from the dialog, when its label changes.
 */
export default function ConnectionStatus({
  isActive,
  activating,
  error,
  onToggle,
  onDelete,
}: ConnectionStatusProps) {
  return (
    <section
      aria-labelledby="status-title"
      className="rounded-kern-large border-kern-neutral-100 bg-kern-layout-background-default border"
    >
      <div className="border-kern-neutral-100 flex flex-col gap-2 border-b px-24 pt-24 pb-20">
        <h2
          id="status-title"
          className="text-kern-adaptive-medium text-kern-layout-text-default font-semibold"
        >
          {DETAIL_COPY.statusTitle}
        </h2>
        <p className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)">
          {isActive ? DETAIL_COPY.statusLive : DETAIL_COPY.statusDeactivated}
        </p>
      </div>
      <div className="flex flex-col items-start gap-16 p-24">
        {error && (
          <KernAlert variant="danger" title={DETAIL_COPY.activateError} className="w-full">
            <ErrorNoticeText notice={error} />
          </KernAlert>
        )}
        <div className="flex flex-wrap gap-16">
          <button
            type="button"
            onClick={activating ? undefined : onToggle}
            aria-disabled={activating}
            className={`kern-btn ${isActive ? 'kern-btn--secondary' : 'kern-btn--primary'}`}
          >
            <span className="kern-label">
              {isActive ? DETAIL_COPY.deactivate : DETAIL_COPY.reactivate}
            </span>
          </button>
          <button type="button" onClick={onDelete} className="kern-btn kern-btn--tertiary">
            <span aria-hidden="true" className="kern-icon kern-icon--delete" />
            <span className="kern-label">{DETAIL_COPY.delete}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
