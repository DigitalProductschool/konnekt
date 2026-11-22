import { useEffect } from 'react';

import { APP_NAME } from '../constants';

/**
 * Show "<page> · <app name>" as the browser tab's title while the page is open. A page that
 * stays on screen while another takes over (the sign-in page while it leaves, bug
 * login-welcome-motion) passes null and leaves the title to the new one.
 */
export function useDocumentTitle(page: string | null): void {
  useEffect(() => {
    if (page !== null) {
      document.title = `${page} · ${APP_NAME}`;
    }
  }, [page]);
}
