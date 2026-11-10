import { defineTexts } from './language';
import type {
  ConditionKind,
  ConditionProblem,
  DateBoundary,
  EditMessageKey,
  ItemNoun,
  OperatorDefinition,
  RulesMessageKey,
  StatementSymbol,
} from './types';

// The operators' words, by kind and operator: FR-003's, which `OPERATORS` keep as their `label`
// for the MCP server's catalog
const OPERATOR_LABELS_EN = {
  number: {
    greater_than: 'is greater than',
    less_than: 'is less than',
    equal_to: 'is equal to',
    not_equal_to: 'is not equal to',
  },
  text: {
    equal_to: 'is equal to',
    not_equal_to: 'is not equal to',
    contains: 'contains',
    not_contains: 'doesn’t contain',
  },
  enum: { includes_one_of: 'includes one of', includes_none_of: 'includes none of' },
  date: {
    before: 'is before',
    after: 'is after',
    on: 'is',
    at_least_years_ago: 'is at least',
    less_than_years_ago: 'is less than',
    exactly_years_ago: 'is exactly',
    at_least_from_now: 'is at least',
    less_than_from_now: 'is less than',
  },
};

// The operators' words in each language, by kind and operator (spec 009, R4; glossary G§3
// "operators"): the German ones are for the pickers and statements (`labelOf`)
export const OPERATOR_LABELS = defineTexts<typeof OPERATOR_LABELS_EN>(OPERATOR_LABELS_EN, {
  number: {
    greater_than: 'ist größer als',
    less_than: 'ist kleiner als',
    equal_to: 'ist gleich',
    not_equal_to: 'ist ungleich',
  },
  text: {
    equal_to: 'ist gleich',
    not_equal_to: 'ist ungleich',
    contains: 'enthält',
    not_contains: 'enthält nicht',
  },
  enum: { includes_one_of: 'enthält eines von', includes_none_of: 'enthält keines von' },
  date: {
    before: 'liegt vor dem',
    after: 'liegt nach dem',
    on: 'ist der',
    at_least_years_ago: 'ist mindestens',
    less_than_years_ago: 'ist weniger als',
    exactly_years_ago: 'ist genau',
    at_least_from_now: 'liegt mindestens',
    less_than_from_now: 'liegt weniger als',
  },
});

export type OperatorLabels = (typeof OPERATOR_LABELS)['en'];

const { number: NUMBER, text: TEXT, enum: ENUM, date: DATE } = OPERATOR_LABELS_EN;

// The operators of each kind, in FR-003's words and in the pickers' order (data-model.md,
// "Conditions"). Numbers and text share equal_to and not_equal_to, so look them up by kind. The
// label is the English one of `OPERATOR_LABELS`
export const OPERATORS: Record<ConditionKind, OperatorDefinition[]> = {
  number: [
    {
      operator: 'greater_than',
      kind: 'number',
      label: NUMBER.greater_than,
      input: 'number',
      section: null,
    },
    {
      operator: 'less_than',
      kind: 'number',
      label: NUMBER.less_than,
      input: 'number',
      section: null,
    },
    {
      operator: 'equal_to',
      kind: 'number',
      label: NUMBER.equal_to,
      input: 'number',
      section: null,
    },
    {
      operator: 'not_equal_to',
      kind: 'number',
      label: NUMBER.not_equal_to,
      input: 'number',
      section: null,
    },
  ],
  text: [
    { operator: 'equal_to', kind: 'text', label: TEXT.equal_to, input: 'text', section: null },
    {
      operator: 'not_equal_to',
      kind: 'text',
      label: TEXT.not_equal_to,
      input: 'text',
      section: null,
    },
    { operator: 'contains', kind: 'text', label: TEXT.contains, input: 'text', section: null },
    {
      operator: 'not_contains',
      kind: 'text',
      label: TEXT.not_contains,
      input: 'text',
      section: null,
    },
  ],
  enum: [
    {
      operator: 'includes_one_of',
      kind: 'enum',
      label: ENUM.includes_one_of,
      input: 'values',
      section: null,
    },
    {
      operator: 'includes_none_of',
      kind: 'enum',
      label: ENUM.includes_none_of,
      input: 'values',
      section: null,
    },
  ],
  date: [
    { operator: 'before', kind: 'date', label: DATE.before, input: 'date', section: 'date' },
    { operator: 'after', kind: 'date', label: DATE.after, input: 'date', section: 'date' },
    { operator: 'on', kind: 'date', label: DATE.on, input: 'date', section: 'date' },
    {
      operator: 'at_least_years_ago',
      kind: 'date',
      label: DATE.at_least_years_ago,
      input: 'years',
      section: 'time_ago',
    },
    {
      operator: 'less_than_years_ago',
      kind: 'date',
      label: DATE.less_than_years_ago,
      input: 'years',
      section: 'time_ago',
    },
    {
      operator: 'exactly_years_ago',
      kind: 'date',
      label: DATE.exactly_years_ago,
      input: 'years',
      section: 'time_ago',
    },
    {
      operator: 'at_least_from_now',
      kind: 'date',
      label: DATE.at_least_from_now,
      input: 'amount',
      section: 'time_from_now',
    },
    {
      operator: 'less_than_from_now',
      kind: 'date',
      label: DATE.less_than_from_now,
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

// The chips before a number condition (U45 6753:40528, 6753:40544: "> is greater than", "< is less
// than"; the user's decision of 2026-11-09). Only for numbers: a text "is equal to" has none
export const NUMBER_OPERATOR_SYMBOLS: Record<string, StatementSymbol> = {
  greater_than: '>',
  less_than: '<',
  equal_to: '=',
  not_equal_to: '≠',
};

// Dates as the API writes them
export const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

// The date example's words for each boundary (F4), in each language (glossary G§3
// `RELATION_WORDS`)
export const RELATION_WORDS = defineTexts<
  Record<Exclude<DateBoundary['relation'], 'between'>, string>
>(
  {
    on_or_before: 'on or before',
    before: 'before',
    after: 'after',
    on_or_after: 'on or after',
    on: 'on',
  },
  {
    on_or_before: 'am oder vor dem',
    before: 'vor dem',
    after: 'nach dem',
    on_or_after: 'am oder nach dem',
    on: 'am',
  }
);

export type RelationWords = (typeof RELATION_WORDS)['en'];

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

// The rules' name for a field checked as an age (rules-ui-fixes B7), in each language (glossary
// G§4). Only the rules UI says it: the documents step, the messages and the server's words keep the
// catalog's "Date of birth"
export const DATE_OF_BIRTH_RULE_LABEL = defineTexts<string>(
  'Date of birth (Age)',
  'Geburtsdatum (Alter)'
);

// The items' nouns in sentences, in each language (glossary G§2; `nounTextOf()` in tree.ts). The
// German ones are the server's too, in the messages below: all three are feminine and keep their
// form in every case of the singular, so the templates' articles ("eine", "jede", "die") fit each
// of them. Stored names ("Rule 01", "Sub-group 03") stay English (FR-007)
export const ITEM_NOUNS = defineTexts<Record<ItemNoun, string>>(
  { rule: 'rule', group: 'group', 'sub-group': 'sub-group' },
  { rule: 'Regel', group: 'Gruppe', 'sub-group': 'Untergruppe' }
);

// A number of years or months in words, in each language (glossary G§3 "N years / months"): one
// and other forms, never an appended "s" (`countOf()` in dates.ts). `otherDative` is German's
// plural after "seit" and "in" ("seit 2 Jahren"); English has no such form, so it is `other`
export const TIME_UNITS = defineTexts<
  Record<'years' | 'months', { one: string; other: string; otherDative: string }>
>(
  {
    years: { one: 'year', other: 'years', otherDative: 'years' },
    months: { one: 'month', other: 'months', otherDative: 'months' },
  },
  {
    years: { one: 'Jahr', other: 'Jahre', otherDative: 'Jahren' },
    months: { one: 'Monat', other: 'Monate', otherDative: 'Monaten' },
  }
);

// The server's messages for FR-006's refusals (backend/app/services/rules_texts.py), word for word.
// {branch} and {rule} are names as written, trimmed; the keys are the problems' codes
// (`RulesMessageKey`, spec 009, R10)
const RULES_MESSAGES_EN = {
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
  itemNameMissing: (noun: ItemNoun, branch: string) =>
    `Enter a name for every ${noun} in ${branch}.`,
  itemNameTooLong: (noun: ItemNoun, branch: string) =>
    `A ${noun} in ${branch} has a name longer than 100 characters.`,
  nameTaken: (noun: ItemNoun, branch: string, name: string) =>
    `There’s already a ${noun} called "${name}" in ${branch}.`,
  nameReserved: (name: string, noun: ItemNoun, number: string) =>
    `${name} is kept for the ${noun} numbered ${number}.`,
  chooseData: (rule: string, branch: string) => `${rule} in ${branch}: choose the data to check.`,
  notRequested: (rule: string, branch: string) =>
    `${rule} in ${branch} checks data that’s no longer requested.`,
  // `field` is the field's label in the context's language
  unknownPart: (rule: string, branch: string, field: string) =>
    `${rule} in ${branch} checks a part that ${field} doesn’t have.`,
  noMessage: (rule: string, branch: string) => `${rule} in ${branch} has no error message.`,
  messageTooLong: (item: string, branch: string) =>
    `The error message of ${item} in ${branch} can have at most 500 characters.`,
  // Groups and sub-groups (FR-008): what they may hold, and how many members
  rulesOnly: (subGroup: string, branch: string) => `${subGroup} in ${branch} can only hold rules.`,
  tooFewMembers: (group: string, branch: string) =>
    `${group} in ${branch} needs at least two rules.`,
  // The Add variant and Edit variant dialogs (W3; U26 6197:12011; design-notes.md §4)
  variantNameMissing: 'Enter a name for the variant.',
  variantNameTaken: (name: string) => `There’s already a variant called "${name}".`,
  // Inline renaming (`nameProblem`)
  nameMissing: 'Enter a name.',
  nameTooLong: 'A name can have at most 100 characters.',
} satisfies Record<RulesMessageKey, unknown>;

// `RULES_MESSAGES_EN` and the German, word for word as the server's in both languages (spec 009,
// R4, R8: `validation.test.ts` renders the parity fixture `fixtures/server-messages.json` from this
// table). Names are inserted as written in both languages. The last four keys are the client's
// own, the German from the glossary (G§2)
export const RULES_MESSAGES = defineTexts<typeof RULES_MESSAGES_EN>(RULES_MESSAGES_EN, {
  tooManyBranches: 'Eine Anbindung kann höchstens 20 Varianten haben.',
  mainBranch: 'Die Regeln brauchen genau eine Hauptvariante.',
  branchNameMissing: 'Geben Sie für jede Variante einen Namen ein.',
  branchNameTooLong: 'Der Name einer Variante darf höchstens 100 Zeichen lang sein.',
  branchNameTwice: (name: string) =>
    `Zwei Varianten heißen ${name}. Geben Sie jeder Variante einen eigenen Namen.`,
  descriptionTooLong: (branch: string) =>
    `Die Beschreibung von ${branch} darf höchstens 500 Zeichen lang sein.`,
  tooManyItems: (branch: string) => `${branch} kann höchstens 200 Regeln und Gruppen haben.`,
  invalidIdentifier:
    'Die Regeln enthalten eine ungültige Kennung. Laden Sie die Anbindung neu und versuchen Sie es erneut.',
  itemNameMissing: (noun: ItemNoun, branch: string) =>
    `Geben Sie für jede ${ITEM_NOUNS.de[noun]} in ${branch} einen Namen ein.`,
  itemNameTooLong: (noun: ItemNoun, branch: string) =>
    `Eine ${ITEM_NOUNS.de[noun]} in ${branch} hat einen Namen mit mehr als 100 Zeichen.`,
  nameTaken: (noun: ItemNoun, branch: string, name: string) =>
    `In ${branch} gibt es bereits eine ${ITEM_NOUNS.de[noun]} namens „${name}“.`,
  nameReserved: (name: string, noun: ItemNoun, number: string) =>
    `${name} ist für die ${ITEM_NOUNS.de[noun]} mit der Nummer ${number} reserviert.`,
  chooseData: (rule: string, branch: string) =>
    `${rule} in ${branch}: Wählen Sie die zu prüfenden Daten.`,
  notRequested: (rule: string, branch: string) =>
    `${rule} in ${branch} prüft Daten, die nicht mehr angefordert werden.`,
  unknownPart: (rule: string, branch: string, field: string) =>
    `${rule} in ${branch} prüft einen Bestandteil, den das Feld „${field}“ nicht hat.`,
  noMessage: (rule: string, branch: string) => `${rule} in ${branch} hat keine Fehlermeldung.`,
  messageTooLong: (item: string, branch: string) =>
    `Die Fehlermeldung von ${item} in ${branch} darf höchstens 500 Zeichen lang sein.`,
  rulesOnly: (subGroup: string, branch: string) =>
    `${subGroup} in ${branch} kann nur Regeln enthalten.`,
  tooFewMembers: (group: string, branch: string) =>
    `${group} in ${branch} braucht mindestens zwei Regeln.`,
  variantNameMissing: 'Geben Sie einen Namen für die Variante ein.',
  variantNameTaken: (name: string) => `Es gibt bereits eine Variante namens „${name}“.`,
  nameMissing: 'Geben Sie einen Namen ein.',
  nameTooLong: 'Ein Name darf höchstens 100 Zeichen lang sein.',
});

export type RulesMessages = (typeof RULES_MESSAGES)['en'];

// The refusals of the editor's actions (edits.ts) in a state where the rules step doesn't offer
// them, so that the agents' tools can say why and what to do instead (spec 007, FR-016). An item
// and a variant by their names as written, trimmed; `main` is the main variant's. The keys are
// the refusals' codes (`EditMessageKey`, spec 009, R10)
const EDIT_MESSAGES_EN = {
  unknownVariant: 'Unknown variant.',
  unknownItem: (id: string, variant: string) => `${variant} has no rule or group ${id}.`,
  notRule: (item: string, variant: string) => `${item} in ${variant} is a group, not a rule.`,
  notGroup: (item: string, variant: string) => `${item} in ${variant} is a rule, not a group.`,
  removed: (item: string, variant: string) => `${item} is removed in ${variant}. Restore it first.`,
  alreadyRemoved: (item: string, variant: string) => `${item} is already removed in ${variant}.`,
  notRemoved: (item: string, variant: string) =>
    `${item} in ${variant} isn’t removed, so there is nothing to restore.`,
  notChanged: (item: string, variant: string, main: string) =>
    `${item} in ${variant} isn’t changed: it follows ${main} already.`,
  notBased: (variant: string, main: string) =>
    `${variant} isn’t based on ${main}, so it has nothing to reset or restore.`,
  inheritedGroup: (group: string, variant: string, main: string) =>
    `${group} in ${variant} follows ${main}, so it can only be ungrouped in ${main}. Remove it from ${variant} instead.`,
  cantGroup: (variant: string) =>
    `Choose two or more rules of one level in ${variant} to group. A sub-group can’t hold groups.`,
  mainVariant: (main: string) => `${main} is the main variant and can’t be deleted.`,
  noCopyTarget: (rule: string) => `Choose another variant to copy ${rule} to.`,
} satisfies Record<EditMessageKey, unknown>;

// `EDIT_MESSAGES_EN` and the German. The refusals reach agents only, in English (spec 009,
// FR-017); the German is written for completeness (glossary G§2), and `unknownVariant` mirrors
// the server's word for word
export const EDIT_MESSAGES = defineTexts<typeof EDIT_MESSAGES_EN>(EDIT_MESSAGES_EN, {
  unknownVariant: 'Unbekannte Variante.',
  unknownItem: (id: string, variant: string) => `${variant} hat keine Regel oder Gruppe ${id}.`,
  notRule: (item: string, variant: string) => `${item} in ${variant} ist eine Gruppe, keine Regel.`,
  notGroup: (item: string, variant: string) =>
    `${item} in ${variant} ist eine Regel, keine Gruppe.`,
  removed: (item: string, variant: string) =>
    `${item} ist in ${variant} entfernt. Stellen Sie sie zuerst wieder her.`,
  alreadyRemoved: (item: string, variant: string) => `${item} ist in ${variant} bereits entfernt.`,
  notRemoved: (item: string, variant: string) =>
    `${item} in ${variant} ist nicht entfernt, daher gibt es nichts wiederherzustellen.`,
  notChanged: (item: string, variant: string, main: string) =>
    `${item} in ${variant} ist nicht geändert und folgt bereits ${main}.`,
  notBased: (variant: string, main: string) =>
    `${variant} basiert nicht auf ${main}, daher gibt es dort nichts zurückzusetzen oder wiederherzustellen.`,
  inheritedGroup: (group: string, variant: string, main: string) =>
    `${group} in ${variant} folgt ${main}, daher kann die Gruppierung nur in ${main} aufgehoben werden. Entfernen Sie sie stattdessen aus ${variant}.`,
  cantGroup: (variant: string) =>
    `Wählen Sie zum Gruppieren zwei oder mehr Regeln einer Ebene in ${variant}. Eine Untergruppe kann keine Gruppen enthalten.`,
  mainVariant: (main: string) => `${main} ist die Hauptvariante und kann nicht gelöscht werden.`,
  noCopyTarget: (rule: string) =>
    `Wählen Sie eine andere Variante, in die ${rule} kopiert werden soll.`,
});

export type EditMessages = (typeof EDIT_MESSAGES)['en'];

// The part after "{rule} in {branch}: " of each incomplete condition's message, by its
// `ConditionProblem`, its code (spec 009, R10)
const CONDITION_PROBLEM_MESSAGES_EN = {
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
} satisfies Record<ConditionProblem, unknown>;

// `CONDITION_PROBLEM_MESSAGES_EN` and the German, word for word as the server's in both languages
// (`rules_texts.py`'s `CONDITION_PROBLEMS`); the part before is the same in both
export const CONDITION_PROBLEM_MESSAGES = defineTexts<typeof CONDITION_PROBLEM_MESSAGES_EN>(
  CONDITION_PROBLEM_MESSAGES_EN,
  {
    choose_check: 'Wählen Sie eine Prüfung.',
    enter_number: 'Geben Sie eine Zahl ein.',
    enter_text: 'Geben Sie einen Text zum Vergleichen ein.',
    choose_value: 'Wählen Sie mindestens einen Wert.',
    values_from_list: 'Wählen Sie Werte aus der Liste.',
    value_once: 'Wählen Sie jeden Wert nur einmal.',
    enter_date: 'Geben Sie ein Datum ein.',
    years_at_least_1: 'Geben Sie mindestens 1 Jahr ein.',
    choose_unit: 'Wählen Sie Jahre oder Monate.',
    amount_at_least_1: (unit: 'years' | 'months') =>
      `Geben Sie mindestens 1 ${TIME_UNITS.de[unit].one} ein.`,
  }
);

export type ConditionProblemMessages = (typeof CONDITION_PROBLEM_MESSAGES)['en'];
