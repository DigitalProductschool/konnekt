import { useEffect } from 'react';

import { APP_NAME } from '../constants';

/** Show "<page> – <app name>" as the browser tab's title while the page is open. */
export function useDocumentTitle(page: string): void {
  useEffect(() => {
    document.title = `${page} – ${APP_NAME}`;
  }, [page]);
}
