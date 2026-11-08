import { KernAlert } from '@kern-ux-annex/kern-react-kit';
import { useEffect, useRef } from 'react';

import ErrorNoticeText from '../../components/ErrorNoticeText';
import ApprovalUrls from './ApprovalUrls';
import { OUTCOME_VARIANTS } from './constants';
import type { ApprovalOutcomeProps } from './types';

/**
 * The outcome alert (S3 "Outcome states"). A final state replaces the actions under the title:
 * "Published." or "Connection reactivated." with the connection URLs (the caller passes them only
 * then), the other actions' words, declined, expired, replaced, or cancelled with its reason. A
 * failed call keeps the body and the actions, and shows the service's message with the error ID.
 * The alert takes the focus when it appears and again for a new text; `KernAlert` takes no ref,
 * so the wrapper holds it.
 */
export default function ApprovalOutcome({ view, urls, formConnectionId }: ApprovalOutcomeProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const key = view.kind === 'final' ? view.outcome.text : `${view.title} ${view.notice.message}`;

  useEffect(() => {
    wrapperRef.current?.querySelector<HTMLElement>('.kern-alert')?.focus();
  }, [key]);

  return (
    <div ref={wrapperRef} className="flex w-full flex-col gap-32">
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
        <ApprovalUrls urls={urls} formConnectionId={formConnectionId} />
      )}
    </div>
  );
}
