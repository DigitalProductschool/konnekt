import { Link } from 'react-router';

import { ROUTES } from '../../constants';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import NotFound from '../NotFound';
import WizardLayout from '../WizardLayout';
import { LOAD_STATE_COPY, SKELETON_BARS, SKELETON_VALUE_WIDTHS } from './constants';
import LoadFailed from './LoadFailed';
import type { FormConnectionLoadStateProps, SkeletonRowProps } from './types';
import { documentTitleOf } from './utils';

/** One skeleton row (U74 7062:51214): the label's light bar, 90px, 24px, the value's strong bar */
function SkeletonRow({ value }: SkeletonRowProps) {
  return (
    <div className="flex items-start gap-24">
      <div className={`rounded-kern-small h-10 w-90 ${SKELETON_BARS.light}`} />
      <div className={`rounded-kern-small h-10 ${value} ${SKELETON_BARS.strong}`} />
    </div>
  );
}

/**
 * The loading skeleton (§3 "Skeleton", U06 #95: "Loading uses skeletons in the final layout"):
 * the kit's skeleton rows in a card, as U74 draws them (7062:51018, 7062:51211): a 14px heading
 * bar, then rows 28px apart. Screen readers hear the polite status instead of the bars.
 */
function LoadingSkeleton() {
  return (
    <div role="status" className="w-full">
      <span className="sr-only">{LOAD_STATE_COPY.loading}</span>
      <div
        aria-hidden="true"
        className="rounded-kern-default bg-kern-layout-background-default flex w-full flex-col gap-18 border border-(--kern-color-decorative-border-default) p-16"
      >
        <div className={`rounded-kern-small mb-24 h-14 w-110 ${SKELETON_BARS.strong}`} />
        {SKELETON_VALUE_WIDTHS.map((value, index) => (
          <SkeletonRow key={index} value={value} />
        ))}
      </div>
    </div>
  );
}

/**
 * A connection's screen while the connection isn't there: the loading skeleton, "E1 Page not
 * found" for an unknown or deleted one, or the failure alert with "Try again" (W2). It keeps the
 * wizard's frame without the header's title, badge and meta, so that the header doesn't jump
 * when the connection arrives. It sets the tab title itself, so that the loaded screen's own
 * title takes over.
 */
export default function FormConnectionLoadState({
  state,
  onRetry,
  notice,
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
      {state.status === 'loading' && <LoadingSkeleton />}
      {state.status === 'notFound' && <NotFound />}
      {state.status === 'failed' && <LoadFailed onRetry={onRetry} notice={notice} />}
    </WizardLayout>
  );
}
