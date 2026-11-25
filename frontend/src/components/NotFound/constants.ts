import { defineTexts } from '@konnekt/rules/language';

/**
 * The texts of "Page not found" (S22), as the card draws them in English (Figma "New visuals"
 * 7786:63039, bug new-visuals B5): the title, the sentence (the baseline's, 001-S0.4) and the
 * way back ("Go to connections", FR-049's footer link and the error state of a page,
 * design-notes §3)
 */
export const NOT_FOUND_COPY = defineTexts(
  {
    title: 'Page not found',
    text: 'The link may be broken, or the page may have been moved or deleted.',
    action: 'Go to connections',
  },
  {
    title: 'Seite nicht gefunden',
    text: 'Der Link ist möglicherweise fehlerhaft, oder die Seite wurde verschoben oder gelöscht.',
    action: 'Zu den Anbindungen',
  }
);
