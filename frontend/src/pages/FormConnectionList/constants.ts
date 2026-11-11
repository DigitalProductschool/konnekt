import type { EditorStep } from '@connection-portal/api-types/form-connections';
import { defineTexts } from '@connection-portal/rules/language';

import documentInk from '../../assets/icons/document-ink.svg';
import factCheckInk from '../../assets/icons/fact-check-ink.svg';
import publicInk from '../../assets/icons/public-ink.svg';
import scienceInk from '../../assets/icons/science-ink.svg';
import type { ListState, RowDeleteState, WelcomeStep } from './types';

// S4, the overview (Figma U11 6699:44240, 6699:44511, 6699:44570; spec 009: G§2 "connection",
// "overview", "draft", "delete", "try again")
export const LIST_COPY = defineTexts(
  {
    pageTitle: 'Your connections',
    title: 'Your connections',
    // The design's one hint in every state (FR-029a; U11 #5)
    hint: 'Each connection links one of your services to the EUDI Wallet. Open a draft to continue, or view an active connection to get its links.',
    // The footer bar's primary action (cosmetic 1; U11 6699:44298)
    createConnection: 'Create connection',
    loading: 'Loading your connections…',
    errorTitle: 'Couldn’t load your connections',
    errorText: 'Check your connection and try again.',
    retry: 'Try again',
    // A row's date by its state (FR-017, FR-019; S4 "The row's date"; U13 6739:40556, U17
    // 6699:48031, U90 6699:48064 (F23)): "Published 28.10.2026", "Active from 01.12.2026",
    // "Deactivated 28.10.2026", a draft's "Edited 28.10.2026" adding its step
    published: (date: string) => `Published ${date}`,
    activeFrom: (date: string) => `Active from ${date}`,
    deactivated: (date: string) => `Deactivated ${date}`,
    edited: (date: string) => `Edited ${date}`,
    step: (label: string) => `${label} step`,
    metaSeparator: ' · ',
    // The row's actions (U13 6739:40602) and their per-row accessible names (FR-028)
    view: 'View',
    edit: 'Edit',
    deleteLabel: (name: string) => `Delete ${name}`,
    // The toasts (U17 6699:48002; U90 6699:48098 without its Undo, F4)
    draftSaved: 'Draft saved. You can pick it up any time.',
    deleted: (name: string) => `“${name}” deleted.`,
  },
  {
    pageTitle: 'Ihre Anbindungen',
    title: 'Ihre Anbindungen',
    hint: 'Jede Anbindung verbindet einen Ihrer Dienste mit der EUDI-Wallet. Öffnen Sie einen Entwurf, um weiterzuarbeiten, oder sehen Sie sich eine aktive Anbindung an, um ihre Links zu erhalten.',
    createConnection: 'Anbindung erstellen',
    loading: 'Ihre Anbindungen werden geladen …',
    errorTitle: 'Ihre Anbindungen konnten nicht geladen werden',
    errorText: 'Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
    retry: 'Erneut versuchen',
    // Glossary §2 (spec 010, T002), without "am" as "Bearbeitet <date>" (design-notes §4.2)
    published: (date: string) => `Veröffentlicht ${date}`,
    activeFrom: (date: string) => `Aktiv ab ${date}`,
    deactivated: (date: string) => `Deaktiviert ${date}`,
    edited: (date: string) => `Bearbeitet ${date}`,
    step: (label: string) => `Schritt „${label}“`,
    metaSeparator: ' · ',
    view: 'Ansehen',
    edit: 'Bearbeiten',
    deleteLabel: (name: string) => `${name} löschen`,
    draftSaved: 'Entwurf gespeichert. Sie können jederzeit weiterarbeiten.',
    deleted: (name: string) => `„${name}“ gelöscht.`,
  }
);

// The list card's column headers (U11 6699:44253; no checkbox column, F14)
export const COLUMN_HEADERS = defineTexts(
  { name: 'Name', status: 'Status', date: 'Date' },
  { name: 'Name', status: 'Status', date: 'Datum' }
);

// The toolbar's search (FR-051 (27), (28); U11 6699:44247, 6699:44518, 6699:44628; G§2 "search")
export const SEARCH_COPY = defineTexts(
  {
    label: 'Search',
    placeholder: 'Search connections',
    clear: 'Clear search',
    count: (total: number) => `${total} ${total === 1 ? 'connection' : 'connections'}`,
    countOf: (shown: number, total: number) =>
      `${shown} of ${total} ${total === 1 ? 'connection' : 'connections'}`,
    noMatches: (query: string) => `No connections match “${query}”.`,
    noMatchesHint: 'Check the spelling or try another name.',
  },
  {
    label: 'Suchen',
    placeholder: 'Anbindungen durchsuchen',
    clear: 'Suche leeren',
    count: (total: number) => `${total} ${total === 1 ? 'Anbindung' : 'Anbindungen'}`,
    countOf: (shown: number, total: number) =>
      `${shown} von ${total} ${total === 1 ? 'Anbindung' : 'Anbindungen'}`,
    noMatches: (query: string) => `Keine Anbindung passt zu „${query}“.`,
    noMatchesHint: 'Prüfen Sie die Schreibweise oder versuchen Sie einen anderen Namen.',
  }
);

// S3, the welcome page (Figma U11 6699:44481, "1b")
export const WELCOME_COPY = defineTexts(
  {
    pageTitle: 'Welcome',
    title: 'Welcome to Konnekt',
    heading: 'Create your first connection',
    text: 'Link your services to the EUDI Wallet. Set your own rules and get verified citizen data.',
    stepsLabel: 'How a connection comes together',
    createConnection: 'Create connection',
  },
  {
    pageTitle: 'Willkommen',
    title: 'Willkommen bei Konnekt',
    heading: 'Erstellen Sie Ihre erste Anbindung',
    text: 'Verbinden Sie Ihre Dienste mit der EUDI-Wallet. Legen Sie eigene Regeln fest und erhalten Sie geprüfte Daten von Bürgerinnen und Bürgern.',
    stepsLabel: 'So entsteht eine Anbindung',
    createConnection: 'Anbindung erstellen',
  }
);

/**
 * The welcome page's steps illustration (U11 6699:44493): the design's four labels and glyphs,
 * in each language (the glyphs the same in both; the list is keyed by its glyph, so a switch
 * re-keys nothing)
 */
export const WELCOME_STEPS = defineTexts<readonly WelcomeStep[]>(
  [
    { label: 'Choose documents', glyph: documentInk },
    { label: 'Set rules', glyph: factCheckInk },
    { label: 'Test', glyph: scienceInk },
    { label: 'Publish', glyph: publicInk },
  ],
  [
    { label: 'Dokumente auswählen', glyph: documentInk },
    { label: 'Regeln festlegen', glyph: factCheckInk },
    { label: 'Testen', glyph: scienceInk },
    { label: 'Veröffentlichen', glyph: publicInk },
  ]
);

export const INITIAL_LIST_STATE: ListState = { status: 'loading', attempt: 0 };

/**
 * The one delete dialog of a row (FR-029c; U14 6699:44419, 6699:44480, U90 6417:31599): the
 * design's title and buttons for every connection, the body by its state. A draft keeps its own
 * body (F55, 005-S6.10); a deactivated connection takes the design's "Its documents and rules
 * …", an active one the active warning. The failure texts are the details' (FR-008)
 */
export const DELETE_CONNECTION_COPY = defineTexts(
  {
    title: (name: string) => `Delete “${name}”?`,
    draft: (name: string) =>
      `${name} will be deleted for good. It was never live, so nothing changes for serviceBW.`,
    active:
      'This connection is active. Citizens won’t be able to use it, and its links stop working.',
    deactivated: 'Its documents and rules will be deleted too.',
    confirm: 'Delete connection',
    cancel: 'Keep connection',
    busy: 'Deleting…',
    errorTitle: 'Couldn’t delete',
    errorText: 'Nothing changed. Check your connection and try again.',
    retry: 'Try again',
  },
  {
    title: (name: string) => `„${name}“ löschen?`,
    draft: (name: string) =>
      `${name} wird endgültig gelöscht. Die Anbindung war nie aktiv, daher ändert sich für serviceBW nichts.`,
    active:
      'Diese Anbindung ist aktiv. Bürgerinnen und Bürger können sie dann nicht mehr nutzen, und ihre Links funktionieren nicht mehr.',
    deactivated: 'Die Dokumente und Regeln der Anbindung werden ebenfalls gelöscht.',
    confirm: 'Anbindung löschen',
    cancel: 'Anbindung behalten',
    busy: 'Wird gelöscht …',
    errorTitle: 'Die Anbindung konnte nicht gelöscht werden',
    errorText:
      'Es wurde nichts geändert. Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
    retry: 'Erneut versuchen',
  }
);

/**
 * A row's "Edit" (U13 6739:40602): a link for a draft, a button for a published connection, which
 * asks first (F48). Figma draws the 1px outline inside the 8px padding (77 wide); KERN adds it
 * outside
 */
export const ROW_EDIT_CLASSES = 'kern-btn kern-btn--secondary kern-btn--small px-7!';

export const INITIAL_ROW_DELETE_STATE: RowDeleteState = {
  target: null,
  open: false,
  deleting: false,
  error: null,
  stale: false,
};

/** The step a draft was saved in, as its row names it ("Rules step"; the wizard's step names) */
export const STEP_LABELS = defineTexts<Record<EditorStep, string>>(
  { connection: 'Connection', documents: 'Documents', rules: 'Rules', test: 'Test' },
  { connection: 'Anbindung', documents: 'Dokumente', rules: 'Regeln', test: 'Test' }
);

// "28.10.2026": a row's date (cosmetic 3, design-notes §3 "Dates"; U13 6739:40556)
export const ROW_DATE_FORMAT = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/**
 * The overview's footer bar (Figma "Shell/Footer" 6699:44298, cosmetic 1): 72px, white with the
 * 1px top line, its action right-aligned in the 1120px column, the buttons 40px tall
 * (`wizard-footer`, index.css). Fixed to the window's bottom where it is 480px tall, as the
 * wizard's is, and in the flow below that. Its slot keeps the design's 24px between the list card
 * and the bar (16 of the column's gap + 8; U12 6699:44915: the card ends at 804, the bar starts at
 * 828) and the bar's 72px, in place of the page's bottom padding, so the end of the list never
 * hides under the bar.
 */
export const OVERVIEW_FOOTER_CLASSES = {
  slot: 'mt-8 -mb-48 shrink-0 [@media(height>=30rem)]:h-72',
  bar: 'wizard-footer bg-kern-layout-background-default z-15 px-16 py-16 shadow-[inset_0_1px_0_var(--kern-color-decorative-border-default)] [@media(height>=30rem)]:fixed [@media(height>=30rem)]:inset-x-0 [@media(height>=30rem)]:bottom-0',
};

/**
 * The overview's column (U12 6699:44915, "rows scroll inside the card"): in a window at least
 * 768px wide and 480px tall (the footer bar fixed), the page is never taller than the window: the
 * column ends at the window's bottom (less the 64px header area, AppLayout's 32px above and the
 * 48px below it, which the footer slot takes back), so the list card gets what the title, the
 * toolbar and the footer leave, and its rows scroll inside it under the column headers (564px in
 * a 900px window, as drawn). In a narrower or shorter window (320px, 200 % zoom) the page scrolls
 * as a whole, so that the rows don't scroll in a box of a row or two
 */
export const OVERVIEW_COLUMN_CLASSES =
  'flex min-h-0 flex-col gap-16 [@media(width>=48rem)_and_(height>=30rem)]:max-h-[calc(100dvh-144px)]';

/**
 * The list card (U11 6699:44252): white, 1px border, radius 12, no shadow. It is the container
 * the rows' and headers' layout follows (`ROW_BREAKPOINT`), and it may shrink to fit the column
 */
export const LIST_CARD_CLASSES =
  '@container rounded-kern-large bg-kern-layout-background-default flex min-h-123 flex-col overflow-hidden border border-(--kern-color-decorative-border-default)';

/** The rows: they scroll inside the card when it is shorter than they are, one row at least */
export const ROWS_CLASSES = 'min-h-80 overflow-y-auto';

/**
 * The list card's column headers and rows share these widths (U11 6699:44253: 280, 130, 160).
 * The columns need 928px of the card (24 + 280 + 24 + 130 + 24 + 160 + 24 + the 223px actions +
 * 24, with room to spare); in a narrower card the rows wrap and the headers go (`@max-[58rem]`)
 */
export const COLUMN_HEADER_CLASSES =
  'bg-kern-layout-background-hued text-kern-static-small text-kern-layout-text-muted flex shrink-0 items-center gap-24 border-b border-(--kern-color-decorative-border-default) px-24 py-8 leading-(--kern-typography-line-height-medium-static) font-semibold @max-[58rem]:hidden';

/**
 * A row (U13 6739:40536): 24 16, its parts 24 apart and centred, a 1px line above every row but
 * the first, no border or radius of its own; 80 high with or without a description (FR-029b),
 * since the 48px actions set the height. In a card narrower than 58rem the parts wrap: the name
 * on its own line, then the status and the date, then the actions
 */
export const ROW_CLASSES = {
  row: 'relative flex flex-wrap items-center gap-x-24 gap-y-8 border-(--kern-color-decorative-border-default) px-24 py-16 not-first:border-t @min-[58rem]:flex-nowrap',
  name: 'flex min-w-0 shrink-0 basis-full flex-col @min-[58rem]:w-280 @min-[58rem]:basis-auto',
  status: 'flex max-w-full shrink-0 @min-[58rem]:w-130',
  date: 'text-kern-static-small text-kern-layout-text-muted max-w-full shrink-0 leading-(--kern-typography-line-height-medium-static) @min-[58rem]:w-160',
  spacer: 'hidden min-w-0 flex-1 @min-[58rem]:block',
  // max-w-full: in a window under 320 CSS px the buttons wrap instead of leaving the card (T096)
  actions: 'flex max-w-full shrink-0 flex-wrap items-center gap-x-8',
};

/** A skeleton row's bars (§3 "Skeleton", U74 7062:51211): name, description, status, date */
export const SKELETON_ROW_BARS = {
  name: 'h-10 w-160',
  description: 'h-10 w-220',
  status: 'h-10 w-72',
  date: 'h-10 w-96',
};

/** How many skeleton rows stand for the list while it loads (001-S3.5) */
export const SKELETON_ROW_COUNT = 3;
