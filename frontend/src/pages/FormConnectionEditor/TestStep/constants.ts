// The test step's fixed copy (specs/004-rule-test-personas, contracts/ui-screens.md "Copy";
// design-notes.md §3–§9). Texts that depend on data are built in `utils/rules/personas/messages.ts`.
// Apostrophes are typographic (’)

export const TEST_STEP_COPY = {
  // Applicants row (S8.3; design-notes §3.1)
  /** The chips' tab list name (design-notes §3.1, proposed) */
  applicants: 'Sample applicants',
  generateAllAgain: 'Generate all again',

  // Persona panel (S8.4, S8.5; design-notes §4, §5)
  editData: 'Edit data',
  done: 'Done',
  generateAgain: 'Generate again',
  /** An empty value (design-notes §4.1) */
  notShared: 'Not shared',
  /** After a changed value, hidden from screen readers (K2; `editedHiddenText` is read instead) */
  edited: '· edited',
  /** Edit mode's fields (S8.5) */
  name: 'Name',
  ageToday: 'Age today',
  enterDate: 'Enter a date that exists, e.g. 28.02.2007.',
  enterWholeNumber: 'Enter a whole number, e.g. 25.',
  enterName: 'Enter a name.',
  /** "Age today" that gives no date of birth (design-notes §5.2, proposed) */
  enterSmallerAge: 'Enter a smaller age, e.g. 25.',

  // Results (S8.6; design-notes §6.1)
  rule: 'Rule',
  notMet: 'Not met',
  notChecked: 'Couldn’t be checked',
  /** The message cell of a row without a message (F14) */
  noMessage: '–',
  /**
   * A met row's hidden status, read in place of its check icon, which has no visible status text
   * (FR-015, SC-007; proposed, T034)
   */
  met: 'Met',

  // Failure (S8.9; design-notes §9)
  failureTitle: 'Couldn’t create sample applicants',
  tryAgain: 'Try again',

  // Questions before generating anew (S8.7; design-notes §7)
  cancel: 'Cancel',
  generateNewData: 'Generate new data',
} as const;

// Applicants row (S8.3; T032): a chip's 20 px KERN mask icon for its outcome in the shown variant,
// in its colour (design-notes §10.4; Figma 7057:59061, 7057:59056). The shapes differ (check
// circle, diamond), so the outcome never rests on colour alone (FR-015)
export const CHIP_ICONS = {
  meets: 'kern-icon--success bg-kern-feedback-success!',
  fails: 'kern-icon--danger bg-kern-feedback-danger!',
} as const;

// Results (S8.6; T034): each status's 20 px KERN mask icon in its colour (design-notes §10.4) and
// its visible text. The three shapes differ, so the outcome never rests on colour alone (F8, F14)
export const RESULT_STATUS_LOOKS = {
  met: { icon: 'kern-icon--success bg-kern-feedback-success!', text: null },
  not_met: { icon: 'kern-icon--danger bg-kern-feedback-danger!', text: TEST_STEP_COPY.notMet },
  not_checked: {
    icon: 'kern-icon--help bg-kern-layout-text-muted!',
    text: TEST_STEP_COPY.notChecked,
  },
} as const;

// A result row's indent per level of a reported group's members (W10): the icon's 20 px and the
// row's 12 px gap, so a member's icon sits under its group's name
export const MEMBER_INDENT = ['', 'pl-32', 'pl-64', 'pl-96'] as const;

// Loading states (S8.8; T035; Figma U11 frames 18 and 19, design-notes §8, §10.3)

/**
 * The applicants row's loading status (`role="status"`), which keeps the focus while the button
 * that started a run gives way to the skeleton (quickstart V9)
 */
export const LOADING_STATUS_ID = 'test-loading-status';

export { LIVE_REGION_DELAY_MS } from '../../../constants';

/** Frame 18's three skeleton pills (7062:51206–7062:51208), 40px high: their widths */
export const SKELETON_PILL_WIDTHS = ['w-130', 'w-126', 'w-132'] as const;

/**
 * The skeleton data card's rows (7062:51214…, 7062:51501…): a 90px light bar for the label, 24px,
 * then a strong bar for the value, of these widths
 */
export const SKELETON_VALUE_WIDTHS = ['w-96', 'w-70', 'w-130', 'w-140'] as const;

/**
 * The skeleton result card's rows (7062:51229…, 7062:51516…): the strong bar of the rule's name,
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
 * The skeleton's two greys (design-notes §10.3): strong bars (titles, names, values, the icon
 * placeholders; Figma #e4e8ef) and light ones (labels, statements, messages; Figma #eff1f5)
 */
export const SKELETON_BARS = {
  strong: 'bg-(--kern-color-feedback-default-background)',
  light: 'bg-kern-layout-background-hued',
} as const;

/**
 * The values picker's texts in a persona field (S8.5; T044), but the menu's name, which is the
 * field's label. Nothing has to stay chosen, so no footer; "Not shared" says none is
 */
export const VALUES_PICKER_COPY = {
  placeholder: TEST_STEP_COPY.notShared,
  searchClasses: 'Search classes',
  searchOptions: 'Search options',
  footer: null,
  noMatch: (search: string) => `No options match “${search}”.`,
};
