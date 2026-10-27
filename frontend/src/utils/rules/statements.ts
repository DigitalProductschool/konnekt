// Rules as readable statements (FR-005; F1, F2, F5, F7, F8, F32), such as "Personal ID – Date of
// birth (Age) is at least 21 years old", for the rules step, the publish dialog and the details
import type { DocumentField } from '../../types/document-types';
import type { Condition, RuleItem, RuleTarget } from '../../types/form-connections';
import type { OptionSet } from '../../types/option-sets';
import {
  conditionProblem,
  operatorDefinition,
  optionsOf,
  resolveTarget,
  suffixOf,
} from './conditions';
import { DATE_OF_BIRTH_RULE_LABEL, OPERATOR_SYMBOLS } from './constants';
import { formatDate } from './dates';
import type {
  PredicateParts,
  ResolvedTarget,
  RuleContext,
  RuleDocument,
  Statement,
  StatementParts,
  StatementSymbol,
} from './types';

/** "Licence class B", the name of one class's parts. */
export function licenceClassLabel(code: string): string {
  return `Licence class ${code}`;
}

/**
 * A field's name in the rules UI: "Date of birth (Age)" for the date of birth (B7), the catalog's
 * label otherwise. Messages, hints and validation keep `field.label`, the citizen's wording.
 */
export function ruleFieldLabel(field: DocumentField): string {
  return field.date_of_birth ? DATE_OF_BIRTH_RULE_LABEL : field.label;
}

/**
 * What a resolved target checks, with "–" between the document, the field and the part:
 * "Personal ID – Place of birth – City or town", "Driving licence – Licence class B – Issue date".
 * A part named like its field, such as the classes held, adds nothing: "Driving licence – Licence
 * classes".
 */
export function subjectOfResolved(target: ResolvedTarget): string {
  return `${target.document.label} – ${dataOfResolved(target)}`;
}

/**
 * What a resolved target checks within its document: "Date of birth (Age)", "Place of birth – City or
 * town", "Licence class B – Issue date", "Licence classes".
 */
export function dataOfResolved({ field, part, licenceClass }: ResolvedTarget): string {
  if (!part) {
    return ruleFieldLabel(field);
  }
  if (part.per_licence_class && licenceClass) {
    return `${licenceClassLabel(licenceClass)} – ${part.label}`;
  }
  if (part.label === field.label) {
    return field.label;
  }
  return `${field.label} – ${part.label}`;
}

/** What a target checks, or null when it is missing or not in `documents`. */
export function subjectOf(target: RuleTarget | null, documents: RuleDocument[]): string | null {
  const resolved = resolveTarget(target, documents);
  return resolved ? subjectOfResolved(resolved) : null;
}

/** The label of an enum value; a value outside its set reads as it is. */
export function optionLabel(
  optionSets: OptionSet[],
  setKey: string | null,
  value: string | number
): string {
  const option = optionsOf(optionSets, setKey)?.find((entry) => entry.value === value);
  return option ? option.label : String(value);
}

/** The design's chip for a condition (≥, < or =), decoration only, or null. */
export function symbolOf(operator: string): StatementSymbol | null {
  return OPERATOR_SYMBOLS[operator] ?? null;
}

function count(amount: number, unit: 'year' | 'month'): string {
  return `${amount} ${amount === 1 ? unit : `${unit}s`}`;
}

/**
 * A complete condition split for display: FR-003's words and the values, each value a chip of
 * the design ("21 years old", "B", '"Stuttgart"'), and what follows them. Enum values read by
 * their label; the licence classes' labels are their codes. Null when the condition is
 * incomplete or doesn't fit the target's kind.
 */
export function predicatePartsOf(
  condition: Condition | null,
  target: ResolvedTarget,
  optionSets: OptionSet[]
): PredicateParts | null {
  const { kind } = target;
  if (!kind || !condition || conditionProblem(condition, kind) !== null) {
    return null;
  }
  const definition = operatorDefinition(condition.operator, kind);
  if (!definition) {
    return null;
  }
  const parts = (values: string[], tail: string | null = null): PredicateParts => ({
    symbol: symbolOf(condition.operator),
    words: definition.label,
    values,
    tail,
  });
  switch (definition.input) {
    case 'number':
      return parts([String(condition.value)]);
    case 'text':
      return parts(
        [`"${String(condition.value).trim()}"`],
        condition.match_case ? 'matching letter case' : 'ignoring letter case'
      );
    case 'values':
      return parts(
        (condition.values ?? []).map((value) => optionLabel(optionSets, target.optionSet, value))
      );
    case 'date':
      return parts([formatDate(condition.date ?? '')]);
    case 'years': {
      const years = condition.years ?? 0;
      return parts([`${years} ${suffixOf(definition, target.dateOfBirth, years)}`]);
    }
    case 'amount': {
      const unit = condition.unit === 'months' ? 'month' : 'year';
      return parts([`${count(condition.amount ?? 0, unit)} from now`]);
    }
  }
}

/**
 * A complete condition in FR-003's words, for a resolved target: "is at least 21 years old",
 * "includes one of B, BE", "is equal to "Stuttgart", ignoring letter case". Enum values read by
 * their label; the licence classes' labels are their codes. Null when the condition is
 * incomplete or doesn't fit the target's kind.
 */
export function predicateOf(
  condition: Condition | null,
  target: ResolvedTarget,
  optionSets: OptionSet[]
): string | null {
  const parts = predicatePartsOf(condition, target, optionSets);
  if (!parts) {
    return null;
  }
  const predicate = `${parts.words} ${parts.values.join(', ')}`;
  return parts.tail ? `${predicate}, ${parts.tail}` : predicate;
}

/**
 * A rule's statement (FR-005), or null while its target can't be found in the context's
 * documents or its condition is incomplete. Pass the whole catalog as the documents, so that a
 * rule on data no longer requested still reads.
 */
export function statementOf(
  rule: Pick<RuleItem, 'target' | 'condition'>,
  { documents, optionSets }: RuleContext
): Statement | null {
  const target = resolveTarget(rule.target, documents);
  if (!target || (target.part?.per_licence_class && !target.licenceClass)) {
    return null;
  }
  const predicate = predicateOf(rule.condition, target, optionSets);
  if (!predicate) {
    return null;
  }
  const subject = subjectOfResolved(target);
  return {
    subject,
    predicate,
    symbol: symbolOf(rule.condition?.operator ?? ''),
    text: `${subject} ${predicate}`,
  };
}

/**
 * A rule's statement split as the rule row lays it out, or null while its target can't be found
 * in the context's documents. Unlike `statementOf`, an incomplete condition still gives the
 * document and the data, with a null `predicate`, so that a rule kept incomplete still reads as
 * far as it goes. Join the parts with `statementOf`'s text for assistive technologies.
 */
export function statementPartsOf(
  rule: Pick<RuleItem, 'target' | 'condition'>,
  { documents, optionSets }: RuleContext
): StatementParts | null {
  const target = resolveTarget(rule.target, documents);
  if (!target) {
    return null;
  }
  const classMissing = Boolean(target.part?.per_licence_class && !target.licenceClass);
  return {
    document: target.document.label,
    documentType: target.document.key,
    data: dataOfResolved(target),
    predicate: classMissing ? null : predicatePartsOf(rule.condition, target, optionSets),
  };
}
