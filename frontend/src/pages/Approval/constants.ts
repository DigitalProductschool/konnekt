import type { ApprovalAction } from '@konnekt/api-types/approvals';
import { defineTexts } from '@konnekt/rules/language';

import type { ApprovalPageState, FinalStatus, StatusAction } from './types';

// The approval page's copy (specs/007-agent-mcp-server/contracts/ui-screens.md S3; spec 008
// S21); spec 009: the German from the glossary (G§2 "approval request", "approve/decline",
// "publish", "deactivate", "finding", "request"), the outcome sentences word for word as the
// server's (`services/approvals.py`, T018), since a `409 approval_<status>` shows the server's.
// The agent's name and the connection's name are content (FR-007)
export const APPROVAL_COPY = defineTexts(
  {
    /** The heading and tab title while the request isn't there */
    fallbackTitle: 'Approval request',
    subtitle: (requestedBy: string, time: string) =>
      `Requested by ${requestedBy} · expires at ${time}`,
    notYours: 'This request was made for another team member. Only they can approve it.',
    loadFailedTitle: 'Couldn’t load this request',
    loadFailed: 'Check your connection and reload the page.',

    // The body (S3 "Body")
    lastSaved: (date: string) => `Last saved ${date}`,
    goneForGood: 'Its content will be gone for good.',
    requestsCancelled: 'Requests in progress are cancelled.',
    cantBeUndone: 'Deleting can’t be undone.',
    // The start as part of what will happen (spec 010, copy.md §7; FR-065): `publish`,
    // `reactivate` and `set_start_date` with a date, or at once; an active connection that gets
    // a later date also says that its links stop until then
    activeFrom: (date: string) => `Active from ${date}`,
    goesLiveAtOnce: 'The connection goes live at once.',
    untilThen: 'Until then its links stop working, and requests in progress are cancelled.',
    checksTitle: 'Rule checks',
    checking: 'Checking the rules…',
    noFindings: 'No findings.',
    checksFailed: 'The rules couldn’t be checked.',

    // The actions (S3 "Actions")
    approve: 'Approve',
    decline: 'Decline',
    retry: 'Try again',
    publishing: 'Publishing…',
    working: 'Working…',

    // A call that failed and left the request waiting (S3 "failed")
    approveFailedTitle: (action: ApprovalAction): string =>
      action === 'publish'
        ? 'Couldn’t publish'
        : action === 'delete_draft'
          ? 'Couldn’t delete the draft'
          : 'Couldn’t approve',
    declineFailedTitle: 'Couldn’t decline',
    /** A failed attempt read again, whose message the request doesn't keep */
    failedBefore: 'The last attempt didn’t work. Nothing has changed.',
    callFailed: 'Nothing has changed. Check your connection and try again.',

    // The outcome states (S3 "Outcome states")
    openConnection: 'Open the connection',
    declined: 'You declined this request. Nothing has changed.',
    expired: (time: string) =>
      `This request expired at ${time}. Nothing has changed. The agent can ask again.`,
    replaced: 'The agent made a newer request for this action.',
    cancelled: 'This request was cancelled.',
    // A done `publish` and `reactivate` with a date (spec 010, copy.md §7), as the server's
    // `409 approval_done` words them; the other actions' are `DONE_TEXTS`
    publishedScheduled: (date: string) => `Published and scheduled for ${date}.`,
    reactivatedScheduled: (date: string) => `Connection scheduled for ${date}.`,
    // `connection_changed`, by the connection's state now and the action (spec 010, FR-066;
    // design-notes §4.2 T078/T079 (4)), as the server's `approvals._connection_change()`
    connectionDeactivated: 'The connection was deactivated in the meantime.',
    connectionReactivated: 'The connection was reactivated in the meantime.',
    connectionBecameActive: 'The connection became active in the meantime.',
    connectionStartDateChanged: 'The connection’s start date changed in the meantime.',
  },
  {
    fallbackTitle: 'Freigabeanfrage',
    subtitle: (requestedBy: string, time: string) =>
      `Angefordert von ${requestedBy} · läuft um ${time} Uhr ab`,
    notYours:
      'Diese Anfrage wurde für ein anderes Teammitglied gestellt. Nur dieses Teammitglied kann sie freigeben.',
    loadFailedTitle: 'Diese Anfrage konnte nicht geladen werden',
    loadFailed: 'Prüfen Sie Ihre Internetverbindung und laden Sie die Seite neu.',

    lastSaved: (date: string) => `Zuletzt gespeichert am ${date}`,
    goneForGood: 'Sein Inhalt wird endgültig gelöscht.',
    requestsCancelled: 'Laufende Anfragen werden abgebrochen.',
    cantBeUndone: 'Das Löschen kann nicht rückgängig gemacht werden.',
    activeFrom: (date: string) => `Aktiv ab ${date}`,
    goesLiveAtOnce: 'Die Anbindung wird sofort aktiv.',
    untilThen: 'Bis dahin funktionieren die Links nicht, und laufende Anfragen werden abgebrochen.',
    checksTitle: 'Regelprüfung',
    checking: 'Die Regeln werden geprüft …',
    noFindings: 'Keine Befunde.',
    checksFailed: 'Die Regeln konnten nicht geprüft werden.',

    approve: 'Freigeben',
    decline: 'Ablehnen',
    retry: 'Erneut versuchen',
    publishing: 'Wird veröffentlicht …',
    working: 'Wird ausgeführt …',

    approveFailedTitle: (action: ApprovalAction): string =>
      action === 'publish'
        ? 'Der Entwurf konnte nicht veröffentlicht werden'
        : action === 'delete_draft'
          ? 'Der Entwurf konnte nicht gelöscht werden'
          : 'Die Anfrage konnte nicht freigegeben werden',
    declineFailedTitle: 'Die Anfrage konnte nicht abgelehnt werden',
    failedBefore: 'Der letzte Versuch hat nicht funktioniert. Es wurde nichts geändert.',
    callFailed:
      'Es wurde nichts geändert. Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',

    openConnection: 'Anbindung öffnen',
    declined: 'Sie haben diese Anfrage abgelehnt. Es wurde nichts geändert.',
    expired: (time: string) =>
      `Diese Anfrage ist um ${time} Uhr abgelaufen. Es wurde nichts geändert. Der Agent kann erneut fragen.`,
    replaced: 'Der Agent hat für diese Aktion eine neuere Anfrage gestellt.',
    cancelled: 'Diese Anfrage wurde abgebrochen.',
    publishedScheduled: (date: string) => `Veröffentlicht und für den ${date} geplant.`,
    reactivatedScheduled: (date: string) => `Anbindung für den ${date} geplant.`,
    connectionDeactivated: 'Die Anbindung wurde in der Zwischenzeit deaktiviert.',
    connectionReactivated: 'Die Anbindung wurde in der Zwischenzeit reaktiviert.',
    connectionBecameActive: 'Die Anbindung ist in der Zwischenzeit aktiv geworden.',
    connectionStartDateChanged: 'Das Startdatum der Anbindung wurde in der Zwischenzeit geändert.',
  }
);

/**
 * The lead of the actions on a published connection (S3 "Body"): what becomes of the URLs. The
 * sentences under them are `statusLinesOf()`'s. `set_start_date` (spec 010) has none: its
 * sentences say what happens to the links
 */
export const STATUS_LEADS = defineTexts<Record<StatusAction, string | null>>(
  {
    deactivate:
      'These connection URLs will answer ‘unavailable’ until the connection is reactivated:',
    reactivate: 'These connection URLs will work again:',
    delete: 'These connection URLs will stop working for good:',
    set_start_date: null,
  },
  {
    // „unavailable“ is the answer's code serviceBW receives (`409 unavailable`), an identifier
    deactivate:
      'Diese URLs der Anbindung antworten mit „unavailable“, bis die Anbindung reaktiviert wird:',
    reactivate: 'Diese URLs der Anbindung funktionieren wieder:',
    delete: 'Diese URLs der Anbindung funktionieren endgültig nicht mehr:',
    set_start_date: null,
  }
);

/** The actions whose `done` shows the connection URLs and "Open the connection" */
export const DONE_WITH_URLS: readonly ApprovalAction[] = ['publish', 'reactivate'];

/** The title by action, with the connection's name or, once a deleted draft's row is gone, without */
export const TITLES = defineTexts<
  Record<ApprovalAction, { named: (name: string) => string; unnamed: string }>
>(
  {
    publish: { named: (name) => `Publish ‘${name}’?`, unnamed: 'Publish the draft?' },
    delete_draft: { named: (name) => `Delete the draft ‘${name}’?`, unnamed: 'Delete the draft?' },
    deactivate: { named: (name) => `Deactivate ‘${name}’?`, unnamed: 'Deactivate the connection?' },
    reactivate: { named: (name) => `Reactivate ‘${name}’?`, unnamed: 'Reactivate the connection?' },
    delete: { named: (name) => `Delete ‘${name}’?`, unnamed: 'Delete the connection?' },
    set_start_date: {
      named: (name) => `Change the start date of ‘${name}’?`,
      unnamed: 'Change the start date?',
    },
  },
  {
    publish: { named: (name) => `„${name}“ veröffentlichen?`, unnamed: 'Entwurf veröffentlichen?' },
    delete_draft: { named: (name) => `Entwurf „${name}“ löschen?`, unnamed: 'Entwurf löschen?' },
    deactivate: { named: (name) => `„${name}“ deaktivieren?`, unnamed: 'Anbindung deaktivieren?' },
    reactivate: { named: (name) => `„${name}“ reaktivieren?`, unnamed: 'Anbindung reaktivieren?' },
    delete: { named: (name) => `„${name}“ löschen?`, unnamed: 'Anbindung löschen?' },
    set_start_date: {
      named: (name) => `Startdatum von „${name}“ ändern?`,
      unnamed: 'Startdatum ändern?',
    },
  }
);

/** `done`: the success alert by action, as the approve answer's message words it */
export const DONE_TEXTS = defineTexts<Record<ApprovalAction, string>>(
  {
    publish: 'Published.',
    delete_draft: 'Draft deleted.',
    deactivate: 'Connection deactivated.',
    reactivate: 'Connection reactivated.',
    delete: 'Connection deleted.',
    set_start_date: 'Start date saved.',
  },
  {
    publish: 'Veröffentlicht.',
    delete_draft: 'Entwurf gelöscht.',
    deactivate: 'Anbindung deaktiviert.',
    reactivate: 'Anbindung reaktiviert.',
    delete: 'Anbindung gelöscht.',
    set_start_date: 'Startdatum gespeichert.',
  }
);

/**
 * `cancelled`, by `cancel_reason`; `connection_changed` takes its sentence from the connection's
 * state and the action (`connectionChangedTextOf()`)
 */
export const CANCELLED_TEXTS = defineTexts<Record<string, string>>(
  {
    draft_changed:
      'The draft has changed since the agent asked. Nothing has changed; the agent has to ask again.',
    draft_published: 'The draft has been published since the agent asked.',
    draft_deleted: 'The draft has been deleted since the agent asked.',
    connection_deleted: 'The connection has been deleted in the meantime.',
    access_changed: 'The agent’s access has changed, so this request was cancelled.',
    revoked: 'The agent’s access was revoked, so this request was cancelled.',
    access_ended: 'The agent’s access has ended, so this request was cancelled.',
    start_date_passed:
      'The start date is no longer after today. The agent can ask again with a new date.',
  },
  {
    draft_changed:
      'Der Entwurf wurde geändert, seit der Agent gefragt hat. Es wurde nichts geändert; der Agent muss erneut fragen.',
    draft_published: 'Der Entwurf wurde veröffentlicht, seit der Agent gefragt hat.',
    draft_deleted: 'Der Entwurf wurde gelöscht, seit der Agent gefragt hat.',
    connection_deleted: 'Die Anbindung wurde in der Zwischenzeit gelöscht.',
    access_changed:
      'Der Zugriff des Agenten wurde geändert, daher wurde diese Anfrage abgebrochen.',
    revoked: 'Der Zugriff des Agenten wurde widerrufen, daher wurde diese Anfrage abgebrochen.',
    access_ended: 'Der Zugriff des Agenten ist abgelaufen, daher wurde diese Anfrage abgebrochen.',
    start_date_passed:
      'Das Startdatum liegt nicht mehr nach dem heutigen Tag. Der Agent kann mit einem neuen Datum erneut fragen.',
  }
);

/** The statuses a request ends in, which a `409 approval_<status>` names */
export const FINAL_STATUSES: readonly FinalStatus[] = [
  'done',
  'declined',
  'expired',
  'replaced',
  'cancelled',
];

/** The outcome alert's style: success when done, info when declined, warning otherwise */
export const OUTCOME_VARIANTS: Record<FinalStatus, 'success' | 'info' | 'warning'> = {
  done: 'success',
  declined: 'info',
  expired: 'warning',
  replaced: 'warning',
  cancelled: 'warning',
};

export const INITIAL_APPROVAL_STATE: ApprovalPageState = { status: 'loading' };

/**
 * The page's cards, as the details' accordions draw them (U91 7246:51436; design-notes §3
 * "Card"): white, 1px `decorative-border`, radius 12, no shadow
 */
export const CARD_CLASSES =
  'rounded-kern-large bg-kern-layout-background-default border border-(--kern-color-decorative-border-default)';

/** A part's heading (`h2`), as the details' accordions head theirs: title/small, 16/24 600 */
export const SECTION_TITLE_CLASSES =
  'text-kern-static-medium text-kern-layout-text-default leading-(--kern-typography-line-height-medium-static) font-semibold break-words';

/** The body's sentences: body/default, 16/24 */
export const BODY_TEXT_CLASSES =
  'text-kern-static-medium text-kern-layout-text-default leading-(--kern-typography-line-height-medium-static) break-words';
