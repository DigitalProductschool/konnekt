// The conditions a rule can check, by the kind of its target (FR-003, FR-006, FR-013;
// data-model.md, "Conditions")
import type { DocumentType } from '../../types/document-types';
import type {
  Condition,
  RequestedDocument,
  RequestedDocumentView,
  RuleTarget,
} from '../../types/form-connections';
import type { Option, OptionSet } from '../../types/option-sets';
import { OPERATORS } from './constants';
import { isValidIsoDate, isWholeCount } from './dates';
import type {
  ConditionKind,
  ConditionProblem,
  OperatorDefinition,
  ResolvedTarget,
  RuleDocument,
} from './types';

/** A connection's requested documents, as the rules modules look them up. */
export function ruleDocumentsOf(documents: RequestedDocumentView[]): RuleDocument[] {
  return documents.map((document) => ({
    key: document.document_type,
    label: document.label,
    fields: document.fields,
  }));
}

/**
 * The catalog's documents that the editor requests, each with only its requested fields, in the
 * catalog's order: what rules may check (FR-002).
 */
export function requestedRuleDocuments(
  documentTypes: DocumentType[],
  requested: RequestedDocument[]
): RuleDocument[] {
  return documentTypes.flatMap((documentType) => {
    const document = requested.find((entry) => entry.document_type === documentType.key);
    if (!document) {
      return [];
    }
    return [
      {
        key: documentType.key,
        label: documentType.label,
        fields: documentType.fields.filter((field) => document.fields.includes(field.key)),
      },
    ];
  });
}

/**
 * A target's document, field and part, looked up in `documents`, with the kind it compares.
 * Null when the target is missing or its document or field isn't there. A part or licence class
 * that the field doesn't have leaves `part` null.
 */
export function resolveTarget(
  target: RuleTarget | null,
  documents: RuleDocument[]
): ResolvedTarget | null {
  if (!target) {
    return null;
  }
  const document = documents.find((entry) => entry.key === target.document_type);
  const field = document?.fields.find((entry) => entry.key === target.field);
  if (!document || !field) {
    return null;
  }
  if (field.kind !== 'parts') {
    return {
      document,
      field,
      part: null,
      licenceClass: null,
      kind: field.kind === 'image' ? null : field.kind,
      optionSet: field.kind === 'enum' ? field.option_set : null,
      dateOfBirth: field.date_of_birth,
    };
  }
  const part = field.parts?.find((entry) => entry.key === target.part) ?? null;
  return {
    document,
    field,
    part,
    licenceClass: part?.per_licence_class ? target.licence_class : null,
    kind: part ? part.kind : null,
    optionSet: part?.kind === 'enum' ? part.option_set : null,
    dateOfBirth: false,
  };
}

/** The kind a target compares, or null for an image or a target that is incomplete or unknown. */
export function kindOfTarget(
  target: RuleTarget | null,
  documents: RuleDocument[]
): ConditionKind | null {
  return resolveTarget(target, documents)?.kind ?? null;
}

/** The operators of a kind, in the picker's order, with FR-003's words. */
export function operatorsFor(kind: ConditionKind): OperatorDefinition[] {
  return OPERATORS[kind];
}

/** An operator's definition within a kind, or undefined if the kind doesn't have it. */
export function operatorDefinition(
  operator: string,
  kind: ConditionKind
): OperatorDefinition | undefined {
  return OPERATORS[kind].find((definition) => definition.operator === operator);
}

/**
 * The words after a years-ago or from-now value: "years old" on the Date of birth, "years ago"
 * on every other date (F1), and "from now" (F2). Null for the other operators.
 */
export function suffixOf(
  definition: OperatorDefinition,
  dateOfBirth: boolean,
  amount = 2
): string | null {
  if (definition.input === 'years') {
    const unit = amount === 1 ? 'year' : 'years';
    return dateOfBirth ? `${unit} old` : `${unit} ago`;
  }
  return definition.input === 'amount' ? 'from now' : null;
}

/** The empty values of a new condition: text ignores letter case at first (FR-013). */
export function newCondition(definition: OperatorDefinition): Condition {
  const { operator } = definition;
  switch (definition.input) {
    case 'number':
      return { operator, value: null };
    case 'text':
      return { operator, value: '', match_case: false };
    case 'values':
      return { operator, values: [] };
    case 'date':
      return { operator, date: null };
    case 'years':
      return { operator, years: null };
    case 'amount':
      return { operator, amount: null, unit: 'years' };
  }
}

/**
 * A condition with another operator of the same kind, keeping the values that it takes too: a
 * text, the chosen values, a date, or a number of years (which a from-now condition takes in
 * years).
 */
export function changeOperator(
  condition: Condition | null,
  definition: OperatorDefinition
): Condition {
  const next = newCondition(definition);
  const previous = condition && operatorDefinition(condition.operator, definition.kind);
  if (!condition || !previous) {
    return next;
  }
  switch (definition.input) {
    case 'number':
      return previous.input === 'number' ? { ...next, value: condition.value } : next;
    case 'text':
      return previous.input === 'text'
        ? { ...next, value: condition.value, match_case: condition.match_case ?? false }
        : next;
    case 'values':
      return { ...next, values: condition.values ?? [] };
    case 'date':
      return previous.input === 'date' ? { ...next, date: condition.date } : next;
    case 'years':
      if (previous.input === 'years') {
        return { ...next, years: condition.years };
      }
      return previous.input === 'amount' && condition.unit === 'years'
        ? { ...next, years: condition.amount }
        : next;
    case 'amount':
      if (previous.input === 'amount') {
        return { ...next, amount: condition.amount, unit: condition.unit ?? next.unit };
      }
      return previous.input === 'years' ? { ...next, amount: condition.years } : next;
  }
}

/** The options of a value set, or null when the sets haven't loaded it. */
export function optionsOf(optionSets: OptionSet[], key: string | null): Option[] | null {
  return optionSets.find((set) => set.key === key)?.options ?? null;
}

/**
 * Why a condition of `kind` isn't complete, or null when it is (FR-006): a known operator of the
 * kind, a number, a text that isn't empty after trimming, one or more of the set's values without
 * duplicates, a valid date, or a whole number of years or months of at least 1. Without
 * `options`, enum values aren't checked against the set.
 */
export function conditionProblem(
  condition: Condition | null,
  kind: ConditionKind,
  options: Option[] | null = null
): ConditionProblem | null {
  const definition = condition && operatorDefinition(condition.operator, kind);
  if (!condition || !definition) {
    return 'choose_check';
  }
  switch (definition.input) {
    case 'number':
      return typeof condition.value === 'number' && Number.isFinite(condition.value)
        ? null
        : 'enter_number';
    case 'text':
      return typeof condition.value === 'string' && condition.value.trim() ? null : 'enter_text';
    case 'values':
      return valuesProblem(condition.values ?? [], options);
    case 'date':
      return isValidIsoDate(condition.date) ? null : 'enter_date';
    case 'years':
      return isWholeCount(condition.years) ? null : 'years_at_least_1';
    case 'amount':
      if (condition.unit !== 'years' && condition.unit !== 'months') {
        return 'choose_unit';
      }
      return isWholeCount(condition.amount) ? null : 'amount_at_least_1';
  }
}

function valuesProblem(
  values: (string | number)[],
  options: Option[] | null
): ConditionProblem | null {
  if (!values.length) {
    return 'choose_value';
  }
  if (options && values.some((value) => !options.some((option) => option.value === value))) {
    return 'values_from_list';
  }
  return new Set(values).size === values.length ? null : 'value_once';
}

/** Whether a condition is complete, so that the rule can be saved (FR-006). */
export function isComplete(
  condition: Condition | null,
  kind: ConditionKind | null,
  options: Option[] | null = null
): boolean {
  return kind !== null && conditionProblem(condition, kind, options) === null;
}
