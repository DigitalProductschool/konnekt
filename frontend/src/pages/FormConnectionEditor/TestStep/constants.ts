// The test step's fixed copy (specs/004-rule-test-personas, contracts/ui-screens.md "Copy";
// design-notes.md §3–§9), in English and German (spec 009, research R1; glossary §2 "sample
// citizen", "meets", "message", "test step", and the test step's rows). Texts that depend on data
// are built in `rules/src/personas/messages.ts`, the outcome names "Not met" and "Couldn’t be
// checked" among them (`outcomeNameOf()`). Apostrophes are typographic (’)
import { defineTexts } from '@connection-portal/rules/language';

import type { ValuesPickerCopy } from '../../../components/ValuesPicker/types';

export const TEST_STEP_COPY = defineTexts(
  {
    // The step's page title and intro (spec 008 S13, cosmetic 12, C2; U65 7057:58714), the
    // heading, its hint and the tab title (`pageTitleOf()`)
    title: 'Test rules with sample citizen data',
    intro:
      'Choose a sample citizen to check that your rules work as intended. See which rules they meet and which message they’d see. The data is made up.',

    // Citizens row (S8.3; design-notes §3.1)
    /** The chips' tab list name (design-notes §3.1, proposed) */
    applicants: 'Sample citizens',
    /** All three personas generated anew (F45, cosmetic 12; U65 7344:96178, U66 7344:96200) */
    generateAll: 'Generate all',

    // Persona panel (S8.4; design-notes §4)
    editData: 'Edit data',
    generateAgain: 'Generate again',
    /**
     * The date of birth's row in the data card (spec 008 cosmetic 12, CLAR #46; U65 7057:59072,
     * U66 #14): the frames' label, where the rules say "Date of birth (Age)"
     */
    dateOfBirth: 'Date of birth',
    /** An empty value (design-notes §4.1) */
    notShared: 'Not shared',
    /** After a changed value, hidden from screen readers (K2; `editedHiddenTextOf()` is read) */
    edited: '· edited',
    // The edit-data dialog (spec 008 S13, FR-042; U66 7058:60639, U67 7058:60806, 7058:60824)
    /** The dialog's intro, under its title "Edit Mia’s data" (`EDIT_DATA_COPY.title`) */
    editDataIntro: 'Change the values to try a particular case. Results update when you save.',
    saveAndTest: 'Save and test',
    /** The saved change's toast begins with it (FR-042; U67 7058:61203, `savedToastOf()`) */
    resultsUpdated: 'Results updated.',
    /** The dialog's fields (S8.5) */
    name: 'Name',
    ageToday: 'Age today',
    enterDate: 'Enter a date that exists, e.g. 28.02.2007.',
    enterWholeNumber: 'Enter a whole number, e.g. 25.',
    enterName: 'Enter a name.',
    /** "Age today" that gives no date of birth (design-notes §5.2, proposed) */
    enterSmallerAge: 'Enter a smaller age, e.g. 25.',

    // Results (S8.6; design-notes §6.1)
    /**
     * A met row's hidden status, read after its name in place of its check icon and its green
     * name, which have no visible status text (FR-015, SC-007; proposed, T034; a row not met reads
     * `outcomeNameOf()`'s "Not met" the same way, test-results-v5 R2)
     */
    met: 'Met',

    // Failure (S8.9; design-notes §9)
    failureTitle: 'Couldn’t create sample citizens',
    tryAgain: 'Try again',

    // Questions before generating anew (S8.7; design-notes §7)
    cancel: 'Cancel',
    generateNewData: 'Generate new data',
  },
  {
    title: 'Regeln mit Daten von Beispielpersonen testen',
    intro:
      'Wählen Sie eine Beispielperson, um zu prüfen, ob Ihre Regeln wie beabsichtigt funktionieren. Sie sehen, welche Regeln die Person erfüllt und welche Nachricht sie sehen würde. Die Daten sind erfunden.',
    applicants: 'Beispielpersonen',
    generateAll: 'Alle neu erstellen',
    editData: 'Daten bearbeiten',
    generateAgain: 'Neu erstellen',
    dateOfBirth: 'Geburtsdatum',
    notShared: 'Nicht geteilt',
    edited: '· bearbeitet',
    editDataIntro:
      'Ändern Sie die Werte, um einen bestimmten Fall zu testen. Die Ergebnisse werden beim Speichern aktualisiert.',
    saveAndTest: 'Speichern und testen',
    resultsUpdated: 'Ergebnisse aktualisiert.',
    name: 'Name',
    ageToday: 'Alter heute',
    enterDate: 'Geben Sie ein gültiges Datum ein, z. B. 28.02.2007.',
    enterWholeNumber: 'Geben Sie eine ganze Zahl ein, z. B. 25.',
    enterName: 'Geben Sie einen Namen ein.',
    enterSmallerAge: 'Geben Sie ein niedrigeres Alter ein, z. B. 25.',
    met: 'Erfüllt',
    failureTitle: 'Beispielpersonen konnten nicht erstellt werden',
    tryAgain: 'Erneut versuchen',
    cancel: 'Abbrechen',
    generateNewData: 'Neue Daten erstellen',
  }
);

/**
 * The edit-data dialog's texts that depend on data (spec 008 FR-042, F40; T072). The rules
 * package words the other persona texts (`rules/src/personas/messages.ts`)
 */
export const EDIT_DATA_COPY = defineTexts(
  {
    /** "Edit Mia’s data", from the data card's heading "Mia’s data" (U66 7058:60644) */
    title: (dataHeading: string) => `Edit ${dataHeading}`,
    /** A licence class's issue date field: "Class B since" (F40; U66 7058:60662) */
    classSince: (licenceClass: string) => `Class ${licenceClass} since`,
    /** The toast's outcome sentences, after "Results updated." (U67 7058:61203) */
    nowMeets: (firstName: string, items: string) => `${firstName} now meets ${items}.`,
    noLongerMeets: (firstName: string, items: string) => `${firstName} no longer meets ${items}.`,
  },
  {
    /** "Daten von Mia bearbeiten", from the data card's heading "Daten von Mia" */
    title: (dataHeading) => `${dataHeading} bearbeiten`,
    classSince: (licenceClass) => `Klasse ${licenceClass} seit`,
    nowMeets: (firstName, items) => `${firstName} erfüllt jetzt ${items}.`,
    noLongerMeets: (firstName, items) => `${firstName} erfüllt ${items} nicht mehr.`,
  }
);

/** The digits of a `dd.mm.yyyy` date: a date field keeps no more (`dateEntryOf()`) */
export const DATE_ENTRY_DIGITS = 8;

/** The part of a licence class's issue date (`PersonaField.part`), labelled "Class B since" */
export const ISSUE_DATE_PART = 'issue_date';

// The step's layout where the wizard pins its step header (spec 008 FR-043, as clarified on
// 2026-11-18: V5 frame 15 7599:57529 "Many rules (12)" brings back each card's own scroll area,
// reversing CLAR #31 (c)'s "the panel scrolls"; T033's slot, `VISIBLE_HEIGHT_CLASSES`)

/**
 * The step: the visible part of the window under the pinned step header, less the content's 40px
 * bottom padding, and 24px more, so that the variant area ends 64px above the footer (U72
 * 7058:61692: 700 in a 764px body), its tabs and citizens row staying put
 */
export const STEP_PINNED_CLASSES = 'wizard-pinned:pb-24';

/**
 * The persona panel (Figma "Applicant panel" 7599:57586): a column, so that its "Data and result"
 * box fills its height (`PANEL_CONTENT_CLASSES`). Where the cards sit side by side (`lg`), each
 * card scrolls its own rows (`CARD_SCROLL_CLASSES`) and the panel holds them at its height, so
 * it doesn't scroll with loaded cards; it still does where they are stacked (below `lg`), and as
 * a fallback for the skeleton cards (317px high) in a short window. `relative` makes it the
 * containing block of the hidden texts outside the scroll areas (`sr-only`), which are
 * absolutely positioned: without it, they escape the scroll container, and with many rules their
 * places far down in the panel made the page scroll
 */
export const PANEL_CLASSES =
  'wizard-pinned:min-h-0 wizard-pinned:flex-1 wizard-pinned:overflow-y-auto relative flex flex-col overflow-x-clip p-16';

/**
 * "Data and result" (7599:57587): the two cards side by side from `lg`, 16px apart, as high as the
 * panel's visible part when they are shorter (U70 7057:61267, U71 7058:61372: both cards 395px in
 * a 427px panel). Where the step header is pinned, side by side, no higher than that either
 * (frame 15: 411px in the 443px panel): the cards' rows scroll inside them. Elsewhere it is as
 * high as the taller card, the other stretching to it
 */
export const PANEL_CONTENT_CLASSES =
  'wizard-pinned:lg:min-h-0 flex grow flex-col gap-16 lg:flex-row';

/**
 * A card's rows under its head (`CardScrollArea`; frame 15: the data card's scroll area
 * 7599:57593 and the result card's 7599:57635, each 8px under its 48px head). Where the step
 * header is pinned and the cards sit side by side, it takes the rest of the card's height and
 * scrolls; it reaches 16px into the card's right padding, with the same padding inside, so that
 * the scrollbar sits in that padding, as Figma's 4px bar does, and the rows keep their width
 * (the browser's own bar, as everywhere in the app). `relative` keeps the rows' hidden texts
 * (`sr-only`) inside it. It takes the keyboard focus, since nothing in the rows does (WCAG 2.1.1;
 * Safari doesn't focus a scroller by itself), with the ring for the keyboard only: KERN's
 * unlayered rules for `[tabindex]` need the `!` (as `ACTIVITY_LIST_CLASSES`)
 */
export const CARD_SCROLL_CLASSES =
  'wizard-pinned:lg:min-h-0 wizard-pinned:lg:flex-1 wizard-pinned:lg:overflow-y-auto wizard-pinned:lg:overflow-x-clip wizard-pinned:lg:-mr-16 wizard-pinned:lg:pr-16 rounded-kern-small focus-visible:outline-kern-action-focus-default! relative focus-visible:outline-4! focus-visible:outline-offset-2! [&:focus:not(:focus-visible)]:outline-none!';

// Citizens row (S8.3; T032): a chip's 20 px KERN mask icon for its outcome in the shown variant,
// in its colour (design-notes §10.4; Figma 7057:59061, 7057:59056). The shapes differ (check
// circle, diamond), so the outcome never rests on colour alone (FR-015)
export const CHIP_ICONS = {
  meets: 'kern-icon--success bg-kern-feedback-success!',
  fails: 'kern-icon--danger bg-kern-feedback-danger!',
} as const;

// Results (S8.6; T034): each status's 20 px KERN mask icon in its colour (design-notes §10.4). The
// three shapes differ, so the outcome never rests on colour alone (F8, F14; WCAG 1.4.1), now that
// only "Couldn’t be checked" is said in visible words (test-results-v5 R2). The V5 frames draw
// Material's person_off / how_to_reg, "Preview candidate, not approved": not adopted
export const RESULT_STATUS_ICONS = {
  met: 'kern-icon--success bg-kern-feedback-success!',
  not_met: 'kern-icon--danger bg-kern-feedback-danger!',
  not_checked: 'kern-icon--help bg-kern-layout-text-muted!',
} as const;

// A result row's name in its outcome's colour (test-results-v5 R2; V5 7599:55832): danger when not
// met, success when met (#c4271c and #1d7a2e, both 4.5:1 or more on white), and the default text
// colour when it couldn't be checked, as no frame draws that case (spec 004 F8 kept)
export const RESULT_NAME_COLOURS = {
  met: 'text-kern-feedback-success',
  not_met: 'text-kern-feedback-danger',
  not_checked: 'text-kern-layout-text-default',
} as const;

// A result row's left padding per level of a reported group's members (W10): the row's 12 px, then
// per level the icon's 20 px and the row's 8 px gap, so a member's icon sits under its group's
// name
export const MEMBER_INDENT = ['pl-12', 'pl-40', 'pl-68', 'pl-96'] as const;

// Loading states (S8.8; T035; spec 008 S13, T074; Figma U74 frames 18 7062:50960 and 19
// 7062:51249)

/**
 * The citizens row's loading status (`role="status"`), which keeps the focus while the button
 * that started a run gives way to the skeleton (quickstart V9)
 */
export const LOADING_STATUS_ID = 'test-loading-status';

export { LIVE_REGION_DELAY_MS } from '../../../constants';

/** Frame 18's three skeleton pills (U74 7062:51206–7062:51208), 40px high: their widths */
export const SKELETON_PILL_WIDTHS = ['w-130', 'w-126', 'w-132'] as const;

/**
 * The skeleton data card's rows (U74 7062:51214…, 7062:51501…): a 90px light bar for the label,
 * 24px, then a strong bar for the value, of these widths
 */
export const SKELETON_VALUE_WIDTHS = ['w-96', 'w-70', 'w-130', 'w-140'] as const;

/**
 * The skeleton result card's rows (U74 7062:51229…, 7062:51516…): the strong bar of the rule's name,
 * the light bar of its statement (F14; no frame: proposed) and the light bar of its message, the
 * last two short like "–"
 */
export const SKELETON_RESULT_ROWS = [
  { name: 'w-180', statement: 'w-240', message: 'w-200' },
  { name: 'w-200', statement: 'w-260', message: 'w-240' },
  { name: 'w-160', statement: 'w-220', message: 'w-14' },
  { name: 'w-190', statement: 'w-250', message: 'w-14' },
] as const;

/**
 * The skeleton's two greys and the loading ring's track (spec 008 T074; Figma U74 7062:51211,
 * 7062:51226, 7062:51495; design-notes §3 "Skeleton"): the overview's and the load state's,
 * `#e4e8ef` for the strong bars (titles, names, values, the icon placeholders) and `#eff1f5` for
 * the light ones (labels, statements, messages). Figma binds no variable to either
 */
export { SKELETON_BARS } from '../../../components/FormConnectionLoadState/constants';

/**
 * The loading ring of a chip whose persona is generated anew (Figma "Loading" 7062:51495): a
 * 16px circle, radius 7, stroke 2 in the skeleton's strong grey, with no arc
 */
export const LOADING_RING_CLASSES = 'border-2 border-[#e4e8ef]';

/**
 * The values picker's texts in a persona field (S8.5; T044), but the menu's name, which is the
 * field's label. Nothing has to stay chosen, so no footer; "Not shared" says none is
 */
export const VALUES_PICKER_COPY = defineTexts<Omit<ValuesPickerCopy, 'menu'>>(
  {
    placeholder: TEST_STEP_COPY.en.notShared,
    searchClasses: 'Search classes',
    searchOptions: 'Search options',
    footer: null,
    noMatch: (search) => `No options match “${search}”.`,
  },
  {
    placeholder: TEST_STEP_COPY.de.notShared,
    // The glossary's short forms, as the rule editor's (R9; spec 009, T046)
    searchClasses: 'Klassen suchen',
    searchOptions: 'Optionen suchen',
    footer: null,
    noMatch: (search) => `Keine Option passt zu „${search}“.`,
  }
);
