import type { EditorStep } from '@connection-portal/api-types/form-connections';
import { defineTexts } from '@connection-portal/rules/language';

import documentInk from '../../assets/icons/document-ink.svg';
import factCheckInk from '../../assets/icons/fact-check-ink.svg';
import publicInk from '../../assets/icons/public-ink.svg';
import scienceInk from '../../assets/icons/science-ink.svg';
import type { PopupPlacement } from '../../utils/popupPlacement';
import type {
  BulkDeleteState,
  DeletionState,
  ExampleDialogState,
  ListState,
  RowDeleteState,
  Selection,
  WelcomeStep,
} from './types';

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
    // The toasts (U17 6699:48002; U90 6699:48098 with its "Undo", spec 010 FR-033); after
    // "Undo" (FR-034, FR-036; copy.md §4, W11)
    draftSaved: 'Draft saved. You can pick it up any time.',
    deleted: (name: string) => `“${name}” deleted.`,
    undo: 'Undo',
    restored: (name: string) => `“${name}” restored.`,
    notRestorable: (name: string) => `“${name}” can no longer be restored.`,
    restoreFailed: 'Couldn’t restore. Try again.',
    // A bulk deletion's toasts (FR-044; copy.md §4, W12); the single-name ones stay for one
    deletedMany: (count: number) => `${count} connections deleted.`,
    restoredMany: (count: number) => `${count} connections restored.`,
    notRestorableMany: 'The connections can no longer be restored.',
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
    // Glossary: "Undo" (a toast's action) "Rückgängig"; "restore, restored (a deleted
    // connection)" "wiederherstellen, wiederhergestellt" (spec 010, T002)
    undo: 'Rückgängig',
    restored: (name: string) => `„${name}“ wiederhergestellt.`,
    notRestorable: (name: string) => `„${name}“ kann nicht mehr wiederhergestellt werden.`,
    restoreFailed: 'Wiederherstellen nicht möglich. Versuchen Sie es erneut.',
    deletedMany: (count: number) => `${count} Anbindungen gelöscht.`,
    restoredMany: (count: number) => `${count} Anbindungen wiederhergestellt.`,
    notRestorableMany: 'Die Anbindungen können nicht mehr wiederhergestellt werden.',
  }
);

// The list card's column headers (U11 6699:44253; spec 010's select-all before them, U15
// 6699:45213)
export const COLUMN_HEADERS = defineTexts(
  { name: 'Name', status: 'Status', date: 'Date' },
  { name: 'Name', status: 'Status', date: 'Datum' }
);

// The selection (spec 010, S4 "Selection", "Selection bar"; FR-038, FR-039): the bar's count and
// buttons as drawn (U15 6699:45206), the checkboxes' names for screen readers (copy.md §4); G§2
// "selected (overview rows)", "cancel", "delete"
export const SELECTION_COPY = defineTexts(
  {
    selected: (count: number) => `${count} selected`,
    cancel: 'Cancel',
    delete: 'Delete',
    selectRow: (name: string) => `Select “${name}”`,
    selectAll: 'Select all connections',
  },
  {
    selected: (count: number) => `${count} ausgewählt`,
    cancel: 'Abbrechen',
    delete: 'Löschen',
    selectRow: (name: string) => `„${name}“ auswählen`,
    selectAll: 'Alle Anbindungen auswählen',
  }
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
    // Spec 010, FR-053 (1g U18 6793:47706; F24: never 1b's "Start with an example")
    startFromExample: 'Start from an example',
  },
  {
    pageTitle: 'Willkommen',
    title: 'Willkommen bei Konnekt',
    heading: 'Erstellen Sie Ihre erste Anbindung',
    text: 'Verbinden Sie Ihre Dienste mit der EUDI-Wallet. Legen Sie eigene Regeln fest und erhalten Sie geprüfte Daten von Bürgerinnen und Bürgern.',
    stepsLabel: 'So entsteht eine Anbindung',
    createConnection: 'Anbindung erstellen',
    startFromExample: 'Mit einem Beispiel beginnen',
  }
);

/**
 * The example dialog (spec 010, S3; FR-054; U18 6793:47710): the design's title, text and
 * buttons; the busy label and the failure's title from copy.md §6; without an answer the
 * overview's "Check your connection and try again.", and "Try again" after a failure, as the
 * overview's. The example's name is the one created in this language (data-model §5). G§2
 * "example", "draft", "publish", "active"
 */
export const EXAMPLE_DIALOG_COPY = defineTexts(
  {
    title: 'Start from an example?',
    text: 'This creates a draft called “Passenger transport licence (example)” with 2 documents and 2 rules. It only becomes active when you publish.',
    cancel: 'Go back',
    confirm: 'Create the example',
    busy: 'Creating…',
    errorTitle: 'Couldn’t create the example',
    errorText: 'Check your connection and try again.',
    retry: 'Try again',
  },
  {
    title: 'Mit einem Beispiel beginnen?',
    text: 'Dadurch wird ein Entwurf namens „Personenbeförderungsschein (Beispiel)“ mit 2 Dokumenten und 2 Regeln erstellt. Er wird erst aktiv, wenn Sie ihn veröffentlichen.',
    cancel: 'Zurück',
    confirm: 'Beispiel erstellen',
    busy: 'Wird erstellt …',
    errorTitle: 'Das Beispiel konnte nicht erstellt werden',
    errorText: 'Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
    retry: 'Erneut versuchen',
  }
);

/** The example dialog, closed */
export const INITIAL_EXAMPLE_DIALOG_STATE: ExampleDialogState = {
  open: false,
  creating: false,
  error: null,
};

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

/** Nothing selected (spec 010, FR-040): the page starts with it, and the selection is never stored */
export const NO_SELECTION: Selection = new Set();

/**
 * No deletion yet (spec 010, S4 "After a deletion"). Toast id 1 is the arrival's "Draft saved."
 * toast, so that a deletion's first toast (2) replaces it and is announced anew
 */
export const INITIAL_DELETION_STATE: DeletionState = { toastId: 1, current: null };

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
    // A scheduled connection (spec 010, S17; FR-010; U14 6872:45929), the date in the text's face
    scheduled: (date: string) =>
      `This connection will be active from ${date}. If you delete it, it won’t become active and its links won’t work.`,
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
    scheduled: (date: string) =>
      `Diese Anbindung ist ab ${date} aktiv. Wenn Sie sie löschen, wird sie nicht aktiv und ihre Links funktionieren nicht.`,
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
 * The bulk delete dialog (spec 010, S4 "Delete"; FR-041 to FR-043; U15 6699:45320, "Dialog
 * content/Delete · summary"; copy.md §4, W12): the design's title, text, warning line for an
 * active connection and buttons; the scheduled connection's line and the changed connection's
 * sentence from copy.md §4; the failure texts as the row dialog's (W8), the title in the plural.
 * The names in the warning lines stand without quotes, as drawn. G§2 "connection", "delete",
 * "keep", "scheduled", "citizens"
 */
export const BULK_DELETE_COPY = defineTexts(
  {
    title: (count: number) => `Delete ${count} connections?`,
    text: 'Their documents and rules will be deleted too.',
    active: (name: string) => `${name} is active. Citizens won’t be able to use it.`,
    scheduled: (name: string, date: string) =>
      `${name} is scheduled for ${date}. It won’t become active.`,
    changed: (name: string) =>
      `Nothing was deleted: “${name}” was deleted or changed in the meantime.`,
    confirm: 'Delete connections',
    cancel: 'Keep connections',
    busy: 'Deleting…',
    errorTitle: 'Couldn’t delete',
    errorText: 'Nothing changed. Check your connection and try again.',
    retry: 'Try again',
  },
  {
    title: (count: number) => `${count} Anbindungen löschen?`,
    text: 'Die Dokumente und Regeln der Anbindungen werden ebenfalls gelöscht.',
    active: (name: string) =>
      `${name} ist aktiv. Bürgerinnen und Bürger können sie dann nicht mehr nutzen.`,
    scheduled: (name: string, date: string) =>
      `${name} ist für den ${date} geplant. Sie wird nicht aktiv.`,
    changed: (name: string) =>
      `Nichts wurde gelöscht: „${name}“ wurde in der Zwischenzeit gelöscht oder geändert.`,
    confirm: 'Anbindungen löschen',
    cancel: 'Anbindungen behalten',
    busy: 'Wird gelöscht …',
    errorTitle: 'Die Anbindungen konnten nicht gelöscht werden',
    errorText:
      'Es wurde nichts geändert. Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
    retry: 'Erneut versuchen',
  }
);

/**
 * The bulk delete dialog's parts (U15 6699:45320): the text in body/default and text/muted
 * (16/24); the lines and the warnings, 16 apart, in one region that scrolls inside the dialog
 * when the window can't show them with the buttons (W12, `--bulk-delete-max`, measured); the
 * summary card with its 1px border/decorative line and radius 8, a line per connection 16 8, its
 * name in label/default, the pill right, a line between lines; a warning: the 20px amber triangle,
 * 8, the sentence in label/default and feedback/warning. Where the name would get less than 120px
 * beside the pill (a 320px window), and always below 320 CSS px, the pill goes under the name. The region's focus ring as the Activity list's: kern.css takes the outline off a
 * `[tabindex]` with `:focus-visible`, outside any layer, hence the `!`s
 */
export const BULK_DELETE_CLASSES = {
  text: 'text-kern-static-medium text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static) break-words',
  region:
    'flex max-h-(--bulk-delete-max) w-full flex-col gap-16 rounded-kern-small focus-visible:outline-kern-action-focus-default! overflow-y-auto focus-visible:outline-4! focus-visible:outline-offset-2! [&:focus:not(:focus-visible)]:outline-none!',
  lines:
    'rounded-kern-default flex w-full shrink-0 flex-col border border-(--kern-color-decorative-border-default)',
  line: 'flex flex-wrap items-center gap-x-16 gap-y-4 border-(--kern-color-decorative-border-default) px-16 py-8 not-last:border-b',
  name: 'text-kern-static-medium text-kern-layout-text-default min-w-0 flex-1 basis-120 leading-(--kern-typography-line-height-medium-static) font-semibold break-words narrow:basis-full',
  warnings: 'flex w-full shrink-0 flex-col gap-8',
  warning: 'flex items-start gap-8',
  warningText:
    'text-kern-static-medium text-kern-feedback-warning min-w-0 flex-1 leading-(--kern-typography-line-height-medium-static) font-semibold break-words',
};

/**
 * The CSS property that caps the bulk delete dialog's region (`BULK_DELETE_CLASSES.region`), and
 * the least height worth scrolling in: where less is left, the region keeps its height and the
 * dialog scrolls as a whole, as the overview does at 320 px and 200 % zoom (no box of a line or
 * two)
 */
export const BULK_DELETE_MAX_PROPERTY = '--bulk-delete-max';
export const BULK_DELETE_MIN_REGION = 120;

export const INITIAL_BULK_DELETE_STATE: BulkDeleteState = {
  rows: null,
  open: false,
  deleting: false,
  error: null,
  changedName: null,
  stale: false,
};

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
 * hides under the bar. Under 320 CSS px the page keeps its bottom padding (`narrow:mb-0`): the
 * toast, which sticks there and keeps a place of its own after the bar (T096), would otherwise
 * cover the bar's lower 16px at the end of the page (spec 010, T043)
 */
export const OVERVIEW_FOOTER_CLASSES = {
  slot: 'mt-8 -mb-48 shrink-0 narrow:mb-0 [@media(height>=30rem)]:h-72',
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
  '@container rounded-kern-large bg-kern-layout-background-default flex min-h-127 flex-col overflow-hidden border border-(--kern-color-decorative-border-default)';

/** The rows: they scroll inside the card when it is shorter than they are, one row at least */
export const ROWS_CLASSES = 'min-h-80 overflow-y-auto';

/**
 * The list card's column headers and rows share these widths (U11 6699:44253: 280, 130, 160;
 * spec 010's checkbox, U15 6699:45213: 20 before them). The columns need 1005px of the card (24 +
 * 20 + 24 + 280 + 24 + 130 + 24 + 160 + 24 + 24 + the 223px actions + 24); in a narrower card the
 * rows wrap and the headers keep the select-all and "Name" only (`@max-[63rem]`). With the
 * select-all's 28px (U15 6699:45214: 20 and 4 above and below) the headers are 45 high (U15
 * 6699:45213), the label text centred on the box
 */
export const COLUMN_HEADER_CLASSES = {
  headers:
    'bg-kern-layout-background-hued text-kern-static-small text-kern-layout-text-muted flex shrink-0 items-center gap-24 border-b border-(--kern-color-decorative-border-default) px-24 py-8 leading-(--kern-typography-line-height-medium-static) font-semibold',
  name: 'min-w-0 shrink @min-[63rem]:w-280 @min-[63rem]:shrink-0',
  column: 'w-130 shrink-0 @max-[63rem]:hidden',
  date: 'w-160 shrink-0 @max-[63rem]:hidden',
};

/**
 * A row's checkbox and the select-all (U15 6699:45219, 6699:45214, "Data/Check item" without a
 * label): the design's 20px box with 4px above and below. The label around it is the target,
 * 2px wider on each side than the box (24 × 28, W16), without moving the name: its side margins
 * take the 2px back. The box's own 2px top margin (index.css, for a labelled check item) goes
 */
export const CHECKBOX_CLASSES = {
  target: '-mx-2 flex shrink-0 cursor-pointer px-2 py-4',
  box: 'kern-form-check__checkbox m-0!',
};

/**
 * A row (U13 6739:40536; spec 010, U15 6699:45218): 24 16, the checkbox, then the row's parts,
 * 24 apart and centred, a 1px line above every row but the first, no border or radius of its
 * own; 80 high with or without a description (FR-029b), since the 48px actions set the height.
 * In a card narrower than 63rem the parts wrap beside the checkbox: the name on its own line,
 * then the status and the date, then the actions; the checkbox stays at the top, its box centred
 * on the name's first line (2px up). Below 320 CSS px the checkbox takes a line of its own above
 * the parts, which keep the row's whole width (W16)
 */
export const ROW_CLASSES = {
  // The row scopes its description's anchor name, so that each bubble finds its own row's
  row: '[anchor-scope:--row-description] relative flex items-start gap-x-24 gap-y-4 border-(--kern-color-decorative-border-default) px-24 py-16 not-first:border-t narrow:flex-col narrow:items-stretch @min-[63rem]:items-center',
  check: '-mt-2 narrow:self-start @min-[63rem]:mt-0',
  parts: 'flex min-w-0 flex-1 flex-wrap items-center gap-x-24 gap-y-8 @min-[63rem]:flex-nowrap',
  name: 'flex min-w-0 shrink-0 basis-full flex-col @min-[63rem]:w-280 @min-[63rem]:basis-auto',
  status: 'flex max-w-full shrink-0 @min-[63rem]:w-130',
  date: 'text-kern-static-small text-kern-layout-text-muted max-w-full shrink-0 leading-(--kern-typography-line-height-medium-static) @min-[63rem]:w-160',
  spacer: 'hidden min-w-0 flex-1 @min-[63rem]:block',
  // max-w-full: in a window under 320 CSS px the buttons wrap instead of leaving the card (T096)
  actions: 'flex max-w-full shrink-0 flex-wrap items-center gap-x-8',
};

/**
 * The selection bar (U15 6699:45206, "Rules/Selection bar" as the rules step builds it): where
 * the toolbar was, the info tint, 16 8, the count in label/default taking the room left, "Cancel"
 * as KERN's small tertiary button without the 4px that make its 48px slot (40 tall in the bar's
 * 56), and "Delete" as the red primary button at the footer's 40px, 8 apart. Where less than
 * 192px are left beside the buttons, the count takes the whole line and the buttons wrap under
 * it (W16)
 */
export const SELECTION_BAR_CLASSES = {
  bar: 'bg-kern-feedback-info-background flex shrink-0 flex-wrap items-center gap-8 px-16 py-8',
  count:
    'text-kern-static-medium text-kern-layout-text-default min-w-0 flex-1 basis-192 leading-(--kern-typography-line-height-medium-static) font-semibold break-words',
  cancel: 'kern-btn kern-btn--tertiary kern-btn--small my-0!',
  delete: 'kern-btn kern-btn--primary kern-btn--danger min-h-40!',
};

/** The description a row's bubble is anchored to (CSS anchor positioning) */
export const ROW_DESCRIPTION_ANCHOR = '[anchor-name:--row-description]';

/** The bubble's width in the top layer, never wider than the window less its gutters */
const ROW_BUBBLE_WIDTH = 'w-280 max-w-[calc(100vw-32px)]';

/**
 * A row's description bubble in the top layer (bug connection-tooltip-clipped): drawn over the
 * card, whose rows scroll and would cut it off, and over the page. It is anchored to its
 * description: below it, or above it where the window has no room below (`flip-block`), or at
 * the window's top where neither side has room (`--row-description-top`, index.css). The 8px gap
 * is padding on both sides, so that the mouse crosses it without leaving the bubble whichever
 * side it opens to. The side is placementFrom()'s: lined up with the description's left edge
 * (`start`), its right edge (`end`), or across the window less its gutters (`full`). The browser's
 * own popover box goes: its inset, margin, border, padding, background and fit-content width
 */
const ROW_BUBBLE =
  'm-0 inset-auto top-[anchor(bottom)] overflow-visible border-0 bg-transparent px-0 py-8 open:flex [position-anchor:--row-description] [position-try-fallbacks:flip-block,--row-description-top]';

export const ROW_BUBBLE_CLASSES: Record<PopupPlacement, string> = {
  start: `${ROW_BUBBLE} left-[anchor(left)] ${ROW_BUBBLE_WIDTH}`,
  end: `${ROW_BUBBLE} right-[anchor(right)] ${ROW_BUBBLE_WIDTH}`,
  full: `${ROW_BUBBLE} inset-x-16 w-auto`,
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
