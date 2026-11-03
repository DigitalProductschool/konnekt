import { useId } from 'react';

import { failureHintOf } from '../../../utils/rules/personas/messages';
import { TEST_STEP_COPY } from './constants';
import type { GenerationFailedProps } from './types';

/**
 * The failure state (S8.9; FR-013; Figma U12 7062:51782), in place of the applicants row and the
 * panel, centred in the variant area: "Couldn’t create sample applicants", the hint to try again
 * or publish ("save" when editing) without testing, and a small tertiary "Try again" button with
 * the autorenew icon, which generates all three anew (S8.8's loading state). Figma's "Your rules
 * are saved." isn't built (F7): nothing is stored before publishing.
 *
 * The focus lands on "Try again" when the failure replaces the row (`TestStep`), and nothing is
 * announced by a live region, so the button is described by the title and the hint: a screen
 * reader says what failed when the focus arrives (quickstart V9)
 */
export default function GenerationFailed({ editing, onRetry }: GenerationFailedProps) {
  const titleId = useId();
  const hintId = useId();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-16 py-40 text-center">
      <h2
        id={titleId}
        className="text-kern-static-medium text-kern-layout-text-default font-semibold"
      >
        {TEST_STEP_COPY.failureTitle}
      </h2>
      <p id={hintId} className="text-kern-static-medium text-kern-layout-text-muted">
        {failureHintOf(editing)}
      </p>
      <button
        type="button"
        aria-describedby={`${titleId} ${hintId}`}
        className="kern-btn kern-btn--tertiary kern-btn--small"
        onClick={onRetry}
      >
        <span aria-hidden="true" className="kern-icon kern-icon--autorenew kern-icon--small" />
        <span className="kern-label">{TEST_STEP_COPY.tryAgain}</span>
      </button>
    </div>
  );
}
