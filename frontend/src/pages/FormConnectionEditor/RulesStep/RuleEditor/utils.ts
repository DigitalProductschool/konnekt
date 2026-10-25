import drivingLicenceIcon from '../../../../assets/icons/driving-licence-ink.svg';
import personalIdIcon from '../../../../assets/icons/personal-id-ink.svg';
import type { DocumentField } from '../../../../types/document-types';
import type { Condition, RuleItem, RuleTarget } from '../../../../types/form-connections';
import type { OptionSet } from '../../../../types/option-sets';
import {
  conditionProblem,
  operatorDefinition,
  operatorsFor,
  optionsOf,
  resolveTarget,
  suffixOf,
} from '../../../../utils/rules/conditions';
import { LICENCE_CLASSES_SET } from '../../../../utils/rules/constants';
import { boundaryOf, boundaryPhrase, formatDate } from '../../../../utils/rules/dates';
import { lowerFirst, proposedMessage } from '../../../../utils/rules/messages';
import type {
  ConditionKind,
  OperatorDefinition,
  ResolvedTarget,
  RuleContext,
  RuleDocument,
} from '../../../../utils/rules/types';
import { ruleProblem } from '../../../../utils/rules/validation';
import {
  CHECK_SYMBOLS,
  INITIAL_RULE_EDITOR_STATE,
  NATIONALITIES_FIELD,
  RULE_EDITOR_COPY,
} from './constants';
import type {
  MenuChoice,
  MenuSection,
  RuleEditorAction,
  RuleEditorState,
  ValueChoice,
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

/** The data menu: the requested fields, then the images as "Can't be checked" (FR-002). */
export function dataSections(document: RuleDocument | undefined): MenuSection[] {
  const fields = document?.fields ?? [];
  const toChoice = (field: DocumentField): MenuChoice => ({
    key: field.key,
    label: field.label,
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
 * The check menu of a kind (FR-003). Dates come in sections (F3): on the Date of birth "Age",
 * "Time from now" and "Date of birth" as in U11; on other dates "Time ago", "Time from now" and
 * "Fixed date" as in U30.
 */
export function checkSections(kind: ConditionKind, dateOfBirth: boolean): MenuSection[] {
  const definitions = operatorsFor(kind);
  if (kind !== 'date') {
    return [{ key: kind, choices: definitions.map(checkChoice) }];
  }
  const inSection = (section: OperatorDefinition['section']) =>
    definitions.filter((definition) => definition.section === section).map(checkChoice);
  return [
    {
      key: 'time_ago',
      heading: dateOfBirth ? RULE_EDITOR_COPY.ageSection : RULE_EDITOR_COPY.timeAgoSection,
      choices: inSection('time_ago'),
    },
    {
      key: 'time_from_now',
      heading: RULE_EDITOR_COPY.timeFromNowSection,
      choices: inSection('time_from_now'),
    },
    {
      key: 'date',
      heading: dateOfBirth
        ? RULE_EDITOR_COPY.dateOfBirthSection
        : RULE_EDITOR_COPY.fixedDateSection,
      choices: inSection('date'),
    },
  ];
}

export function checkChoiceOf(
  condition: Condition | null,
  kind: ConditionKind | null
): MenuChoice | null {
  const definition = condition && kind ? operatorDefinition(condition.operator, kind) : undefined;
  return definition ? checkChoice(definition) : null;
}

/** A value set's options for the values menu; licence classes show code and description. */
export function valueChoices(optionSet: OptionSet | null): ValueChoice[] {
  return (optionSet?.options ?? []).map((option) => ({
    value: option.value,
    label: option.label,
    description: option.description,
  }));
}

/** Whether a choice matches a menu's search, ignoring letter case. */
export function matchesSearch(text: string, search: string): boolean {
  return text.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
}

/** The message follows the condition until the team member writes one (F9). */
export function withProposal(draft: RuleItem, context: RuleContext, edited: boolean): RuleItem {
  if (edited) {
    return draft;
  }
  return { ...draft, message: proposedMessage(draft, context) ?? '' };
}

/**
 * The rule with a new target. Its condition stays when the new target compares the same kind of
 * value from the same set, otherwise the check is chosen again.
 */
export function withTarget(
  draft: RuleItem,
  target: RuleTarget | null,
  context: RuleContext
): RuleItem {
  const before = resolveTarget(draft.target, context.documents);
  const after = resolveTarget(target, context.documents);
  const keep =
    before !== null &&
    after !== null &&
    after.kind !== null &&
    before.kind === after.kind &&
    before.optionSet === after.optionSet &&
    draft.condition !== null &&
    operatorDefinition(draft.condition.operator, after.kind) !== undefined;
  return { ...draft, target, condition: keep ? draft.condition : null };
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

/** What a date condition's missing-value note calls the checked date: "date of birth". */
function checkedDateOf(target: ResolvedTarget): string {
  if (target.part && target.licenceClass) {
    return RULE_EDITOR_COPY.classOf(lowerFirst(target.part.label), target.licenceClass);
  }
  return lowerFirst((target.part ?? target.field).label);
}

/**
 * The notes under the check row (S3). Dates: F3's hint until a check is chosen, then F4's notes,
 * in error states too: the counting note with today's example for a date counted from the day of
 * sharing, and the missing-value note for every date condition; a class's dates add the class
 * note. Text: the spaces hint (F7). Enums: Nationality's (F30) and the licence classes' hints.
 */
export function hintsOf(
  target: ResolvedTarget,
  condition: Condition | null,
  today: string
): string[] {
  const definition =
    condition && target.kind ? operatorDefinition(condition.operator, target.kind) : undefined;
  switch (target.kind) {
    case 'date': {
      if (!condition || !definition) {
        return [RULE_EDITOR_COPY.dateHint];
      }
      const hints: string[] = [];
      if (definition.section !== 'date') {
        const boundary = boundaryOf(condition, today);
        hints.push(
          boundary
            ? `${RULE_EDITOR_COPY.countedFrom} ${RULE_EDITOR_COPY.todayMeans(
                formatDate(today),
                boundaryPhrase(boundary, target.dateOfBirth)
              )}`
            : RULE_EDITOR_COPY.countedFrom
        );
      }
      hints.push(RULE_EDITOR_COPY.missingValue(checkedDateOf(target)));
      if (target.licenceClass) {
        hints.push(RULE_EDITOR_COPY.classMissing(target.licenceClass));
      }
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

/** The labels of the chosen values: licence classes by their code (F32). */
export function chosenValueLabels(
  values: (string | number)[],
  choices: ValueChoice[]
): { value: string | number; label: string }[] {
  return values.map((value) => ({
    value,
    label: choices.find((choice) => choice.value === value)?.label ?? String(value),
  }));
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
