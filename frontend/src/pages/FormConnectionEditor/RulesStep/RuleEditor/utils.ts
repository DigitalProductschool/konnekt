import type { DocumentField } from '@connection-portal/api-types/document-types';
import type {
  Condition,
  RuleItem,
  RuleTarget,
} from '@connection-portal/api-types/form-connections';
import type { OptionSet } from '@connection-portal/api-types/option-sets';
import {
  conditionProblem,
  operatorDefinition,
  operatorsFor,
  optionsOf,
  suffixOf,
} from '@connection-portal/rules/conditions';
import { LICENCE_CLASSES_SET, RELATION_WORDS } from '@connection-portal/rules/constants';
import { boundaryOf } from '@connection-portal/rules/dates';
import { lowerFirst, proposedMessage } from '@connection-portal/rules/messages';
import { ruleFieldLabel } from '@connection-portal/rules/statements';
import type {
  ConditionKind,
  DateBoundary,
  OperatorDefinition,
  ResolvedTarget,
  RuleContext,
  RuleDocument,
} from '@connection-portal/rules/types';
import { ruleProblem } from '@connection-portal/rules/validation';

import drivingLicenceIcon from '../../../../assets/icons/driving-licence-ink.svg';
import personalIdIcon from '../../../../assets/icons/personal-id-ink.svg';
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

/** The editor's first state: a saved message follows its condition only if it is the proposal. */
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
    messageEdited: message !== '' && message !== proposedMessage(draft, context),
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
export function dataSections(document: RuleDocument | undefined): MenuSection[] {
  const fields = document?.fields ?? [];
  const toChoice = (field: DocumentField): MenuChoice => ({
    key: field.key,
    label: ruleFieldLabel(field),
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
export function partSections(field: DocumentField, optionSets: OptionSet[]): MenuSection[] {
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
        label: RULE_EDITOR_COPY.classPart(String(option.value), part.label),
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

function checkChoice(definition: OperatorDefinition): MenuChoice {
  return {
    key: definition.operator,
    label: definition.label,
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
export function checkSections(kind: ConditionKind): MenuSection[] {
  const definitions = operatorsFor(kind);
  if (kind !== 'date') {
    return [{ key: kind, choices: definitions.map(checkChoice) }];
  }
  const inSection = (section: OperatorDefinition['section']) =>
    definitions.filter((definition) => definition.section === section).map(checkChoice);
  return [
    { key: 'time_ago', heading: RULE_EDITOR_COPY.timeAgoSection, choices: inSection('time_ago') },
    {
      key: 'time_from_now',
      heading: RULE_EDITOR_COPY.timeFromNowSection,
      choices: inSection('time_from_now'),
    },
    { key: 'date', heading: RULE_EDITOR_COPY.fixedDateSection, choices: inSection('date') },
  ];
}

export function checkChoiceOf(
  condition: Condition | null,
  kind: ConditionKind | null
): MenuChoice | null {
  const definition = condition && kind ? operatorDefinition(condition.operator, kind) : undefined;
  return definition ? checkChoice(definition) : null;
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
  touched: RuleEditorState['touched']
): { field: ValueField; message: string } | null {
  const problem = conditionProblem(condition, definition.kind, optionSet?.options ?? null);
  switch (definition.input) {
    case 'number':
      return touched.value && problem === 'enter_number'
        ? { field: 'value', message: RULE_EDITOR_COPY.enterNumber }
        : null;
    case 'text':
      return touched.value && problem === 'enter_text'
        ? { field: 'value', message: RULE_EDITOR_COPY.enterText }
        : null;
    case 'values':
      return touched.values && problem !== null
        ? { field: 'values', message: RULE_EDITOR_COPY.selectAtLeastOne }
        : null;
    case 'date':
      return touched.date && problem === 'enter_date'
        ? { field: 'date', message: RULE_EDITOR_COPY.enterDate }
        : null;
    case 'years':
      return touched.years && problem === 'years_at_least_1'
        ? { field: 'years', message: RULE_EDITOR_COPY.enterCount }
        : null;
    case 'amount':
      return touched.amount && problem === 'amount_at_least_1'
        ? { field: 'amount', message: RULE_EDITOR_COPY.enterCount }
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
 * on an expiry date, "on or before 23.10.2024" on any other date.
 */
export function boundaryWords(boundary: DateBoundary, prefix: string | null): string {
  const phrase =
    boundary.relation === 'between'
      ? `between ${dottedDate(boundary.from)} and ${dottedDate(boundary.to)}`
      : `${RELATION_WORDS[boundary.relation]} ${dottedDate(boundary.date)}`;
  return prefix ? `${prefix} ${phrase}` : phrase;
}

/** The words before a date's boundary: the Date of birth's "born", an expiry date's "it expires". */
function boundaryPrefixOf(target: ResolvedTarget): string | null {
  if (target.dateOfBirth) {
    return RULE_EDITOR_COPY.bornPrefix;
  }
  return EXPIRY_DATE_KEYS.includes((target.part ?? target.field).key)
    ? RULE_EDITOR_COPY.expiresPrefix
    : null;
}

/**
 * The counting note of a time-ago or from-now condition: from the day of sharing, or, on a
 * licence class's issue date, from the date the class was first issued (U32 6350:42724); with
 * today's example once the condition is complete.
 */
function countingNoteOf(target: ResolvedTarget, condition: Condition, today: string): string {
  const counted =
    target.licenceClass && target.part?.key === CLASS_ISSUE_DATE_PART
      ? RULE_EDITOR_COPY.countedFromClassIssue(target.licenceClass)
      : RULE_EDITOR_COPY.countedFrom;
  const boundary = boundaryOf(condition, today);
  return boundary
    ? `${counted} ${RULE_EDITOR_COPY.todayMeans(
        dottedDate(today),
        boundaryWords(boundary, boundaryPrefixOf(target))
      )}`
    : counted;
}

/**
 * The missing-value note of a date condition: the checked date's, "If the date of birth is
 * missing …", or a licence class's, "If class B is missing …" (U32 6350:42726).
 */
function missingNoteOf(target: ResolvedTarget): string {
  if (target.licenceClass) {
    return RULE_EDITOR_COPY.classMissing(target.licenceClass);
  }
  return RULE_EDITOR_COPY.missingValue(lowerFirst((target.part ?? target.field).label));
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
  today: string
): string[] {
  if (target.field.kind === 'parts' && !target.part) {
    return [RULE_EDITOR_COPY.partsHint(target.field.label)];
  }
  const definition =
    condition && target.kind ? operatorDefinition(condition.operator, target.kind) : undefined;
  switch (target.kind) {
    case 'date': {
      if (!condition || !definition) {
        return [RULE_EDITOR_COPY.dateHint];
      }
      const hints: string[] = [];
      if (definition.section !== 'date') {
        hints.push(countingNoteOf(target, condition, today));
      }
      if (
        target.dateOfBirth &&
        condition.operator === 'at_least_years_ago' &&
        Number.isInteger(condition.years) &&
        (condition.years ?? 0) >= 1
      ) {
        hints.push(RULE_EDITOR_COPY.turnsThatDay(condition.years ?? 0));
      }
      hints.push(missingNoteOf(target));
      return hints;
    }
    case 'text':
      return condition ? [RULE_EDITOR_COPY.textHint] : [];
    case 'enum': {
      if (!condition) {
        return [];
      }
      if (`${target.document.key}.${target.field.key}` === NATIONALITIES_FIELD) {
        return [RULE_EDITOR_COPY.nationalityHint];
      }
      if (target.optionSet === LICENCE_CLASSES_SET) {
        return [
          condition.operator === 'includes_none_of'
            ? RULE_EDITOR_COPY.classesHintNoneOf
            : RULE_EDITOR_COPY.classesHintOneOf,
        ];
      }
      return [];
    }
    default:
      return [];
  }
}

/** The fixed words after a years-ago value: "years old" or "years ago", "1 year old" (F1). */
export function yearsSuffix(
  definition: OperatorDefinition,
  dateOfBirth: boolean,
  years: number | null
) {
  return suffixOf(definition, dateOfBirth, years ?? 2) ?? '';
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
