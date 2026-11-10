import { defineTexts } from '@connection-portal/rules/language';

/**
 * A connection's screen while the connection isn't there: the loading status, the failure's
 * title and alert, its actions and the link home; the loading and failure texts are the tab
 * titles too (G§2 "loading", "try again")
 */
export const LOAD_STATE_COPY = defineTexts(
  {
    loading: 'Loading the connection…',
    errorTitle: 'Couldn’t load the connection',
    errorText: 'Check your connection and try again.',
    retry: 'Try again',
    backToList: 'Go to connections',
    home: 'Home',
  },
  {
    loading: 'Die Anbindung wird geladen …',
    errorTitle: 'Die Anbindung konnte nicht geladen werden',
    errorText: 'Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
    retry: 'Erneut versuchen',
    backToList: 'Zu den Anbindungen',
    home: 'Startseite',
  }
);

/**
 * The skeleton's two greys (U74 7062:51211; no variables in Figma): strong bars for headings and
 * values (`#e4e8ef`) and light ones for labels (`#eff1f5`)
 */
export const SKELETON_BARS = {
  strong: 'bg-[#e4e8ef]',
  light: 'bg-[#eff1f5]',
} as const;

/**
 * The skeleton rows' value bars (U74 "Skeleton · data" 7062:51214, 7062:51217, 7062:51220,
 * 7062:51223): each row a 90px light label bar, 24px, then a strong value bar of this width
 */
export const SKELETON_VALUE_WIDTHS = ['w-96', 'w-70', 'w-130', 'w-140'] as const;
