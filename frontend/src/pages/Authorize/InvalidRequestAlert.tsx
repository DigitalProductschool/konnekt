import { KernAlert } from '@kern-ux-annex/kern-react-kit';
import { useEffect, useRef } from 'react';

import { CONSENT_COPY } from './constants';
import type { InvalidRequestAlertProps } from './types';

/**
 * A request the page can't use (a parameter missing, `400 invalid_request`, `404
 * invalid_client`): KERN's danger alert in place of the form, with the reason, and no redirect.
 * It refuses something, so it takes the focus when it appears and again for a new reason;
 * `KernAlert` takes no ref, so the wrapper holds it.
 */
export default function InvalidRequestAlert({ message }: InvalidRequestAlertProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    wrapperRef.current?.querySelector<HTMLElement>('.kern-alert')?.focus();
  }, [message]);

  return (
    <div ref={wrapperRef} className="w-full">
      <KernAlert
        tabIndex={-1}
        variant="danger"
        title={CONSENT_COPY.invalidTitle}
        className="w-full"
      >
        {message}
      </KernAlert>
    </div>
  );
}
