import { TEST_STEP_COPY } from './constants';
import type { GenerateAllButtonProps } from './types';

/**
 * "Generate all" (S8.3; W9; FR-012; spec 008 F45, cosmetic 12; Figma U65 7344:96178): a small
 * tertiary button with the refresh icon, styled like the panel's "Generate again" (7057:58771),
 * at the right end of the citizens row, in every results state. It asks first only while a
 * persona has changes (S8.7, `RegenerateDialog`). KERN's small button is 40px high with 4px
 * margins, Figma's 48px "Generate all", which sets the row's height (7057:58754: 16px above, 48px,
 * so 64px; the 44px selected chip centred in it)
 */
export default function GenerateAllButton({ onGenerateAll }: GenerateAllButtonProps) {
  return (
    <button
      type="button"
      className="kern-btn kern-btn--tertiary kern-btn--small shrink-0"
      onClick={onGenerateAll}
    >
      <span aria-hidden="true" className="kern-icon kern-icon--autorenew kern-icon--small" />
      <span className="kern-label">{TEST_STEP_COPY.generateAll}</span>
    </button>
  );
}
