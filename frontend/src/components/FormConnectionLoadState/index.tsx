import { Link } from 'react-router';

import { ROUTES } from '../../constants';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import FeedbackLoader from '../FeedbackLoader';
import NotFound from '../NotFound';
import WizardLayout from '../WizardLayout';
import { LOAD_STATE_COPY } from './constants';
import LoadFailed from './LoadFailed';
import type { FormConnectionLoadStateProps } from './types';
import { documentTitleOf } from './utils';

/**
 * A connection's screen while the connection isn't there: loading, "E1 Page not found" for an
 * unknown or deleted one, or a title with "Try again". It keeps the wizard's frame without the
 * header's title, badge and meta, so that the header doesn't jump when the connection arrives.
 * It sets the tab title itself, so that the loaded screen's own title takes over.
 */
export default function FormConnectionLoadState({
  state,
  onRetry,
  footer,
}: FormConnectionLoadStateProps) {
  useDocumentTitle(documentTitleOf(state));
  return (
    <WizardLayout
      footer={
        footer ?? (
          <Link to={ROUTES.overview} className="kern-btn kern-btn--tertiary">
            <span aria-hidden="true" className="kern-icon kern-icon--home" />
            <span className="kern-label">{LOAD_STATE_COPY.home}</span>
          </Link>
        )
      }
    >
      {state.status === 'loading' && (
        <div className="flex flex-1 flex-col items-center justify-center">
          <FeedbackLoader label={LOAD_STATE_COPY.loading} />
        </div>
      )}
      {state.status === 'notFound' && <NotFound />}
      {state.status === 'failed' && <LoadFailed onRetry={onRetry} />}
    </WizardLayout>
  );
}
