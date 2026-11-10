import { SUFFIX_TEXTS } from '@connection-portal/rules/conditions';
import { CONDITION_PROBLEM_MESSAGES } from '@connection-portal/rules/constants';
import { defineTexts } from '@connection-portal/rules/language';
import { lowerFirst } from '@connection-portal/rules/messages';

import type { MenuDirection, PopupPlacement } from '../../../../utils/popupPlacement';
import type { MenuWidth, RuleEditorState } from './types';

// The rule editor's copy (S3): the frames of U11, U12, U13, U24, U25, U30–U32, with the decided
// changes of F1–F9, F30 and F32 and design-notes.md §2–§3; in German from the glossary (spec 009,
// G§2 "condition, check", "field, data", "option, value", "message", G§3 "operators")
export const RULE_EDITOR_COPY = defineTexts(
  {
    // Picker placeholders (U11 6348:40228, U32 6324:17746)
    chooseDocument: 'Choose document',
    chooseData: 'Choose data',
    choosePart: 'Choose part',
    chooseCheck: 'Choose check',
    chooseOptions: 'Choose options',
    // The menus' accessible names
    documentsMenu: 'Documents',
    dataMenu: 'Data',
    partsMenu: 'Parts',
    checksMenu: 'Checks',
    unitsMenu: 'Unit',
    valuesMenu: 'Values',
    // One footer wording for the document menu (002-S3.41), the design's (U30 6350:41316)
    documentsFooter: 'Only documents you added are listed.',
    searchDocument: (document: string) => `Search ${document}`,
    searchClasses: 'Search classes',
    searchOptions: 'Search options',
    noMatch: (text: string) => `No options match “${text}”.`,
    // The data menu's footer (6348:40520)
    needOtherData: 'Need other data?',
    addInDocuments: 'Add it in Documents',
    // Data/Status tag on images (U31 6350:41624; FR-002, cosmetic 9)
    notForRules: 'Not for rules',
    // The values menu's footer and the values field's error (U48 6191:42209, 6194:42246; cosmetic
    // 9)
    selectAtLeastOne: 'Choose at least one option.',
    // Licence classes' part picker (F5)
    licenceClasses: 'Licence classes',
    classPart: (code: string, part: string) => `Licence class ${code} – ${part}`,
    // Date menu sections (U31 6985:50041): "Time ago" and "Time from now" on every date, "Fixed
    // date" on every date but the Date of birth (F34, CLAR 2026-11-07 #25, cosmetic 9)
    timeAgoSection: 'Time ago',
    timeFromNowSection: 'Time from now',
    fixedDateSection: 'Fixed date',
    // Units of from-now conditions (6350:42585)
    years: 'years',
    months: 'months',
    fromNow: 'from now',
    // Value fields' accessible names
    numberLabel: 'Number',
    textLabel: 'Text to compare with',
    dateLabel: 'Date',
    yearsLabel: 'Number of years',
    amountLabel: 'Number of years or months',
    // F7, design-notes.md §3
    matchCase: 'Match letter case',
    textHint: 'Spaces at the start or end don’t matter.',
    // The hint while a date has no check yet, the Date of birth's too (F34; U31 6350:42013)
    dateHint: 'Check the time since or until this date, or compare it with a fixed date.',
    // U11 6348:40755, which stays: under "is at least N years old"
    turnsThatDay: (years: number) => `Citizens who turn ${years} that day count.`,
    // U32 6324:17646, which stays: a field made of parts before its part is chosen
    partsHint: (field: string) => `${field} has parts. Choose the part to check.`,
    // The counting note next to a time-ago or from-now condition (U30 6348:40754, U53
    // 6324:15672; a class's issue date U32 6350:42724; cosmetic 3, cosmetic 9), dates as
    // dd.mm.yyyy
    countedFrom: 'Counted from the day the citizen shares their data.',
    countedFromClassIssue: (code: string) =>
      `Counted from the date class ${code} was first issued.`,
    todayMeans: (today: string, meaning: string) => `Today (${today}), that means ${meaning}.`,
    // The words before the boundary: "born on or before …" (U30), "it expires on or after …"
    // (U53), and an exact age's "between … and …"
    bornPrefix: 'born',
    expiresPrefix: 'it expires',
    between: (from: string, to: string) => `between ${from} and ${to}`,
    // The missing-value note next to every date condition (U30 6348:40756, U53 6324:15673, a
    // class's dates U32 6350:42726; C1, cosmetic 9): the checked date's label, lower-cased in
    // English
    missingValue: (label: string) =>
      `If the ${lowerFirst(label)} is missing or can’t be read, the rule isn’t met. Konnekt reports it as “couldn’t be checked”.`,
    classMissing: (code: string) =>
      `If class ${code} is missing or can’t be read, the rule isn’t met. Konnekt reports it as “couldn’t be checked”.`,
    // The design's wording (U53 6324:17370, cosmetic 9), and U12 6357:43117 which stays
    nationalityHint: 'A citizen can have more than one nationality. The rule checks all of them.',
    classesHintOneOf: 'Met if the licence has at least one of the chosen classes.',
    // Proposed, for "includes none of" on the licence classes
    classesHintNoneOf: 'Met if the licence has none of the chosen classes.',
    // Field errors (U25 6196:10505, 6194:42253); the German of the last three is the server's
    // (`CONDITION_PROBLEM_MESSAGES`)
    enterCount: 'Enter a whole number greater than 0.',
    enterNumber: 'Enter a number.',
    enterText: 'Enter a text to compare with.',
    enterDate: 'Enter a date.',
    // The message field's label (C2) and its placeholder while empty (U30 6350:41266, FR-039)
    messageLabel: 'Message for citizens:',
    messagePlaceholder: 'Suggested once you choose a check. You can edit it.',
    // U30 6348:40758 (FR-051 (36))
    discardRule: 'Discard rule',
    saveRule: 'Save rule',
    rename: (name: string) => `Rename ${name}`,
  },
  {
    chooseDocument: 'Dokument auswählen',
    chooseData: 'Daten auswählen',
    choosePart: 'Bestandteil auswählen',
    chooseCheck: 'Prüfung auswählen',
    chooseOptions: 'Optionen auswählen',
    documentsMenu: 'Dokumente',
    dataMenu: 'Daten',
    partsMenu: 'Bestandteile',
    checksMenu: 'Prüfungen',
    unitsMenu: 'Einheit',
    valuesMenu: 'Werte',
    documentsFooter: 'Nur hinzugefügte Dokumente werden angezeigt.',
    // The glossary's short forms (R9): the search field holds about 137px at 320px, where
    // "<Dokument> durchsuchen" was cut (spec 009, T046); the menu is the data of the document
    // chosen above it
    searchDocument: () => 'Daten suchen',
    searchClasses: 'Klassen suchen',
    searchOptions: 'Optionen suchen',
    noMatch: (text) => `Keine Option passt zu „${text}“.`,
    needOtherData: 'Andere Daten benötigt?',
    addInDocuments: 'In „Dokumente“ hinzufügen',
    notForRules: 'Nicht für Regeln',
    selectAtLeastOne: 'Wählen Sie mindestens eine Option aus.',
    licenceClasses: 'Führerscheinklassen',
    classPart: (code, part) => `Führerscheinklasse ${code} – ${part}`,
    timeAgoSection: 'Zeit bis heute',
    timeFromNowSection: 'Zeit ab heute',
    fixedDateSection: 'Festes Datum',
    years: 'Jahre',
    months: 'Monate',
    fromNow: SUFFIX_TEXTS.de.fromNow,
    numberLabel: 'Zahl',
    textLabel: 'Text zum Vergleichen',
    dateLabel: 'Datum',
    yearsLabel: 'Anzahl der Jahre',
    amountLabel: 'Anzahl der Jahre oder Monate',
    matchCase: 'Groß-/Kleinschreibung beachten',
    textHint: 'Leerzeichen am Anfang oder Ende spielen keine Rolle.',
    dateHint:
      'Prüfen Sie die Zeit seit oder bis zu diesem Datum oder vergleichen Sie es mit einem festen Datum.',
    turnsThatDay: (years) => `Wer an diesem Tag ${years} wird, zählt mit.`,
    partsHint: (field) =>
      `Das Feld „${field}“ hat Bestandteile. Wählen Sie den zu prüfenden Bestandteil.`,
    countedFrom: 'Gezählt ab dem Tag, an dem die antragstellende Person ihre Daten teilt.',
    countedFromClassIssue: (code) =>
      `Gezählt ab dem Datum, an dem die Klasse ${code} erstmals ausgestellt wurde.`,
    todayMeans: (today, meaning) => `Heute (${today}) bedeutet das: ${meaning}.`,
    bornPrefix: 'geboren',
    expiresPrefix: 'Ablauf',
    between: (from, to) => `zwischen dem ${from} und dem ${to}`,
    missingValue: (label) =>
      `Fehlt das Feld „${label}“ oder kann es nicht gelesen werden, ist die Regel nicht erfüllt. Konnekt meldet dann „konnte nicht geprüft werden“.`,
    classMissing: (code) =>
      `Fehlt die Klasse ${code} oder kann sie nicht gelesen werden, ist die Regel nicht erfüllt. Konnekt meldet dann „konnte nicht geprüft werden“.`,
    nationalityHint:
      'Eine Person kann mehr als eine Staatsangehörigkeit haben. Die Regel prüft alle.',
    classesHintOneOf:
      'Erfüllt, wenn der Führerschein mindestens eine der ausgewählten Klassen enthält.',
    classesHintNoneOf: 'Erfüllt, wenn der Führerschein keine der ausgewählten Klassen enthält.',
    enterCount: 'Geben Sie eine ganze Zahl größer als 0 ein.',
    enterNumber: CONDITION_PROBLEM_MESSAGES.de.enter_number,
    enterText: CONDITION_PROBLEM_MESSAGES.de.enter_text,
    enterDate: CONDITION_PROBLEM_MESSAGES.de.enter_date,
    messageLabel: 'Nachricht für Bürgerinnen und Bürger:',
    messagePlaceholder:
      'Ein Vorschlag erscheint, sobald Sie eine Prüfung auswählen. Sie können ihn bearbeiten.',
    discardRule: 'Regel verwerfen',
    saveRule: 'Regel speichern',
    rename: (name) => `${name} umbenennen`,
  }
);

// The menus' widths in the frames (U30 6350:41316, U31 6350:41548, 6984:49993, 6985:50041, U33
// 6357:42841): documents, parts (also with the classes' search) and checks (also the dates') 300,
// the text checks 240, data 340, units 200
export const MENU_WIDTHS: Record<
  'document' | 'data' | 'part' | 'check' | 'textCheck' | 'unit',
  MenuWidth
> = {
  document: 300,
  data: 340,
  part: 300,
  check: 300,
  textCheck: 240,
  unit: 200,
};

/** The width class of each menu width (numeric utilities are pixels) */
export const MENU_WIDTH_CLASSES: Record<MenuWidth, string> = {
  200: 'w-200',
  240: 'w-240',
  300: 'w-300',
  340: 'w-340',
};

/**
 * Where a menu opens from its picker (utils/popupPlacement.ts, design-notes §3 "Menu"), 8px from
 * it as U30 draws it (the picker's bottom 541, the menu's top 549; U31 1.8b opens up, 8px above
 * it): below or above it, its left edge on the picker's, else its right edge. Where neither fits
 * (320px, 200% zoom) it spans the rule editor's content (the editor is the positioned box, 24px
 * padding): opening down it starts where the flow puts it, under the picker; opening up its
 * wrapper is a flex column, so that it starts at the picker's top, and it moves up by its own
 * height and the gap, whatever the picker's height (as the values menu, T027)
 */
export const CHOICE_MENU_PLACEMENTS: Record<PopupPlacement, Record<MenuDirection, string>> = {
  start: { down: 'top-full left-0 mt-8', up: 'bottom-full left-0 mb-8' },
  end: { down: 'top-full right-0 mt-8', up: 'bottom-full right-0 mb-8' },
  full: {
    down: 'inset-x-24 mt-8 narrow:inset-x-0',
    up: 'inset-x-24 -translate-y-[calc(100%+8px)] narrow:inset-x-0',
  },
};

/** The wrapper of a menu across the editor, by direction (see CHOICE_MENU_PLACEMENTS) */
export const CHOICE_FULL_WRAPPERS: Record<MenuDirection, string> = {
  down: 'static',
  up: 'static flex flex-col',
};

/**
 * The heights a menu's height is estimated from before it opens (U30 6350:41316, U31
 * 6350:41548, 6985:50041): the 1px border and 8px padding at the top and the bottom, the parts
 * 2px apart, the 40px search field, a choice 40px, a row with a symbol chip or an image's tag
 * 42px (the 26px chip, T024), a section heading 34px (8px above and 2px below its line), a
 * divider 1px and the footer's 36px text
 */
export const CHOICE_MENU_METRICS = {
  frame: 18,
  gap: 2,
  search: 40,
  row: 40,
  tallRow: 42,
  heading: 34,
  divider: 1,
  footer: 36,
};

/**
 * The height a long menu counts with when it decides to open down or up: U31 draws the parts
 * menu 294px high below its picker (6984:49993), its list scrolling inside, so a longer menu
 * opens down where that much fits above the footer (Figma "Rules/Picker": "Menus always open
 * downward"), else up (U31 6635:36492, "never under the footer"); its frame then takes the
 * max-height step that fits (research R10)
 */
export const CHOICE_MENU_DRAWN_HEIGHT = 294;

/**
 * A choice's hover and pressed layers (the kit's "states", P33 2:1985: the action colour at 8% and
 * 16%, as the ⋯ menus' entries, T021) and the colour transition (design-notes §4)
 */
export const CHOICE_STATES =
  'motion transition-colors duration-(--duration-colour) hover:bg-kern-action-state-indicator-default/8 active:bg-kern-action-state-indicator-default/16';

// The decoration chips of the check menus and the check picker (Figma "Rules/Symbol"). Text and
// enum checks have none
export const CHECK_SYMBOLS: Record<string, string> = {
  greater_than: '>',
  less_than: '<',
  equal_to: '=',
  not_equal_to: '≠',
  before: '<',
  after: '>',
  on: '=',
  at_least_years_ago: '≥',
  less_than_years_ago: '<',
  exactly_years_ago: '=',
  at_least_from_now: '≥',
  less_than_from_now: '<',
};

export const NATIONALITIES_FIELD = 'pid.nationalities';

// The keys of the expiry dates, fields and parts, whose counting note reads "it expires …" (U53
// 6324:15672)
export const EXPIRY_DATE_KEYS = ['date_of_expiry', 'expiry_date'];

// The issue date of a licence class, whose counting note names the class (U32 6350:42724)
export const CLASS_ISSUE_DATE_PART = 'issue_date';

export const INITIAL_RULE_EDITOR_STATE: RuleEditorState = {
  openMenu: null,
  search: '',
  document: null,
  messageEdited: false,
  typed: {},
  touched: {},
  saveTried: false,
};
