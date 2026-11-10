import { useId } from 'react';

import { useCopy } from '../../../hooks/useLanguage';
import { LINK_NOTICE_ID, RULES_STEP_COPY } from './constants';
import type { LinkNoticeProps } from './types';

/**
 * The notice of a link to what no longer exists (spec 007, contracts/ui-screens.md S5; FR-031),
 * at the top of the rules step: a KERN warning alert, "This link points to a variant that no
 * longer exists." while the first variant is shown in its place, or "This link points to a rule
 * or group that no longer exists." while the variant is shown, and "Dismiss". No frame draws it:
 * it is built from KERN's alert classes as the documents step's note (CatalogDroppedNote). It
 * isn't a live region: the page focuses it once the link is applied (`tabIndex={-1}`), which
 * announces its title, and it stays until it is dismissed.
 */
export default function LinkNotice({ kind, onDismiss }: LinkNoticeProps) {
  const copy = useCopy(RULES_STEP_COPY);
  const titleId = useId();
  return (
    <section
      id={LINK_NOTICE_ID}
      tabIndex={-1}
      aria-labelledby={titleId}
      className="kern-alert kern-alert--warning w-full"
    >
      <div className="kern-alert__header">
        <span aria-hidden="true" className="kern-icon kern-icon--warning kern-icon--small" />
        <span id={titleId} className="kern-title">
          {kind === 'variant' ? copy.missingVariant : copy.missingItem}
        </span>
      </div>
      <div className="kern-alert__body flex flex-col items-start">
        <button
          type="button"
          onClick={onDismiss}
          className="kern-btn kern-btn--secondary kern-btn--small"
        >
          <span className="kern-label">{copy.dismiss}</span>
        </button>
      </div>
    </section>
  );
}
