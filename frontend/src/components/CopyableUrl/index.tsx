import { useEffect, useRef, useState } from 'react';

import { ANNOUNCEMENTS, COPIED_RESET_MS, COPYABLE_URL_COPY } from './constants';
import type { CopyableUrlProps, CopyStatus } from './types';
import { copyToClipboard, selectText } from './utils';

/**
 * The "url row" of Figma "Publish/Link card": a read-only URL and a button that copies it
 * in one action. The result is announced; if copying fails, the URL is selected instead.
 */
export default function CopyableUrl({ url, describedBy }: CopyableUrlProps) {
  const [status, setStatus] = useState<CopyStatus>('idle');
  const urlRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status !== 'copied') {
      return;
    }
    // Back to idle, which also empties the status region for the next announcement
    const timer = window.setTimeout(() => setStatus('idle'), COPIED_RESET_MS);
    return () => window.clearTimeout(timer);
  }, [status]);

  async function handleCopy() {
    try {
      await copyToClipboard(url);
      setStatus('copied');
    } catch {
      if (urlRef.current) {
        selectText(urlRef.current);
      }
      setStatus('failed');
    }
  }

  const copied = status === 'copied';
  return (
    <div className="flex flex-col gap-16 sm:flex-row sm:items-center">
      <div
        ref={urlRef}
        className="rounded-kern-default text-kern-static-small text-kern-layout-text-default flex min-h-48 min-w-0 flex-1 items-center bg-(--kern-color-layout-layer-surface-contextual) px-16 py-8 leading-(--kern-typography-line-height-medium-static) break-all"
      >
        {url}
      </div>
      <button
        type="button"
        onClick={handleCopy}
        aria-describedby={describedBy}
        className="kern-btn kern-btn--primary shrink-0"
      >
        <span
          aria-hidden="true"
          className={`kern-icon ${copied ? 'kern-icon--check' : 'kern-icon--content-copy'}`}
        />
        <span className="kern-label">
          {copied ? COPYABLE_URL_COPY.copied : COPYABLE_URL_COPY.copy}
        </span>
      </button>
      <p role="status" className="kern-sr-only">
        {ANNOUNCEMENTS[status]}
      </p>
    </div>
  );
}
