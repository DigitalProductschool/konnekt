import { KernAlert } from '@kern-ux-annex/kern-react-kit';
import { Link } from 'react-router';

import { ROUTES } from '../../constants';
import { useCopy } from '../../hooks/useLanguage';
import ErrorNoticeText from '../ErrorNoticeText';
import PageTitle from '../PageTitle';
import { LOAD_STATE_COPY } from './constants';
import type { LoadFailedProps } from './types';

/**
 * The connection couldn't be loaded (W2): the page's h1 says so, and KERN's danger alert under it
 * keeps its body (§3 "Alert, page level", F22): the reason with a 5xx answer's error ID, "Try
 * again" and the way back to the overview. The alert's body is a paragraph (`KernAlert`), so the
 * actions sit in a block span, 10px under the text: the kit's 8px gap after the body text's 2px
 * baseline padding (P07 `1:4102`).
 */
export default function LoadFailed({ onRetry, notice }: LoadFailedProps) {
  const copy = useCopy(LOAD_STATE_COPY);
  return (
    <>
      <PageTitle title={copy.errorTitle} />
      <KernAlert variant="danger" title={copy.errorText} className="w-full">
        {notice && <ErrorNoticeText notice={notice} />}
        <span className={`flex flex-wrap items-center gap-x-24 gap-y-8 ${notice ? 'mt-10' : ''}`}>
          <button
            type="button"
            onClick={onRetry}
            className="kern-btn kern-btn--secondary kern-btn--small"
          >
            <span className="kern-label">{copy.retry}</span>
          </button>
          <Link to={ROUTES.overview} className="kern-link">
            {copy.backToList}
          </Link>
        </span>
      </KernAlert>
    </>
  );
}
