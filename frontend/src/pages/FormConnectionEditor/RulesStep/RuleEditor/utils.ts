import type { DocumentField } from '@konnekt/api-types/document-types';
import type { Condition, RuleItem, RuleTarget } from '@konnekt/api-types/form-connections';
import type { OptionSet } from '@konnekt/api-types/option-sets';
import {
  conditionProblem,
  labelOf,
  operatorDefinition,
  operatorsFor,
  optionsOf,
  suffixOf,
} from '@konnekt/rules/conditions';
import { LICENCE_CLASSES_SET, RELATION_WORDS } from '@konnekt/rules/constants';
import { boundaryOf } from '@konnekt/rules/dates';
import { type Language, LANGUAGES } from '@konnekt/rules/language';
import { proposedMessage } from '@konnekt/rules/messages';
import { ruleFieldLabel, STATEMENT_TEXTS } from '@konnekt/rules/statements';
import type {
  ConditionKind,
  DateBoundary,
  OperatorDefinition,
  ResolvedTarget,
  RuleContext,
  RuleDocument,
} from '@konnekt/rules/types';
import { ruleProblem } from '@konnekt/rules/validation';

import drivingLicenceIcon from '../../../../assets/icons/driving-licence-ink.svg';
import personalIdIcon from '../../../../assets/icons/personal-id-ink.svg';
import type { ValuesPickerCopy } from '../../../../components/ValuesPicker/types';
import {
  CHECK_SYMBOLS,
  CHOICE_MENU_METRICS,
  CLASS_ISSUE_DATE_PART,
  EXPIRY_DATE_KEYS,
  INITIAL_RULE_EDITOR_STATE,
  NATIONALITIES_FIELD,
  RULE_EDITOR_COPY,
} from './constants';
import type {
  EditorControl,
  MenuChoice,
  MenuSection,
  MissingControlInput,
  RuleEditorAction,
  RuleEditorState,
  ValueField,
} from './types';

// The document glyphs of the pickers and the documents menu (Figma "Icon/Glyph", tone ink)
const DOCUMENT_ICONS: Record<string, string> = {
  pid: personalIdIcon,
  mdl: drivingLicenceIcon,
};

/**
 * Whether a message is the rule's proposed message in one of the languages (spec 009, R10, V8): a
 * proposal made in English stays a proposal under German, so that it follows the switch.
 */
export function isProposal(
  message: string,
  draft: Pick<RuleItem, 'target' | 'condition'>,
  context: RuleContext
): boolean {
  return LANGUAGES.some((language) => message === proposedMessage(draft, { ...context, language }));
}

/**
 * The editor's first state: a saved message follows its condition only if it is the proposal, in
 * any language; any other saved message is the team member's and is shown as saved (FR-007).
 */
export function initialRuleEditorState({
  draft,
  context,
}: {
  draft: RuleItem;
  context: RuleContext;
}): RuleEditorState {
  const message = draft.message.trim();
  return {
    ...INITIAL_RULE_EDITOR_STATE,
    messageEdited: message !== '' && !isProposal(message, draft, context),
  };
}

export function ruleEditorReducer(
  state: RuleEditorState,
  action: RuleEditorAction
): RuleEditorState {
  switch (action.type) {
    case 'openMenu':
      return { ...state, openMenu: action.menu, search: '' };
    case 'closeMenu':
      return {
        ...state,
        openMenu: null,
        search: '',
        // Closing the values menu with nothing chosen shows its problem (U24 6191:42259)
        touched: state.openMenu === 'values' ? { ...state.touched, values: true } : state.touched,
      };
    case 'search':
      return { ...state, search: action.text };
    case 'chooseDocument':
      return { ...state, document: action.document };
    case 'editMessage':
      return { ...state, messageEdited: action.edited };
    case 'type':
      return { ...state, typed: { ...state.typed, [action.field]: action.text } };
    case 'touch':
      return { ...state, touched: { ...state.touched, [action.field]: true } };
    case 'touchAll':
      return {
        ...state,
        touched: { value: true, years: true, amount: true, values: true, date: true },
        saveTried: true,
      };
    case 'resetValues':
      return { ...state, typed: {}, touched: {} };
  }
}

/** The document the editor shows: the target's, or the one chosen before its data. */
export function documentKeyOf(draft: RuleItem, state: RuleEditorState): string | null {
  return draft.target?.document_type ?? state.document;
}

function documentIcon(key: string): string | undefined {
  return DOCUMENT_ICONS[key];
}

/** The documents menu: the requested documents only (FR-002). */
export function documentSections(documents: RuleDocument[]): MenuSection[] {
  return [
    {
      key: 'documents',
      choices: documents.map((document) => ({
        key: document.key,
        label: document.label,
        icon: documentIcon(document.key),
      })),
    },
  ];
}

export function documentChoice(document: RuleDocument | undefined): MenuChoice | null {
  return document
    ? { key: document.key, label: document.label, icon: documentIcon(document.key) }
    : null;
}

/** The data menu: the requested fields, then the images as "Not for rules" (FR-002). */
export function dataSections(
  document: RuleDocument | undefined,
  language: Language
): MenuSection[] {
  const fields = document?.fields ?? [];
  const toChoice = (field: DocumentField): MenuChoice => ({
    key: field.key,
    label: ruleFieldLabel(field, language),
    unavailable: field.kind === 'image',
  });
  const sections: MenuSection[] = [
    { key: 'fields', choices: fields.filter((field) => field.kind !== 'image').map(toChoice) },
  ];
  const images = fields.filter((field) => field.kind === 'image');
  if (images.length) {
    sections.push({ key: 'images', choices: images.map(toChoice) });
  }
  return sections;
}

/** The texts of the values picker in the rule editor (FR-039): "Choose options", "Values" … */
export function valuesCopyOf(language: Language): ValuesPickerCopy {
  const copy = RULE_EDITOR_COPY[language];
  return {
    menu: copy.valuesMenu,
    placeholder: copy.chooseOptions,
    searchClasses: copy.searchClasses,
    searchOptions: copy.searchOptions,
    footer: copy.selectAtLeastOne,
    noMatch: copy.noMatch,
  };
}

/** The unit picker of a from-now condition: years or months (6350:42585). */
export function unitSections(language: Language): MenuSection[] {
  const copy = RULE_EDITOR_COPY[language];
  return [
    {
      key: 'units',
      choices: [
        { key: 'years', label: copy.years },
        { key: 'months', label: copy.months },
      ],
    },
  ];
}

/** The key of a part choice: the part, and a per-class part's class. */
export function partKeyOf(target: RuleTarget | null): string | null {
  if (!target?.part) {
    return null;
  }
  return target.licence_class ? `${target.part}:${target.licence_class}` : target.part;
}

/**
 * The part picker of a field made of parts (F5): the place of birth's three parts, or the
 * licence classes held and, for every class, its issue and expiry date.
 */
export function partSections(
  field: DocumentField,
  optionSets: OptionSet[],
  language: Language
): MenuSection[] {
  const parts = field.parts ?? [];
  const choices: MenuChoice[] = [];
  const classes = optionsOf(optionSets, LICENCE_CLASSES_SET) ?? [];
  for (const part of parts.filter((entry) => !entry.per_licence_class)) {
    choices.push({ key: part.key, label: part.label });
  }
  const perClass = parts.filter((entry) => entry.per_licence_class);
  for (const option of perClass.length ? classes : []) {
    for (const part of perClass) {
      choices.push({
        key: `${part.key}:${option.value}`,
        label: RULE_EDITOR_COPY[language].classPart(String(option.value), part.label),
      });
    }
  }
  return [{ key: 'parts', choices }];
}

/** The target of a part choice's key. */
export function targetOfPart(target: RuleTarget, key: string): RuleTarget {
  const [part, licenceClass] = key.split(':');
  return { ...target, part, licence_class: licenceClass ?? null };
}

/**
 * A check's words in the menus and the picker: the operator's label, and on a date that isn't the
 * Date of birth the years-ago words the statement uses ("liegt mindestens" before "2 Jahre
 * zurück", where the age reads "ist mindestens 21 Jahre alt"; the same words in English)
 */
export function checkLabelOf(
  definition: OperatorDefinition,
  dateOfBirth: boolean,
  language: Language
): string {
  if (definition.input === 'years' && !dateOfBirth) {
    const words: Record<string, string> = STATEMENT_TEXTS[language].yearsAgoWords;
    return words[definition.operator] ?? labelOf(definition, language);
  }
  return labelOf(definition, language);
}

function checkChoice(
  definition: OperatorDefinition,
  dateOfBirth: boolean,
  language: Language
): MenuChoice {
  return {
    key: definition.operator,
    label: checkLabelOf(definition, dateOfBirth, language),
    symbol:
      definition.kind === 'number' || definition.kind === 'date'
        ? CHECK_SYMBOLS[definition.operator]
        : null,
  };
}

/**
 * The check menu of a kind (FR-003). Dates, the Date of birth too, come in the sections "Time
 * ago", "Time from now" and "Fixed date" (U31 6985:50041; F34; CLAR 2026-11-08 #63: the Date of
 * birth keeps the baseline's fixed-date checks).
 */
export function checkSections(
  kind: ConditionKind,
  dateOfBirth: boolean,
  language: Language
): MenuSection[] {
  const copy = RULE_EDITOR_COPY[language];
  const toChoice = (definition: OperatorDefinition) =>
    checkChoice(definition, dateOfBirth, language);
  const definitions = operatorsFor(kind);
  if (kind !== 'date') {
    return [{ key: kind, choices: definitions.map(toChoice) }];
  }
  const inSection = (section: OperatorDefinition['section']) =>
    definitions.filter((definition) => definition.section === section).map(toChoice);
  return [
    { key: 'time_ago', heading: copy.timeAgoSection, choices: inSection('time_ago') },
    {
      key: 'time_from_now',
      heading: copy.timeFromNowSection,
      choices: inSection('time_from_now'),
    },
    { key: 'date', heading: copy.fixedDateSection, choices: inSection('date') },
  ];
}

export function checkChoiceOf(
  condition: Condition | null,
  kind: ConditionKind | null,
  dateOfBirth: boolean,
  language: Language
): MenuChoice | null {
  const definition = condition && kind ? operatorDefinition(condition.operator, kind) : undefined;
  return definition ? checkChoice(definition, dateOfBirth, language) : null;
}

/** The message follows the condition until the team member writes one (F9). */
export function withProposal(draft: RuleItem, context: RuleContext, edited: boolean): RuleItem {
  if (edited) {
    return draft;
  }
  return { ...draft, message: proposedMessage(draft, context) ?? '' };
}

/** Whether every part of the rule is there: its target, a complete check and a message. */
export function isRuleComplete(draft: RuleItem, branchName: string, context: RuleContext): boolean {
  return ruleProblem(draft, branchName, context) === null;
}

/** "21" → 21; anything else, also "1.5", isn't a count: null. */
export function parseCount(text: string): number | null {
  return /^\d+$/.test(text.trim()) ? Number(text.trim()) : null;
}

/** "180", "-2.5" or "2,5" → a number; anything else → null. */
export function parseNumber(text: string): number | null {
  const normalised = text.trim().replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(normalised)) {
    return null;
  }
  return Number(normalised);
}

/**
 * The problem of a value field to show under the check row, once that field was used (U25), or
 * null. Years and months take whole numbers of at least 1 (FR-003).
 */
export function fieldProblemOf(
  condition: Condition,
  definition: OperatorDefinition,
  optionSet: OptionSet | null,
  touched: RuleEditorState['touched'],
  language: Language
): { field: ValueField; message: string } | null {
  const copy = RULE_EDITOR_COPY[language];
  const problem = conditionProblem(condition, definition.kind, optionSet?.options ?? null);
  switch (definition.input) {
    case 'number':
      return touched.value && problem === 'enter_number'
        ? { field: 'value', message: copy.enterNumber }
        : null;
    case 'text':
      return touched.value && problem === 'enter_text'
        ? { field: 'value', message: copy.enterText }
        : null;
    case 'values':
      return touched.values && problem !== null
        ? { field: 'values', message: copy.selectAtLeastOne }
        : null;
    case 'date':
      return touched.date && problem === 'enter_date'
        ? { field: 'date', message: copy.enterDate }
        : null;
    case 'years':
      return touched.years && problem === 'years_at_least_1'
        ? { field: 'years', message: copy.enterCount }
        : null;
    case 'amount':
      return touched.amount && problem === 'amount_at_least_1'
        ? { field: 'amount', message: copy.enterCount }
        : null;
  }
}

/** An ISO date as the design writes it: '2005-10-23' → "23.10.2005" (cosmetic 3). */
export function dottedDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}.${month}.${year}`;
}

/**
 * A boundary in words, after "that means": "born on or before 23.10.2005" on the Date of birth,
 * "born between 24.10.2004 and 23.10.2005" for an exact age, "it expires on or after 23.04.2027"
 * on an expiry date, "on or before 23.10.2024" on any other date; in German "geboren am oder vor
 * dem 23.10.2005", "geboren zwischen dem 24.10.2004 und dem 23.10.2005", "Ablauf am oder nach dem
 * 23.04.2027", "am oder vor dem 23.10.2024" (glossary G§3 `RELATION_WORDS`).
 */
export function boundaryWords(
  boundary: DateBoundary,
  prefix: string | null,
  language: Language
): string {
  const phrase =
    boundary.relation === 'between'
      ? RULE_EDITOR_COPY[language].between(dottedDate(boundary.from), dottedDate(boundary.to))
      : `${RELATION_WORDS[language][boundary.relation]} ${dottedDate(boundary.date)}`;
  return prefix ? `${prefix} ${phrase}` : phrase;
}

/** The words before a date's boundary: the Date of birth's "born", an expiry date's "it expires". */
function boundaryPrefixOf(target: ResolvedTarget, language: Language): string | null {
  const copy = RULE_EDITOR_COPY[language];
  if (target.dateOfBirth) {
    return copy.bornPrefix;
  }
  return EXPIRY_DATE_KEYS.includes((target.part ?? target.field).key) ? copy.expiresPrefix : null;
}

/**
 * The counting note of a time-ago or from-now condition: from the day of sharing, or, on a
 * licence class's issue date, from the date the class was first issued (U32 6350:42724); with
 * today's example once the condition is complete.
 */
function countingNoteOf(
  target: ResolvedTarget,
  condition: Condition,
  today: string,
  language: Language
): string {
  const copy = RULE_EDITOR_COPY[language];
  const counted =
    target.licenceClass && target.part?.key === CLASS_ISSUE_DATE_PART
      ? copy.countedFromClassIssue(target.licenceClass)
      : copy.countedFrom;
  const boundary = boundaryOf(condition, today);
  return boundary
    ? `${counted} ${copy.todayMeans(
        dottedDate(today),
        boundaryWords(boundary, boundaryPrefixOf(target, language), language)
      )}`
    : counted;
}

/**
 * The missing-value note of a date condition: the checked date's, "If the date of birth is
 * missing …", or a licence class's, "If class B is missing …" (U32 6350:42726).
 */
function missingNoteOf(target: ResolvedTarget, language: Language): string {
  const copy = RULE_EDITOR_COPY[language];
  if (target.licenceClass) {
    return copy.classMissing(target.licenceClass);
  }
  return copy.missingValue((target.part ?? target.field).label);
}

/**
 * The notes under the check row (S10). A field made of parts: U31's hint until its part is
 * chosen. Dates: F34's hint until a check is chosen, then the notes, in error states too: the
 * counting note with today's example for a date counted from the day of sharing (the born-between
 * example for an exact age), "Citizens who turn 21 that day count." under an age of at least N
 * (F59), and the missing-value note for every date condition (U30, U32, U53). Text: the spaces
 * hint (F7). Enums: Nationality's (F30) and the licence classes' hints.
 */
export function hintsOf(
  target: ResolvedTarget,
  condition: Condition | null,
  today: string,
  language: Language
): string[] {
  const copy = RULE_EDITOR_COPY[language];
  if (target.field.kind === 'parts' && !target.part) {
    return [copy.partsHint(target.field.label)];
  }
  const definition =
    condition && target.kind ? operatorDefinition(condition.operator, target.kind) : undefined;
  switch (target.kind) {
    case 'date': {
      if (!condition || !definition) {
        return [copy.dateHint];
      }
      const hints: string[] = [];
      if (definition.section !== 'date') {
        hints.push(countingNoteOf(target, condition, today, language));
      }
      if (
        target.dateOfBirth &&
        condition.operator === 'at_least_years_ago' &&
        Number.isInteger(condition.years) &&
        (condition.years ?? 0) >= 1
      ) {
        hints.push(copy.turnsThatDay(condition.years ?? 0));
      }
      hints.push(missingNoteOf(target, language));
      return hints;
    }
    case 'text':
      return condition ? [copy.textHint] : [];
    case 'enum': {
      if (!condition) {
        return [];
      }
      if (`${target.document.key}.${target.field.key}` === NATIONALITIES_FIELD) {
        return [copy.nationalityHint];
      }
      if (target.optionSet === LICENCE_CLASSES_SET) {
        return [
          condition.operator === 'includes_none_of'
            ? copy.classesHintNoneOf
            : copy.classesHintOneOf,
        ];
      }
      return [];
    }
    default:
      return [];
  }
}

/**
 * The fixed words after a years-ago value: "years old" or "years ago", "1 year old" (F1); in
 * German "Jahre alt", "Jahre zurück", "1 Jahr alt".
 */
export function yearsSuffix(
  definition: OperatorDefinition,
  dateOfBirth: boolean,
  years: number | null,
  language: Language
) {
  return suffixOf(definition, dateOfBirth, years ?? 2, language) ?? '';
}

/**
 * A menu's height with every choice shown, before it opens (CHOICE_MENU_METRICS): the frame, the
 * search field, the list (each section's divider, heading and choices, 2px apart) and the
 * footer, with its divider. Its placement decides from this (utils/popupPlacement.ts)
 */
export function choiceMenuHeight(
  sections: MenuSection[],
  searchable: boolean,
  footer: 'none' | 'plain' | 'divided'
): number {
  const m = CHOICE_MENU_METRICS;
  const listParts: number[] = [];
  sections.forEach((section, index) => {
    if (index > 0) {
      listParts.push(m.divider);
    }
    if (section.heading) {
      listParts.push(m.heading);
    }
    for (const choice of section.choices) {
      listParts.push(choice.unavailable || choice.symbol ? m.tallRow : m.row);
    }
  });
  const list =
    listParts.reduce((sum, part) => sum + part, 0) + Math.max(listParts.length - 1, 0) * m.gap;
  const parts = [list];
  if (searchable) {
    parts.push(m.search);
  }
  if (footer === 'divided') {
    parts.push(m.divider);
  }
  if (footer !== 'none') {
    parts.push(m.footer);
  }
  return (
    m.frame + parts.reduce((sum, part) => sum + part, 0) + Math.max(parts.length - 1, 0) * m.gap
  );
}

/**
 * Moves the focus between a menu's choosable options: to `targetId`, or from the option
 * `fromId` by an arrow key, Home or End, or to the first one ('first'). Returns whether an option
 * got the focus.
 */
export function focusOption(
  list: HTMLElement | null,
  fromId: string | null,
  key: 'first' | 'ArrowDown' | 'ArrowUp' | 'Home' | 'End'
): boolean {
  const options = Array.from(
    list?.querySelectorAll<HTMLElement>('[role="option"]:not([aria-disabled="true"])') ?? []
  );
  if (!options.length) {
    return false;
  }
  const index = options.findIndex((option) => option.id === fromId);
  let next: HTMLElement | undefined;
  switch (key) {
    case 'first':
      next = index >= 0 ? options[index] : options[0];
      break;
    case 'Home':
      next = options[0];
      break;
    case 'End':
      next = options[options.length - 1];
      break;
    case 'ArrowDown':
      next = options[Math.min(index + 1, options.length - 1)];
      break;
    case 'ArrowUp':
      next = index > 0 ? options[index - 1] : undefined;
      break;
  }
  next?.focus();
  next?.scrollIntoView({ block: 'nearest' });
  return next !== undefined;
}

/**
 * The control that needs the team member first when "Save rule" is pressed on an incomplete rule,
 * in the order of the editor, so that the focus moves there (WCAG 3.3.1), or null when the rule
 * is complete: a picker without its choice, the value, or the message.
 */
export function missingControl(input: MissingControlInput): EditorControl | null {
  if (!input.document) {
    return 'document';
  }
  if (!input.target || input.unrequested) {
    return 'data';
  }
  if (input.partMissing) {
    return 'part';
  }
  if (!input.condition) {
    return 'check';
  }
  if (!input.conditionComplete) {
    return input.valuesInput ? 'values' : 'value';
  }
  return input.message.trim() === '' ? 'message' : null;
}
