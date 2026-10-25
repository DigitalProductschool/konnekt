import type { RuleEditorState } from './types';

// The rule editor's copy (S3): the frames of U11, U12, U13, U24, U25, U30–U32, with the decided
// changes of F1–F9, F30 and F32 and design-notes.md §2–§3
export const RULE_EDITOR_COPY = {
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
  // FYI #20: one footer wording for the document menu (design-notes.md §2)
  documentsFooter: 'Only documents you request are listed.',
  searchDocument: (document: string) => `Search ${document}`,
  searchClasses: 'Search classes',
  searchOptions: 'Search options',
  noMatch: (text: string) => `No options match “${text}”.`,
  // The data menu's footer (6348:40520)
  needOtherData: 'Need other data?',
  addInDocuments: 'Add it in Documents',
  // Data/Status tag on images (6348:40517; FR-002)
  cantBeChecked: 'Can’t be checked',
  // The values menu's footer (6191:42209, F32)
  selectAtLeastOne: 'Select at least one option.',
  // Licence classes' part picker (F5)
  licenceClasses: 'Licence classes',
  classPart: (code: string, part: string) => `Licence class ${code} – ${part}`,
  // Date menu sections (F3; U11 6348:40681 on the Date of birth, U30 6324:15613 elsewhere)
  ageSection: 'Age',
  timeAgoSection: 'Time ago',
  timeFromNowSection: 'Time from now',
  fixedDateSection: 'Fixed date',
  dateOfBirthSection: 'Date of birth',
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
  // F3: the hint while a date has no check yet
  dateHint: 'Check an age, the time from now, or compare the date with a fixed date.',
  // F4: next to every date condition
  countedFrom: 'Counted from the day the applicant shares.',
  todayMeans: (today: string, meaning: string) => `Today (${today}) this means: ${meaning}.`,
  missingValue: (thing: string) =>
    `If the ${thing} is missing or can’t be read, the rule isn’t met and is reported as couldn’t be checked.`,
  classOf: (part: string, code: string) => `${part} of class ${code}`,
  classMissing: (code: string) => `If class ${code} is missing, the rule isn’t met.`,
  // F30, and U12 6357:43117 which stays
  nationalityHint:
    'Nationality can have more than one value. “Includes one of” is met if any of them is one of the chosen values, “includes none of” if none of them is.',
  classesHintOneOf: 'Met if the licence has at least one of the chosen classes.',
  // Proposed, for "includes none of" on the licence classes
  classesHintNoneOf: 'Met if the licence has none of the chosen classes.',
  // Field errors (U25 6196:10505, 6194:42253)
  enterCount: 'Enter a number greater than 0.',
  enterNumber: 'Enter a number.',
  enterText: 'Enter a text to compare with.',
  enterDate: 'Enter a date.',
  // F9: the empty message field, label and placeholder
  messageLabel: 'Error message applicants read:',
  messagePlaceholder: 'Suggested once you complete the check. You can edit it.',
  // U11 6348:40235
  cancel: 'Cancel',
  saveRule: 'Save rule',
  rename: (name: string) => `Rename ${name}`,
};

// Value sets with more options than this get a search field ("Search options")
export const SEARCH_THRESHOLD = 10;

// The menus' widths in the frames: documents and parts 300, data and dates 340, checks 300,
// units 200
export const MENU_WIDTHS = {
  document: 'w-300',
  data: 'w-340',
  part: 'w-300',
  partSearch: 'w-340',
  check: 'w-300',
  dateCheck: 'w-340',
  unit: 'w-200',
  values: 'w-300',
};

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

export const INITIAL_RULE_EDITOR_STATE: RuleEditorState = {
  openMenu: null,
  search: '',
  document: null,
  messageEdited: false,
  typed: {},
  touched: {},
};
