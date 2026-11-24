import { dataHeadingOf } from '@konnekt/rules/personas/messages';

import { useLanguage } from '../../../hooks/useLanguage';
import { ELEMENT_IDS } from '../constants';
import { TEST_STEP_COPY } from './constants';
import type { PersonaHeadProps } from './types';

/**
 * The data card's head (S8.4; FR-004, FR-012; Figma "Head" 7057:58768, heading 7057:58769): "Mia’s
 * data" (title/small), then the persona's small tertiary buttons at its right end. "Edit data"
 * (pencil, 7057:58770) opens the edit-data dialog (spec 008 FR-042), which returns the focus to it
 * when it closes; it comes before "Generate again" (refresh, 7057:58771), which asks first only
 * when the persona was edited (U68). Both are absent while the persona is generated (FR-013).
 * KERN's small button is 40px high with 4px margins, Figma's 48px head.
 *
 * The heading keeps the width of its words (`flex-auto`, not `flex-1`): where the buttons don't
 * fit beside it, as in German in the 410px card ("Neue Daten erstellen"), they move together to
 * the line under it, at its start, as "Generate all again" does in the chips row, and the head
 * grows past 48 (bug german-copy-user-tests, test.md R1)
 */
export default function PersonaHead({ persona, onEditData, onGenerateAgain }: PersonaHeadProps) {
  const { language } = useLanguage();
  const copy = TEST_STEP_COPY[language];
  return (
    <div className="flex flex-wrap items-center justify-between">
      <h2
        id={ELEMENT_IDS.personaHeading(persona.id)}
        className="text-kern-static-medium text-kern-layout-text-default min-w-0 flex-auto leading-(--kern-typography-line-height-medium-static) font-semibold break-words"
      >
        {dataHeadingOf(persona, language)}
      </h2>
      {persona.status === 'ready' && (
        <div className="flex flex-wrap items-center">
          <button
            type="button"
            className="kern-btn kern-btn--tertiary kern-btn--small"
            onClick={(event) => {
              // Where a press doesn't focus a button (Safari), so that the dialog returns it there
              event.currentTarget.focus();
              onEditData();
            }}
          >
            <span aria-hidden="true" className="kern-icon kern-icon--small kern-icon--edit" />
            <span className="kern-label">{copy.editData}</span>
          </button>
          <button
            type="button"
            className="kern-btn kern-btn--tertiary kern-btn--small"
            onClick={onGenerateAgain}
          >
            <span aria-hidden="true" className="kern-icon kern-icon--autorenew kern-icon--small" />
            <span className="kern-label">{copy.generateAgain}</span>
          </button>
        </div>
      )}
    </div>
  );
}
