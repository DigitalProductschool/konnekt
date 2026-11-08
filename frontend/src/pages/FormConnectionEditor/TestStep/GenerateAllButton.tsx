import { TEST_STEP_COPY } from './constants';
import type { GenerateAllButtonProps } from './types';

/**
 * "Generate all again" (S8.3; W9; FR-012): a small tertiary button with the refresh icon, styled
 * like the panel's "Generate again" (Figma 7057:58771), at the right end of the citizens row.
 * The question before it (S8.7) comes with T046. KERN's small button is 40px high with 4px
 * margins; the wrapper takes 2px of each back, so the row stays as high as the selected chip
 * (44px; Figma row 7057:58754, 60px), and the button's 48px touch area stays
 */
export default function GenerateAllButton({ onGenerateAll }: GenerateAllButtonProps) {
  return (
    <div className="-my-2 shrink-0">
      <button
        type="button"
        className="kern-btn kern-btn--tertiary kern-btn--small"
        onClick={onGenerateAll}
      >
        <span aria-hidden="true" className="kern-icon kern-icon--autorenew kern-icon--small" />
        <span className="kern-label">{TEST_STEP_COPY.generateAllAgain}</span>
      </button>
    </div>
  );
}
