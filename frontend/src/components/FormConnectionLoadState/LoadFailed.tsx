import { Link } from 'react-router';

import { ROUTES } from '../../constants';
import PageTitle from '../PageTitle';
import { LOAD_STATE_COPY } from './constants';
import type { LoadFailedProps } from './types';

/** The connection couldn't be loaded: the page title says so, with a retry. */
export default function LoadFailed({ onRetry }: LoadFailedProps) {
  return (
    <>
      <PageTitle title={LOAD_STATE_COPY.errorTitle} hint={LOAD_STATE_COPY.errorText} />
      <div className="flex flex-wrap gap-16">
        <button type="button" onClick={onRetry} className="kern-btn kern-btn--primary">
          <span className="kern-label">{LOAD_STATE_COPY.retry}</span>
        </button>
        <Link to={ROUTES.overview} className="kern-btn kern-btn--secondary">
          <span className="kern-label">{LOAD_STATE_COPY.backToList}</span>
        </Link>
      </div>
    </>
  );
}
