import { KernAlert } from '@kern-ux-annex/kern-react-kit';
import { useEffect, useRef } from 'react';

import ErrorNoticeText from '../../components/ErrorNoticeText';
import { DRAFT_COPY } from './constants';
import type { SaveDraftAlertProps } from './types';

/**
 * "Save and exit" failed (S1.5, W3; spec 002's F23 reversed: U28 6197:11098): a KERN danger
 * alert, "Couldn’t save your draft", with the server's message or U28's network text, and the
 * error ID on a line of its own (`ErrorNoticeText`). After a network failure or a `5xx`,
 * U28's "Try again" follows the message, 24px below it (Figma's `space-large` gap), as a small
 * secondary button that runs "Save and exit" again. Nothing renders without an error.
 *
 * The alert refuses something, so it takes the focus when it appears, and again after each new
 * failure (contracts/ui-screens.md "Accessibility"). `KernAlert` takes no ref, so the wrapper
 * holds it and the effect focuses the alert inside.
 */
export default function SaveDraftAlert({ error, retrying, onRetry }: SaveDraftAlertProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error) wrapperRef.current?.querySelector<HTMLElement>('.kern-alert')?.focus();
  }, [error]);

  if (!error) return null;

  return (
    <div ref={wrapperRef} className="w-full">
      <KernAlert
        tabIndex={-1}
        variant="danger"
        title={DRAFT_COPY.saveErrorTitle}
        className="w-full"
      >
        <ErrorNoticeText notice={error.notice} />
        {error.retryable && (
          <span className="mt-24 block">
            <button
              type="button"
              onClick={retrying ? undefined : onRetry}
              aria-disabled={retrying}
              className="kern-btn kern-btn--secondary kern-btn--small"
            >
              <span className="kern-label">{DRAFT_COPY.tryAgain}</span>
            </button>
          </span>
        )}
      </KernAlert>
    </div>
  );
}
