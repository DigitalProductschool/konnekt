import type { ConditionKind, OperatorDefinition, StatementSymbol } from './types';

// The operators of each kind, in FR-003's words and in the pickers' order (data-model.md,
// "Conditions"). Numbers and text share equal_to and not_equal_to, so look them up by kind
export const OPERATORS: Record<ConditionKind, OperatorDefinition[]> = {
  number: [
    {
      operator: 'greater_than',
      kind: 'number',
      label: 'is greater than',
      input: 'number',
      section: null,
    },
    {
      operator: 'less_than',
      kind: 'number',
      label: 'is less than',
      input: 'number',
      section: null,
    },
    { operator: 'equal_to', kind: 'number', label: 'is equal to', input: 'number', section: null },
    {
      operator: 'not_equal_to',
      kind: 'number',
      label: 'is not equal to',
      input: 'number',
      section: null,
    },
  ],
  text: [
    { operator: 'equal_to', kind: 'text', label: 'is equal to', input: 'text', section: null },
    {
      operator: 'not_equal_to',
      kind: 'text',
      label: 'is not equal to',
      input: 'text',
      section: null,
    },
    { operator: 'contains', kind: 'text', label: 'contains', input: 'text', section: null },
    {
      operator: 'not_contains',
      kind: 'text',
      label: 'doesn’t contain',
      input: 'text',
      section: null,
    },
  ],
  enum: [
    {
      operator: 'includes_one_of',
      kind: 'enum',
      label: 'includes one of',
      input: 'values',
      section: null,
    },
    {
      operator: 'includes_none_of',
      kind: 'enum',
      label: 'includes none of',
      input: 'values',
      section: null,
    },
  ],
  date: [
    { operator: 'before', kind: 'date', label: 'is before', input: 'date', section: 'date' },
    { operator: 'after', kind: 'date', label: 'is after', input: 'date', section: 'date' },
    { operator: 'on', kind: 'date', label: 'is', input: 'date', section: 'date' },
    {
      operator: 'at_least_years_ago',
      kind: 'date',
      label: 'is at least',
      input: 'years',
      section: 'time_ago',
    },
    {
      operator: 'less_than_years_ago',
      kind: 'date',
      label: 'is less than',
      input: 'years',
      section: 'time_ago',
    },
    {
      operator: 'exactly_years_ago',
      kind: 'date',
      label: 'is exactly',
      input: 'years',
      section: 'time_ago',
    },
    {
      operator: 'at_least_from_now',
      kind: 'date',
      label: 'is at least',
      input: 'amount',
      section: 'time_from_now',
    },
    {
      operator: 'less_than_from_now',
      kind: 'date',
      label: 'is less than',
      input: 'amount',
      section: 'time_from_now',
    },
  ],
};

// The design's chips before a date condition; FR-005 makes them decoration
export const OPERATOR_SYMBOLS: Record<string, StatementSymbol> = {
  at_least_years_ago: '≥',
  at_least_from_now: '≥',
  less_than_years_ago: '<',
  less_than_from_now: '<',
  exactly_years_ago: '=',
};

// The design's date format, "23 Oct 2005", with fixed English month names
export const MONTH_ABBREVIATIONS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

// Dates as the API writes them
export const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

// The date example's words for each boundary (F4)
export const RELATION_WORDS = {
  on_or_before: 'on or before',
  before: 'before',
  after: 'after',
  on_or_after: 'on or after',
  on: 'on',
};

// Dates count by the calendar day in Germany (FR-012)
export const GERMAN_TIME_ZONE = 'Europe/Berlin';

// The licence classes' value set, whose codes per-class parts name (research R6)
export const LICENCE_CLASSES_SET = 'licence_classes';

// Size limits (spec Assumptions) and text lengths (data-model.md, "The snapshot")
export const MAX_BRANCHES = 20;
export const MAX_ITEMS_PER_BRANCH = 200;
export const NAME_MAX_LENGTH = 100;
export const DESCRIPTION_MAX_LENGTH = 500;
export const MESSAGE_MAX_LENGTH = 500;

// Names that are kept for the item with the number (FR-005): "Rule 08", "Group 3", "Sub-group 04"
export const RESERVED_NAME_PATTERN = /^(rule|group|sub-group) (\d+)$/i;
export const RULE_ID_PATTERN = /^rule-[1-9]\d*$/;
export const GROUP_ID_PATTERN = /^group-[1-9]\d*$/;

// Proposed messages read better for some fields (T030): the city or town and the country someone
// lives in, the nationality, and where a document was issued. Keyed by `{document}.{field}`
export const LIVES_IN_FIELDS = new Set(['pid.address_locality', 'mdl.resident_city']);
export const LIVES_IN_COUNTRY_FIELDS = new Set(['pid.address_country', 'mdl.resident_country']);
export const NATIONALITY_FIELDS = new Set(['pid.nationalities', 'mdl.nationality']);
export const ISSUING_COUNTRY_FIELDS = new Set(['pid.issuing_country', 'mdl.issuing_country']);
export const EXPIRY_DATE_FIELDS = new Set(['pid.date_of_expiry', 'mdl.expiry_date']);
export const PLACE_OF_BIRTH_FIELD = 'pid.place_of_birth';

// The server's messages for FR-006's refusals (backend/app/services/rules.py), word for word.
// {branch} and {rule} are names as written, trimmed
export const RULES_MESSAGES = {
  tooManyBranches: 'A connection can have at most 20 variants.',
  mainBranch: 'The rules need exactly one main branch.',
  branchNameMissing: 'Enter a name for every variant.',
  branchNameTooLong: 'A variant’s name can have at most 100 characters.',
  branchNameTwice: (name: string) =>
    `Two variants are called ${name}. Give each variant its own name.`,
  descriptionTooLong: (branch: string) =>
    `The description of ${branch} can have at most 500 characters.`,
  tooManyItems: (branch: string) => `${branch} can have at most 200 rules and groups.`,
  invalidIdentifier:
    'The rules contain an invalid identifier. Reload the connection and try again.',
  itemNameMissing: (noun: string, branch: string) => `Enter a name for every ${noun} in ${branch}.`,
  itemNameTooLong: (noun: string, branch: string) =>
    `A ${noun} in ${branch} has a name longer than 100 characters.`,
  nameTaken: (noun: string, branch: string, name: string) =>
    `Another ${noun} in ${branch} is already called ${name}.`,
  nameReserved: (name: string, noun: string, number: string) =>
    `${name} is kept for the ${noun} numbered ${number}.`,
  chooseData: (rule: string, branch: string) => `${rule} in ${branch}: choose the data to check.`,
  notRequested: (rule: string, branch: string) =>
    `${rule} in ${branch} checks data that’s no longer requested.`,
  unknownPart: (rule: string, branch: string, field: string) =>
    `${rule} in ${branch} checks a part that ${field} doesn’t have.`,
  noMessage: (rule: string, branch: string) => `${rule} in ${branch} has no error message.`,
  messageTooLong: (rule: string, branch: string) =>
    `The error message of ${rule} in ${branch} can have at most 500 characters.`,
  // Inline renaming (`nameProblem`)
  nameMissing: 'Enter a name.',
  nameTooLong: 'A name can have at most 100 characters.',
};

// The part after "{rule} in {branch}: " of each incomplete condition's message
export const CONDITION_PROBLEM_MESSAGES = {
  choose_check: 'choose a check.',
  enter_number: 'enter a number.',
  enter_text: 'enter a text to compare with.',
  choose_value: 'choose at least one value.',
  values_from_list: 'choose values from the list.',
  value_once: 'choose each value only once.',
  enter_date: 'enter a date.',
  years_at_least_1: 'enter a number of years of at least 1.',
  choose_unit: 'choose years or months.',
  amount_at_least_1: (unit: 'years' | 'months') => `enter a number of ${unit} of at least 1.`,
};
