import { defineTexts } from '@connection-portal/rules/language';

import calendarPencilIcon from '../../assets/icons/calendar-pencil.svg';
import doneWhiteIcon from '../../assets/icons/done-white.svg';
import editWhiteSmallIcon from '../../assets/icons/edit-white-small.svg';
import linkOffIcon from '../../assets/icons/link-off.svg';
import linkOffWhiteIcon from '../../assets/icons/link-off-white.svg';
import publishedArt from '../../assets/illustrations/published-art@2x.png';
import publishedArtGrey from '../../assets/illustrations/published-art-grey@2x.png';
import type { ActionsState, DraftDeleteState, StatusBandTone, StatusBandToneLook } from './types';

// S15–S17, the details, the draft's details and their confirmations (spec 008); spec 009: the
// German from the glossary (G§2 "details", "connection", "active/deactivated/deactivate/
// reactivate", "link", "result link", "request link", "your service", "summary", "delete")
export const CONNECTION_DETAIL_COPY = defineTexts(
  {
    // Figma "Shell/Footer" on the details (U80 6424:34839) and the draft's (U93 7362:54919; FR-049)
    editConnection: 'Edit connection',
    goToConnections: 'Go to connections',
    // The status band (U80 7355:61145, U81 7355:61817; U07 #6)
    activeTitle: 'Your connection is active',
    activeText: 'Citizens can now share their data with you. Add the links below to your service.',
    // The deactivated band (U89 7355:61540, 7355:61541, 7355:61549; U96, U97 the same)
    deactivatedTitle: 'Connection deactivated',
    deactivatedText: 'Citizens can’t start a new request. Your settings are saved.',
    // The scheduled band (U94 7355:60687, 7355:60688; S15, FR-006)
    scheduledTitle: 'Your connection is scheduled',
    scheduledText:
      'The links are ready to be added to your service. They become active on the scheduled date below.',
    // The date pill's lines (FR-015, data-model §1.4; U80 7355:61158, U94 7355:60692, U89
    // 7355:61546); a draft's is `edited`
    activeSince: (dateTime: string) => `Active since ${dateTime}`,
    activeFrom: (dateTime: string) => `Active from ${dateTime}`,
    deactivatedSince: (dateTime: string) => `Deactivated since ${dateTime}`,
    activateAgain: 'Activate again',
    // The ⋯ on the date pill (U80 7355:61160, "More · connection actions"; FR-016)
    connectionActions: 'Connection actions',
    // The Links accordion (U91 7246:51437; FR-052f: "1 request link · 3 result links")
    linksTitle: 'Links for your service',
    // Only the approval page's lead now (S21, ApprovalUrls; T088 rebuilds it)
    linksLead: 'Add both links to your form. Each one goes in its own field.',
    linksCounts: (resultLinks: number) =>
      `1 request link · ${resultLinks} ${resultLinks === 1 ? 'result link' : 'result links'}`,
    viewLinks: 'View links',
    hideLinks: 'Hide links',
    requestLink: 'Request link',
    requestLinkInfoLabel: 'About the request link',
    // U80 6809:46501 (the frame's hidden text 6809:46453)
    requestLinkInfo:
      'This link is used by your service to generate a QR code for citizens to share their data using the EUDI Wallet. There’s one link for all variants.',
    resultLink: 'Result link',
    resultLinkInfoLabel: 'About the result link',
    // U81 6809:46590 (Clarification #49)
    resultLinkInfo:
      'Your service gets the citizen’s shared data from this link. Each variant has its own.',
    // The Summary accordion (U82 6396:48191; FR-046 (i)): "2 documents · 9 data items · 3 variants ·
    // 4 rules", its Documents and Rules parts headed in action blue (U03 #28)
    summaryTitle: 'Summary',
    summaryCounts: (documents: number, dataItems: number, rulesCounts: string) =>
      `${documents} ${documents === 1 ? 'document' : 'documents'} · ${dataItems} ${dataItems === 1 ? 'data item' : 'data items'} · ${rulesCounts}`,
    viewSummary: 'View summary',
    hideSummary: 'Hide summary',
    documentsTitle: 'Documents',
    // A document's count, "7 data items" (U82 6396:48204)
    items: (count: number) => `${count} ${count === 1 ? 'data item' : 'data items'}`,
    rulesTitle: 'Rules',
    // The rules part of the counts, e.g. "3 variants · 4 rules" (B8)
    rulesCounts: (variants: number, rules: number) =>
      `${variants} ${variants === 1 ? 'variant' : 'variants'} · ${rules} ${rules === 1 ? 'rule' : 'rules'}`,
    // The variant tabs' list, as on the rules and test steps
    variants: 'Variants',
    // Proposed, after the Rules step's empty state (design-notes.md §2)
    noRules: 'No rules. Anyone who shares the requested documents can apply.',
    loadingRules: 'Loading the rules…',
    rulesErrorTitle: 'Couldn’t load the rules',
    rulesErrorText: 'Check your connection and try again.',
    // The ⋯ menu's entries (U88 6417:31045; S15, FR-008, FR-009)
    changeStartDate: 'Change start date',
    deactivate: 'Deactivate',
    delete: 'Delete connection',
    // The confirmations (S17). Deactivating (U88 6417:31206): the design's title and buttons, F13's
    // body (the backend cancels the requests in progress); "Deactivate" is the blue primary button
    deactivateTitle: 'Deactivate this connection?',
    deactivateText:
      'The connection will be deactivated and its links will stop working at once. Requests in progress are cancelled. Remember to remove the wallet connection from your service.',
    keepActive: 'Keep active',
    deactivating: 'Deactivating…',
    // Deactivating a scheduled connection (spec 010, S17; FR-012, W5): copy.md §2's sentence and
    // cancel button; the title, "Deactivate" and the toast stay (F13)
    deactivateScheduledText: (date: string) =>
      `This connection will be active from ${date}. If you deactivate it, it won’t become active and its links won’t work. You can activate it again later.`,
    keepScheduled: 'Keep scheduled',
    // Reactivating (U89 7173:52959): the documents and rules summary (FR-051 (40)), then "Active
    // from" (spec 010, S17; FR-011, W4). "Activating…" isn't drawn (FR-008). With "On a date"
    // copy.md §2's hint, "Schedule" (the publish dialog's), "Scheduling…" and the toast
    activateTitle: 'Activate this connection again?',
    activateText:
      'Check the summary below. Once it’s active, citizens can share their data again, so make sure your service is ready to receive it.',
    activate: 'Activate',
    activating: 'Activating…',
    activateDateHint:
      'The connection becomes active again on the date you choose. Until then, its links don’t work.',
    schedule: 'Schedule',
    scheduling: 'Scheduling…',
    scheduledFor: (date: string) => `Connection scheduled for ${date}.`,
    // A failed reactivation when no answer came (FR-014, W8), as "Change start date"'s sentence
    activateNoAnswer:
      'Couldn’t reactivate, so nothing has changed. Check your internet connection and try again.',
    cancel: 'Cancel',
    // Deleting takes the overview's dialog (`DELETE_DIALOG_COPY`: U14 6699:44480, U90 6417:31599)
    retry: 'Try again',
    deactivateError: 'Couldn’t deactivate',
    activateError: 'Couldn’t reactivate',
    deleteError: 'Couldn’t delete',
    actionErrorText: 'Nothing changed. Check your connection and try again.',
    // Success toasts after an action (FR-051 (42); U89 6417:31447 without its Undo, F54), and after
    // saving an edit
    deactivated: 'Connection deactivated.',
    activated: 'Connection reactivated.',
    // U99 6730:39732 #19, FR-051 (42)
    saved: 'Changes saved.',
    // "Change start date" (S15; U87 6396:48860; FR-008, FR-009): the frame's title (`changeStartDate`),
    // text and buttons; "Now (active since <date>, <time>)" for an active connection; the hint
    // with "On a date" for an active one F10's (copy.md §2); the busy label the publish dialog's
    // "Saving…"; the failure's title and the no-answer sentence copy.md §2's (FR-014, W8); the
    // toast the spec's (FR-008, W3)
    startDateText: 'Choose when citizens can use this connection.',
    nowActiveSince: (dateTime: string) => `Now (active since ${dateTime})`,
    startDateHint:
      'Until that date, citizens can’t start a new request. Requests in progress are cancelled.',
    saveDate: 'Save date',
    savingDate: 'Saving…',
    startDateError: 'Couldn’t save the start date',
    startDateNoAnswer:
      'Couldn’t save the start date, so nothing has changed. Check your internet connection and try again.',
    startDateSaved: 'Start date saved.',
    // A draft's details (S16; U93 7362:54691): the tab title "<name> (Draft) · Konnekt", the draft
    // band (7362:54697) with its date pill (7362:54709), and the Links card without links
    // (7362:54905)
    draftTabTitle: (name: string) => `${name} (Draft)`,
    draftTitle: 'This connection is a draft',
    draftText:
      'The links can’t be added to your services yet. They become active when this connection is published.',
    edited: (date: string) => `Edited ${date}`,
    draftLinksText: 'Created when the connection is published and active.',
    // A draft's empty parts in the Summary (spec 005: S6, W8), which U93 doesn't draw
    noDocumentsYet: 'No documents yet',
    noDataYet: 'No data chosen yet',
    // Visible on the draft's details (F56; spec 005, S6), without a frame; it opens the overview's
    // delete dialog with the draft's body (`DELETE_DIALOG_COPY`, F55)
    deleteDraft: 'Delete draft',
    // The delete confirmation's errors (S6): published or deleted meanwhile
    draftPublishedSince: 'This draft has been published since you opened it.',
    openConnection: 'Open the connection',
    draftAlreadyDeleted: 'This draft has already been deleted.',
    toOverview: 'Go to overview',
  },
  {
    editConnection: 'Anbindung bearbeiten',
    goToConnections: 'Zu den Anbindungen',
    activeTitle: 'Ihre Anbindung ist aktiv',
    activeText:
      'Bürgerinnen und Bürger können ihre Daten jetzt mit Ihnen teilen. Fügen Sie die Links unten in Ihren Dienst ein.',
    deactivatedTitle: 'Anbindung deaktiviert',
    deactivatedText:
      'Bürgerinnen und Bürger können keine neue Anfrage starten. Ihre Einstellungen sind gespeichert.',
    scheduledTitle: 'Ihre Anbindung ist geplant',
    scheduledText:
      'Die Links können bereits in Ihren Dienst eingefügt werden. Sie werden am geplanten Datum unten aktiv.',
    activeSince: (dateTime: string) => `Aktiv seit ${dateTime}`,
    activeFrom: (dateTime: string) => `Aktiv ab ${dateTime}`,
    deactivatedSince: (dateTime: string) => `Deaktiviert seit ${dateTime}`,
    activateAgain: 'Wieder aktivieren',
    connectionActions: 'Aktionen für die Anbindung',
    linksTitle: 'Links für Ihren Dienst',
    linksLead: 'Fügen Sie beide Links in Ihr Formular ein. Jeder Link gehört in ein eigenes Feld.',
    linksCounts: (resultLinks: number) =>
      `1 Anfragelink · ${resultLinks} ${resultLinks === 1 ? 'Ergebnislink' : 'Ergebnislinks'}`,
    viewLinks: 'Links ansehen',
    hideLinks: 'Links ausblenden',
    requestLink: 'Anfragelink',
    requestLinkInfoLabel: 'Informationen zum Anfragelink',
    requestLinkInfo:
      'Ihr Dienst erzeugt mit diesem Link einen QR-Code, mit dem Bürgerinnen und Bürger ihre Daten über die EUDI-Wallet teilen. Es gibt einen Link für alle Varianten.',
    resultLink: 'Ergebnislink',
    resultLinkInfoLabel: 'Informationen zum Ergebnislink',
    resultLinkInfo:
      'Über diesen Link erhält Ihr Dienst die geteilten Daten der antragstellenden Person. Jede Variante hat einen eigenen.',
    summaryTitle: 'Zusammenfassung',
    summaryCounts: (documents: number, dataItems: number, rulesCounts: string) =>
      `${documents} ${documents === 1 ? 'Dokument' : 'Dokumente'} · ${dataItems} ${dataItems === 1 ? 'Feld' : 'Felder'} · ${rulesCounts}`,
    viewSummary: 'Zusammenfassung ansehen',
    hideSummary: 'Zusammenfassung ausblenden',
    documentsTitle: 'Dokumente',
    items: (count: number) => `${count} ${count === 1 ? 'Feld' : 'Felder'}`,
    rulesTitle: 'Regeln',
    rulesCounts: (variants: number, rules: number) =>
      `${variants} ${variants === 1 ? 'Variante' : 'Varianten'} · ${rules} ${rules === 1 ? 'Regel' : 'Regeln'}`,
    variants: 'Varianten',
    noRules:
      'Keine Regeln. Alle, die die angeforderten Dokumente teilen, können einen Antrag stellen.',
    loadingRules: 'Die Regeln werden geladen …',
    rulesErrorTitle: 'Die Regeln konnten nicht geladen werden',
    rulesErrorText: 'Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
    changeStartDate: 'Startdatum ändern',
    deactivate: 'Deaktivieren',
    delete: 'Anbindung löschen',
    deactivateTitle: 'Diese Anbindung deaktivieren?',
    deactivateText:
      'Die Anbindung wird deaktiviert, und ihre Links funktionieren sofort nicht mehr. Laufende Anfragen werden abgebrochen. Denken Sie daran, die Wallet-Anbindung aus Ihrem Dienst zu entfernen.',
    keepActive: 'Aktiv lassen',
    deactivating: 'Wird deaktiviert …',
    deactivateScheduledText: (date: string) =>
      `Diese Anbindung ist ab ${date} aktiv. Wenn Sie sie deaktivieren, wird sie nicht aktiv und ihre Links funktionieren nicht. Sie können sie später wieder aktivieren.`,
    keepScheduled: 'Geplant lassen',
    activateTitle: 'Diese Anbindung wieder aktivieren?',
    activateText:
      'Prüfen Sie die Zusammenfassung unten. Sobald die Anbindung aktiv ist, können Bürgerinnen und Bürger ihre Daten wieder teilen. Stellen Sie daher sicher, dass Ihr Dienst bereit ist, sie zu empfangen.',
    activate: 'Aktivieren',
    activating: 'Wird aktiviert …',
    activateDateHint:
      'Die Anbindung wird am gewählten Datum wieder aktiv. Bis dahin funktionieren ihre Links nicht.',
    schedule: 'Planen',
    scheduling: 'Wird geplant …',
    scheduledFor: (date: string) => `Anbindung für den ${date} geplant.`,
    activateNoAnswer:
      'Die Anbindung konnte nicht reaktiviert werden, daher hat sich nichts geändert. Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
    cancel: 'Abbrechen',
    retry: 'Erneut versuchen',
    deactivateError: 'Die Anbindung konnte nicht deaktiviert werden',
    activateError: 'Die Anbindung konnte nicht reaktiviert werden',
    deleteError: 'Die Anbindung konnte nicht gelöscht werden',
    actionErrorText:
      'Es wurde nichts geändert. Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
    deactivated: 'Anbindung deaktiviert.',
    activated: 'Anbindung reaktiviert.',
    saved: 'Änderungen gespeichert.',
    startDateText: 'Wählen Sie, ab wann Bürgerinnen und Bürger diese Anbindung nutzen können.',
    nowActiveSince: (dateTime: string) => `Sofort (aktiv seit ${dateTime})`,
    startDateHint:
      'Bis zu diesem Datum können Bürgerinnen und Bürger keine neue Anfrage starten. Laufende Anfragen werden abgebrochen.',
    saveDate: 'Datum speichern',
    savingDate: 'Wird gespeichert …',
    startDateError: 'Das Startdatum konnte nicht gespeichert werden',
    startDateNoAnswer:
      'Das Startdatum konnte nicht gespeichert werden, daher hat sich nichts geändert. Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
    startDateSaved: 'Startdatum gespeichert.',
    draftTabTitle: (name: string) => `${name} (Entwurf)`,
    draftTitle: 'Diese Anbindung ist ein Entwurf',
    draftText:
      'Die Links können noch nicht in Ihre Dienste eingefügt werden. Sie werden aktiv, sobald diese Anbindung veröffentlicht ist.',
    edited: (date: string) => `Bearbeitet ${date}`,
    draftLinksText: 'Werden erstellt, sobald die Anbindung veröffentlicht und aktiv ist.',
    noDocumentsYet: 'Noch keine Dokumente',
    noDataYet: 'Noch keine Daten ausgewählt',
    deleteDraft: 'Entwurf löschen',
    draftPublishedSince: 'Dieser Entwurf wurde veröffentlicht, nachdem Sie ihn geöffnet haben.',
    openConnection: 'Anbindung öffnen',
    draftAlreadyDeleted: 'Dieser Entwurf wurde bereits gelöscht.',
    toOverview: 'Zur Übersicht',
  }
);

export const INITIAL_ACTIONS_STATE: ActionsState = {
  dialog: 'deactivate',
  dialogOpen: false,
  running: null,
  error: null,
  noAnswer: false,
  activeFrom: 'now',
  startDateText: '',
  dateError: false,
  dateRefusals: 0,
  toast: null,
};

/**
 * The failure's alert in "Change start date" and "Activate this connection again?", as the publish
 * dialog's (T024): below 320 CSS px (`narrow:`) its title takes the whole width under the icon;
 * kern.css's `flex: 1 0 0` on the title (unlayered, hence the `!`) would keep it beside the icon,
 * a few letters wide
 */
export const START_DATE_FAILURE_ALERT_CLASSES = 'w-full narrow:[&_.kern-title]:basis-full!';

export const INITIAL_DRAFT_DELETE_STATE: DraftDeleteState = {
  dialogOpen: false,
  deleting: false,
  failure: null,
};

// "14:32": the 24-hour time in the browser's time zone, after a date (the draft band's "Edited
// 03.10.2026, 14:32", U93 7362:54712; design-notes §3 "Dates"); per language (spec 009, R5),
// "14:32" in both
export const SAVED_TIME_FORMATS = defineTexts(
  new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }),
  new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
);

/**
 * A scheduled connection's start: 00:00 of its start date in Germany (data-model §1.3), written
 * as the frame draws it, "Active from 01.12.2026, 00:00" (U94 7355:60692), the same for every
 * team member (FR-020)
 */
export const START_TIME = '00:00';

/**
 * The date pill (U80 7355:61155, U94 7355:60689, U89 7355:61543): white, radius 8, the calendar
 * 20 and the line (label/small, muted) 8 apart. With the ⋯ (32) the padding is 8 16 8 8 and the
 * pill 48 high, the calendar and the line centred on the ⋯ from the top, so that the ⋯ stays on
 * the first row when the line wraps (W16); a draft's pill without it 8 16, 40 high (U93
 * 7362:54709). Under 320 CSS px the line takes the pill's width under the calendar and the ⋯
 */
export const DATE_PILL_CLASSES = {
  withActions: {
    pill: 'narrow:flex-wrap py-8 pr-8 pl-16',
    icon: 'mt-6',
    line: 'narrow:order-last narrow:basis-full narrow:py-0 py-4',
  },
  plain: { pill: 'px-16 py-8', icon: 'mt-2', line: '' },
};

/**
 * The status band's looks (U07 #6): the band's colour, the 32px status icon in its circle and the
 * picture at the bottom right. Active ("Status band · active" U80 7355:61767): green, the white
 * check 24px in a green circle, the colour picture. Deactivated ("Status band · deactivated" U89
 * 7355:61530): `layout-background-hued` #f2f5fb, the white "Icon/Link off" 20px (7355:61536, the
 * export) in a `layout-text-muted` #4a5468 circle (7355:61535), the grey picture (7355:61552, the
 * same crop). Draft ("Status band · draft" U93 7362:54697; U07 #23): the gradient from
 * `feedback-info-background` (21.6 %) to `layout-background-hued` (75.9 %) at 113.27°, the white
 * "icon-edit-small" 20px (7362:54702, the export) in a `feedback-info` circle (7362:54701, at the
 * overlay's AA value), the grey picture. Scheduled ("Status band · scheduled" U94 7355:60677):
 * `feedback-info-background` #e0f2fe, KERN's calendar 20px in white (7355:60683) in a
 * `feedback-info` circle (7355:60682, at the overlay's AA value, as the draft's), the colour
 * picture ("Picture · scheduled" 7355:60695, the active band's art, T006's crop)
 */
export const STATUS_BAND_TONES: Record<StatusBandTone, StatusBandToneLook> = {
  active: {
    band: 'bg-kern-feedback-success-background',
    iconCircle: 'bg-kern-feedback-success',
    icon: { src: doneWhiteIcon },
    iconSize: 'size-24',
    picture: publishedArt,
  },
  scheduled: {
    band: 'bg-kern-feedback-info-background',
    iconCircle: 'bg-kern-feedback-info',
    icon: { kern: 'kern-icon--calendar-today' },
    iconSize: 'size-20',
    picture: publishedArt,
  },
  deactivated: {
    band: 'bg-kern-layout-background-hued',
    iconCircle: 'bg-kern-layout-text-muted',
    icon: { src: linkOffWhiteIcon },
    iconSize: 'size-20',
    picture: publishedArtGrey,
  },
  draft: {
    band: 'bg-[linear-gradient(113.27deg,var(--kern-color-feedback-info-background)_21.638%,var(--kern-color-layout-background-hued)_75.912%)]',
    iconCircle: 'bg-kern-feedback-info',
    icon: { src: editWhiteSmallIcon },
    iconSize: 'size-20',
    picture: publishedArtGrey,
  },
};

/**
 * The reactivate dialog (U89 7173:52959) as the publish dialog draws it: the intro in
 * body/default, muted, and "Dialog content/Publish · summary" (the 8px-round table with the
 * decorative border, its rows `PublishSummaryRow`)
 */
export const SUMMARY_INTRO_CLASSES =
  'text-kern-static-medium text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)';
export const SUMMARY_TABLE_CLASSES =
  'rounded-kern-default flex w-full flex-col overflow-clip border border-(--kern-color-decorative-border-default)';

/**
 * The ⋯ menu's "Change start date" glyph (U88 6417:31045, "Icon/Change date · calendar pencil"
 * 6529:39066, the export), which KERN lacks
 */
export const CALENDAR_PENCIL_ICON = { src: calendarPencilIcon };
/** The ⋯ menu's "Deactivate" glyph (U88 6417:31045, "Icon/Link off"), which KERN lacks */
export const LINK_OFF_ICON = { src: linkOffIcon };
export const DELETE_ICON = { kern: 'kern-icon--delete' };
