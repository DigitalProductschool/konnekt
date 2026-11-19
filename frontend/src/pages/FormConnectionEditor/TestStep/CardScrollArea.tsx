import { CARD_SCROLL_CLASSES } from './constants';
import type { CardScrollAreaProps } from './types';

/**
 * A card's rows under its head, the data card's (`PersonaData`) or the result card's
 * (`ResultList`, or the note of a variant without rules): where the wizard pins its step header
 * and the cards sit side by side, each card scrolls its rows on its own, its head staying put
 * (spec 008 FR-043, as clarified on 2026-11-18; V5 frame 15 7599:57529). Elsewhere it is a plain
 * box, and the panel or the page scrolls (`CARD_SCROLL_CLASSES`).
 *
 * The area is a region named by its card's heading ("Mia’s data", "Result: meets the rules"), and
 * takes the keyboard focus so that its rows scroll with the arrow keys
 */
export default function CardScrollArea({ labelledBy, children }: CardScrollAreaProps) {
  return (
    // A scroll container without focusable content takes the focus itself (WCAG 2.1.1)
    <div role="region" aria-labelledby={labelledBy} tabIndex={0} className={CARD_SCROLL_CLASSES}>
      {children}
    </div>
  );
}
