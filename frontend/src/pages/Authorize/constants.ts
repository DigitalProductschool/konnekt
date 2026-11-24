import { defineTexts } from '@konnekt/rules/language';

import type { ConsentState } from './types';

// The consent page's copy (spec 007 contracts/ui-screens.md S1; spec 008 S19, C1; G§2 "agent",
// "access level", "account"). The client's name is content (FR-007): it stays as registered
export const CONSENT_COPY = defineTexts(
  {
    pageTitle: 'Allow access',
    /** The heading before the client is known, or when the request isn't valid */
    fallbackTitle: 'Allow access',
    title: (clientName: string) => `Allow access for ${clientName}?`,
    intro: (clientName: string) =>
      `${clientName} wants to act on your behalf in Konnekt. Choose what it may do.`,
    levelLegend: 'Access level',
    stepUp: (clientName: string) => `${clientName} is asking for more access than it has.`,
    allow: 'Allow',
    deny: 'Deny',
    goBack: (clientName: string) => `You can go back to ${clientName}.`,
    signedInAs: (username: string) => `Signed in as ${username}.`,
    /** The footer line: `changeLater`, the link `userPage`, then `changeLaterEnd` */
    changeLater: 'You can change or revoke this access later on your',
    userPage: 'user page',
    changeLaterEnd: '.',
    loading: 'Loading the request…',
    invalidTitle: 'This sign-in request isn’t valid. Start again from your agent.',
    missing: (names: string[]) => `The request is missing ${names.join(', ')}.`,
    responseType: 'The request must ask for an authorization code (response_type=code).',
    loadErrorTitle: 'Couldn’t load this request',
    loadFailed: 'Check your connection and reload the page.',
    /** The alert's title when the decision couldn't be sent; its body is the server's answer */
    sendErrorTitle: 'Couldn’t send your answer',
    /** The alert's body without an answer from the server */
    sendFailed: 'Check your connection and try again.',
    /** The way back in the error states (design-notes §3 "Error state of a page") */
    backToList: 'Go to connections',
  },
  {
    pageTitle: 'Zugriff erlauben',
    fallbackTitle: 'Zugriff erlauben',
    title: (clientName: string) => `Zugriff für ${clientName} erlauben?`,
    intro: (clientName: string) =>
      `${clientName} möchte in Konnekt in Ihrem Namen handeln. Wählen Sie aus, was der Agent tun darf.`,
    levelLegend: 'Zugriffsstufe',
    stepUp: (clientName: string) => `${clientName} bittet um mehr Zugriff als bisher.`,
    allow: 'Erlauben',
    deny: 'Ablehnen',
    goBack: (clientName: string) => `Sie können zu ${clientName} zurückkehren.`,
    signedInAs: (username: string) => `Angemeldet als ${username}.`,
    // The verbs after the link, as German puts them last
    changeLater: 'Sie können diesen Zugriff später auf Ihrer',
    userPage: 'Kontoseite',
    changeLaterEnd: ' ändern oder widerrufen.',
    loading: 'Die Anfrage wird geladen …',
    invalidTitle:
      'Diese Anmeldeanfrage ist nicht gültig. Starten Sie sie erneut über Ihren Agenten.',
    missing: (names: string[]) =>
      `In der Anfrage ${names.length === 1 ? 'fehlt' : 'fehlen'} ${names.join(', ')}.`,
    responseType: 'Die Anfrage muss einen Autorisierungscode anfordern (response_type=code).',
    loadErrorTitle: 'Diese Anfrage konnte nicht geladen werden',
    loadFailed: 'Prüfen Sie Ihre Internetverbindung und laden Sie die Seite neu.',
    sendErrorTitle: 'Ihre Antwort konnte nicht gesendet werden',
    sendFailed: 'Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
    backToList: 'Zu den Anbindungen',
  }
);

/** The query parameters the request must carry; `scope` may be absent */
export const REQUIRED_PARAMETERS = [
  'response_type',
  'client_id',
  'redirect_uri',
  'code_challenge',
  'code_challenge_method',
  'state',
  'resource',
] as const;

export const INITIAL_CONSENT_STATE: ConsentState = { status: 'loading' };

/**
 * The consent card (kit P10, design-notes §3 "Card"): white, 1px `decorative-border`, radius 12,
 * no shadow, as the cards on the signed-in pages' white background; centred in the layout's
 * column at the kit's wide dialog width (600, P12), padding 24 (the kit's card), 40 from 640px
 * as the sign-in card; its parts 24 apart
 */
export const CONSENT_CARD_CLASSES =
  'rounded-kern-large bg-kern-layout-background-default mx-auto flex w-full max-w-600 flex-col gap-24 border border-(--kern-color-decorative-border-default) p-24 sm:p-40';

/** body/small (14/24), the footer line's and the step-up strip's text */
export const SMALL_TEXT =
  'text-kern-static-small leading-(--kern-typography-line-height-medium-static)';

/**
 * The row of an error alert's way back (design-notes §3 "Error state of a page"), in the alert's
 * body paragraph: 10px under the text (the kit's 8px after the body's 2px baseline padding)
 */
export const ALERT_ACTIONS_CLASSES = 'mt-10 flex flex-wrap items-center gap-x-24 gap-y-8';

/**
 * "Deny" and "Allow" as the kit's dialog actions (P33, `ConfirmDialog`): side by side in equal
 * columns while two fit (384px of the card's inner width), stacked full width in their order
 * below. A grid, not flex: the outlined button's border would make it wider in a flex row
 */
export const DECISION_ACTIONS_CLASSES =
  'flex flex-col gap-16 @min-[24rem]:grid @min-[24rem]:auto-cols-[minmax(0,1fr)] @min-[24rem]:grid-flow-col';
