import { Link } from 'react-router';

import PageTitle from '../../components/PageTitle';
import { ROUTES } from '../../constants';
import { DETAIL_COPY } from './constants';
import type { DetailFailedProps } from './types';

/** The connection couldn't be loaded: the page title says so, with a retry. */
export default function DetailFailed({ onRetry }: DetailFailedProps) {
  return (
    <>
      <PageTitle title={DETAIL_COPY.errorTitle} hint={DETAIL_COPY.errorText} />
      <div className="flex flex-wrap gap-16">
        <button type="button" onClick={onRetry} className="kern-btn kern-btn--primary">
          <span className="kern-label">{DETAIL_COPY.retry}</span>
        </button>
        <Link to={ROUTES.overview} className="kern-btn kern-btn--secondary">
          <span className="kern-label">{DETAIL_COPY.backToList}</span>
        </Link>
      </div>
    </>
  );
}
