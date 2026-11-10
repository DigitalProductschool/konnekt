import { defineTexts } from '@connection-portal/rules/language';

/**
 * The texts of "Page not found" (S22). The design draws no not-found page, so the texts are the
 * baseline's (001-S0.4); the way back is the design's wording ("Go to connections", FR-049's
 * footer link and the error state of a page, design-notes §3)
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
