import { failureHintOf } from '@connection-portal/rules/personas/messages';
import { useId } from 'react';

import { useLanguage } from '../../../hooks/useLanguage';
import { TEST_STEP_COPY } from './constants';
import type { GenerationFailedProps } from './types';

/**
 * The failure state (S8.9; FR-013; spec 008 S13, T074; Figma U74 frame 20 7062:51536, "Error"
 * 7062:51782), in place of the citizens row and the panel, at the top of the variant area and
 * centred across it (56px down: the panel's 16px and the message's 40px): "Couldn’t create sample
 * citizens" (title/small, 600 16/24), 8px below it the hint to try again or publish ("save" in the
 * edit flow: 004-S7.2) without testing (body/default, muted), and a small tertiary "Try again"
 * button with the autorenew icon, which generates all three anew (S8.8's loading state). Figma's
 * "Your rules are saved." isn't built (F7, 004-S8.9.3): nothing is stored before publishing. The
 * tabs, Back and "Publish" / "Save" stay usable (004-S8.9.4).
 *
 * The focus lands on "Try again" when the failure replaces the row (`TestStep`), and nothing is
 * announced by a live region, so the button is described by the title and the hint: a screen
 * reader says what failed when the focus arrives (quickstart V9)
 */
export default function GenerationFailed({ editing, onRetry }: GenerationFailedProps) {
  const { language } = useLanguage();
  const copy = TEST_STEP_COPY[language];
  const titleId = useId();
  const hintId = useId();
  return (
    <div className="flex flex-1 flex-col items-center gap-8 px-16 py-56 text-center">
      <h2
        id={titleId}
        className="text-kern-static-medium text-kern-layout-text-default leading-(--kern-typography-line-height-medium-static) font-semibold break-words"
      >
        {copy.failureTitle}
      </h2>
      <p
        id={hintId}
        className="text-kern-static-medium text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static) break-words"
      >
        {failureHintOf(editing, language)}
      </p>
      <button
        type="button"
        aria-describedby={`${titleId} ${hintId}`}
        className="kern-btn kern-btn--tertiary kern-btn--small"
        onClick={onRetry}
      >
        <span aria-hidden="true" className="kern-icon kern-icon--autorenew kern-icon--small" />
        <span className="kern-label">{copy.tryAgain}</span>
      </button>
    </div>
  );
}
