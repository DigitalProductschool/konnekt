import { useEffect, useId, useRef, useState } from 'react';

import { copyToClipboard } from '../../components/CopyableUrl/utils';
import { ACCOUNT_COPY, COPIED_RESET_MS, COPY_ANNOUNCEMENTS } from './constants';
import type { CopyStatus, TokenCopyFieldProps } from './types';

/**
 * The new token in a read-only input and a "Copy" button, as `CopyableUrl` copies a link: the
 * result is announced, and if copying fails, the token is selected so it can be copied by hand
 */
export default function TokenCopyField({ token, describedBy }: TokenCopyFieldProps) {
  const [status, setStatus] = useState<CopyStatus>('idle');
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

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
      await copyToClipboard(token);
      setStatus('copied');
    } catch {
      inputRef.current?.select();
      setStatus('failed');
    }
  }

  const copied = status === 'copied';
  return (
    <div className="kern-form-input w-full">
      <label htmlFor={id} className="kern-label">
        {ACCOUNT_COPY.tokenLabel}
      </label>
      <div className="flex flex-col gap-16 sm:flex-row sm:items-center">
        <input
          ref={inputRef}
          id={id}
          type="text"
          readOnly
          value={token}
          spellCheck={false}
          autoComplete="off"
          aria-describedby={describedBy}
          onFocus={(event) => event.target.select()}
          className="kern-form-input__input min-w-0 flex-1 font-mono"
        />
        <button type="button" onClick={handleCopy} className="kern-btn kern-btn--primary shrink-0">
          <span
            aria-hidden="true"
            className={`kern-icon ${copied ? 'kern-icon--check' : 'kern-icon--content-copy'}`}
          />
          <span className="kern-label">{copied ? ACCOUNT_COPY.copied : ACCOUNT_COPY.copy}</span>
        </button>
      </div>
      <p role="status" className="kern-sr-only">
        {COPY_ANNOUNCEMENTS[status]}
      </p>
    </div>
  );
}
