import { KernAlert } from '@kern-ux-annex/kern-react-kit';
import { useEffect, useRef } from 'react';

import ErrorNoticeText from '../../components/ErrorNoticeText';
import ApprovalUrls from './ApprovalUrls';
import { OUTCOME_VARIANTS } from './constants';
import type { ApprovalOutcomeProps } from './types';

/**
 * The outcome alert (S3 "Outcome states"; design-notes §3 "Alert, page level"). A final state
 * replaces the actions under the title, in the slim title-only alert: "Published." or "Connection
 * reactivated." (success) with the connection URLs (the caller passes them only then), the other
 * actions' words, declined (info), expired, replaced, or cancelled with its reason (warning). A
 * failed call keeps the body and the actions, and shows the service's message with the error ID
 * in the danger alert's body (F22, FR-033: an alert with a body keeps it); "Try again" takes the
 * place of "Approve". The alert takes the focus when it appears and again for a new outcome or
 * failure, not when a switch of the language words it anew (spec 009: the focus stays on the
 * switch); `KernAlert` takes no ref, so the wrapper holds it.
 */
export default function ApprovalOutcome({
  view,
  urls,
  formConnectionId,
  deactivated = false,
}: ApprovalOutcomeProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  // What the alert stands for, without its words, which a switch changes. A new failure comes
  // after the old one went (a call that starts takes it away), so it mounts the alert anew
  const key =
    view.kind === 'final' ? `final ${view.outcome.status}` : `failed ${view.notice.error_id ?? ''}`;

  useEffect(() => {
    wrapperRef.current?.querySelector<HTMLElement>('.kern-alert')?.focus();
  }, [key]);

  return (
    <div ref={wrapperRef} className="flex w-full flex-col gap-24">
      {view.kind === 'final' ? (
        <KernAlert
          tabIndex={-1}
          variant={OUTCOME_VARIANTS[view.outcome.status]}
          title={view.outcome.text}
          className="w-full"
        />
      ) : (
        <KernAlert tabIndex={-1} variant="danger" title={view.title} className="w-full">
          <ErrorNoticeText notice={view.notice} />
        </KernAlert>
      )}
      {view.kind === 'final' && view.outcome.status === 'done' && urls && formConnectionId && (
        <ApprovalUrls urls={urls} formConnectionId={formConnectionId} deactivated={deactivated} />
      )}
    </div>
  );
}
