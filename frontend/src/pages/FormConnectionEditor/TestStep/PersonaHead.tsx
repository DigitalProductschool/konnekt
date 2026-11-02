import { dataHeadingOf } from '../../../utils/rules/personas/messages';
import { ELEMENT_IDS } from '../constants';
import { TEST_STEP_COPY } from './constants';
import type { PersonaHeadProps } from './types';

/**
 * The data card's head (S8.4; FR-004, FR-012; Figma "Head" 7057:58768, heading 7057:58769): "Mia’s
 * data" (title/small), then the persona's small tertiary buttons at its right end. "Edit data"
 * (pencil, 7057:58770) comes before "Generate again" with T043. "Generate again" (refresh,
 * 7057:58771) is absent while the persona is generated (FR-013). KERN's small button is 40px
 * high with 4px margins, Figma's 48px head
 */
export default function PersonaHead({ persona, onGenerateAgain }: PersonaHeadProps) {
  return (
    <div className="flex flex-wrap items-center justify-between">
      <h2
        id={ELEMENT_IDS.personaHeading(persona.id)}
        className="text-kern-static-medium text-kern-layout-text-default min-w-0 flex-1 leading-(--kern-typography-line-height-medium-static) font-semibold break-words"
      >
        {dataHeadingOf(persona)}
      </h2>
      {/* "Edit data" / "Done" go here (T043) */}
      {persona.status === 'ready' && (
        <button
          type="button"
          className="kern-btn kern-btn--tertiary kern-btn--small"
          onClick={onGenerateAgain}
        >
          <span aria-hidden="true" className="kern-icon kern-icon--autorenew kern-icon--small" />
          <span className="kern-label">{TEST_STEP_COPY.generateAgain}</span>
        </button>
      )}
    </div>
  );
}
