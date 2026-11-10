// Rules as readable statements (FR-005; F1, F2, F5, F7, F8, F32; spec 008 C3, FR-021), such as
// "Personal ID · Date of birth (Age) is at least 21 years old", for the rules step, the publish
// dialog and the details
import type { DocumentField } from '@connection-portal/api-types/document-types';
import type {
  Condition,
  RuleItem,
  RuleTarget,
} from '@connection-portal/api-types/form-connections';
import type { OptionSet } from '@connection-portal/api-types/option-sets';

import {
  conditionProblem,
  labelOf,
  operatorDefinition,
  optionsOf,
  resolveTarget,
  suffixOf,
} from './conditions';
import {
  DATE_OF_BIRTH_RULE_LABEL,
  NUMBER_OPERATOR_SYMBOLS,
  OPERATOR_LABELS,
  OPERATOR_SYMBOLS,
} from './constants';
import { countOf, formatDate } from './dates';
import { DEFAULT_LANGUAGE, defineTexts, type Language } from './language';
import type {
  ConditionKind,
  PredicateParts,
  ResolvedTarget,
  RuleContext,
  RuleDocument,
  Statement,
  StatementParts,
  StatementSymbol,
} from './types';

type YearsAgoOperator = 'at_least_years_ago' | 'less_than_years_ago' | 'exactly_years_ago';

// The statements' and predicates' templates, in each language (spec 009, R4; glossary G§3
// "operators", "date statements"). Names and labels are inserted as the context has them
export const STATEMENT_TEXTS = defineTexts<{
  /** "Personal ID · Date of birth (Age)" */
  subject: (document: string, data: string) => string;
  /** "Place of birth – City or town" */
  part: (field: string, part: string) => string;
  /** "Licence class B" */
  licenceClass: (code: string) => string;
  /** A text value as a chip: '"Stuttgart"', „Stuttgart“ */
  quoted: (text: string) => string;
  matchingCase: string;
  ignoringCase: string;
  /**
   * The years-ago operators' words on a date that isn't the Date of birth: German says "liegt
   * mindestens 2 Jahre zurück", where the age reads "ist mindestens 21 Jahre alt"
   */
  yearsAgoWords: Record<YearsAgoOperator, string>;
}>(
  {
    subject: (document, data) => `${document} · ${data}`,
    part: (field, part) => `${field} – ${part}`,
    licenceClass: (code) => `Licence class ${code}`,
    quoted: (text) => `"${text}"`,
    matchingCase: 'matching letter case',
    ignoringCase: 'ignoring letter case',
    yearsAgoWords: {
      at_least_years_ago: OPERATOR_LABELS.en.date.at_least_years_ago,
      less_than_years_ago: OPERATOR_LABELS.en.date.less_than_years_ago,
      exactly_years_ago: OPERATOR_LABELS.en.date.exactly_years_ago,
    },
  },
  {
    subject: (document, data) => `${document} · ${data}`,
    part: (field, part) => `${field} – ${part}`,
    licenceClass: (code) => `Führerscheinklasse ${code}`,
    quoted: (text) => `„${text}“`,
    matchingCase: 'Groß-/Kleinschreibung beachtet',
    ignoringCase: 'Groß-/Kleinschreibung ignoriert',
    yearsAgoWords: {
      at_least_years_ago: 'liegt mindestens',
      less_than_years_ago: 'liegt weniger als',
      exactly_years_ago: 'liegt genau',
    },
  }
);

/** "Licence class B" ("Führerscheinklasse B"), the name of one class's parts. */
export function licenceClassLabel(code: string, language: Language = DEFAULT_LANGUAGE): string {
  return STATEMENT_TEXTS[language].licenceClass(code);
}

/**
 * A field's name in the rules UI: "Date of birth (Age)" ("Geburtsdatum (Alter)") for the date of
 * birth (B7), the catalog's label otherwise. Messages, hints and validation keep `field.label`,
 * the citizen's wording.
 */
export function ruleFieldLabel(
  field: DocumentField,
  language: Language = DEFAULT_LANGUAGE
): string {
  return field.date_of_birth ? DATE_OF_BIRTH_RULE_LABEL[language] : field.label;
}

/**
 * What a resolved target checks, with "·" between the document and the data and "–" before a
 * part (spec 008 C3): "Personal ID · Place of birth – City or town", "Driving licence · Licence
 * class B – Issue date". A part named like its field, such as the classes held, adds nothing:
 * "Driving licence · Licence classes".
 */
export function subjectOfResolved(
  target: ResolvedTarget,
  language: Language = DEFAULT_LANGUAGE
): string {
  return STATEMENT_TEXTS[language].subject(target.document.label, dataOfResolved(target, language));
}

/**
 * What a resolved target checks within its document: "Date of birth (Age)", "Place of birth – City or
 * town", "Licence class B – Issue date", "Licence classes".
 */
export function dataOfResolved(
  { field, part, licenceClass }: ResolvedTarget,
  language: Language = DEFAULT_LANGUAGE
): string {
  const texts = STATEMENT_TEXTS[language];
  if (!part) {
    return ruleFieldLabel(field, language);
  }
  if (part.per_licence_class && licenceClass) {
    return texts.part(licenceClassLabel(licenceClass, language), part.label);
  }
  if (part.label === field.label) {
    return field.label;
  }
  return texts.part(field.label, part.label);
}

/** What a target checks, or null when it is missing or not in `documents`. */
export function subjectOf(
  target: RuleTarget | null,
  documents: RuleDocument[],
  language: Language = DEFAULT_LANGUAGE
): string | null {
  const resolved = resolveTarget(target, documents);
  return resolved ? subjectOfResolved(resolved, language) : null;
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

/**
 * The design's chip for a condition of a kind (≥, >, <, = or ≠), decoration only, or null: number
 * conditions and the relative date conditions have one.
 */
export function symbolOf(operator: string, kind: ConditionKind | null): StatementSymbol | null {
  if (kind === 'number') {
    return NUMBER_OPERATOR_SYMBOLS[operator] ?? null;
  }
  return kind === 'date' ? (OPERATOR_SYMBOLS[operator] ?? null) : null;
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
  optionSets: OptionSet[],
  language: Language = DEFAULT_LANGUAGE
): PredicateParts | null {
  const { kind } = target;
  if (!kind || !condition || conditionProblem(condition, kind) !== null) {
    return null;
  }
  const definition = operatorDefinition(condition.operator, kind);
  if (!definition) {
    return null;
  }
  const texts = STATEMENT_TEXTS[language];
  const parts = (
    values: string[],
    tail: string | null = null,
    words = labelOf(definition, language)
  ): PredicateParts => ({
    symbol: symbolOf(condition.operator, kind),
    words,
    values,
    tail,
  });
  switch (definition.input) {
    case 'number':
      return parts([String(condition.value)]);
    case 'text':
      return parts(
        [texts.quoted(String(condition.value).trim())],
        condition.match_case ? texts.matchingCase : texts.ignoringCase
      );
    case 'values':
      return parts(
        (condition.values ?? []).map((value) => optionLabel(optionSets, target.optionSet, value))
      );
    case 'date':
      return parts([formatDate(condition.date ?? '', language)]);
    case 'years': {
      const years = condition.years ?? 0;
      const value = `${years} ${suffixOf(definition, target.dateOfBirth, years, language)}`;
      return target.dateOfBirth
        ? parts([value])
        : parts([value], null, texts.yearsAgoWords[definition.operator as YearsAgoOperator]);
    }
    case 'amount': {
      const unit = condition.unit === 'months' ? 'months' : 'years';
      const amount = condition.amount ?? 0;
      return parts([
        `${countOf(amount, unit, language)} ${suffixOf(definition, false, amount, language)}`,
      ]);
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
  optionSets: OptionSet[],
  language: Language = DEFAULT_LANGUAGE
): string | null {
  const parts = predicatePartsOf(condition, target, optionSets, language);
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
  { documents, optionSets, language = DEFAULT_LANGUAGE }: RuleContext
): Statement | null {
  const target = resolveTarget(rule.target, documents);
  if (!target || (target.part?.per_licence_class && !target.licenceClass)) {
    return null;
  }
  const predicate = predicateOf(rule.condition, target, optionSets, language);
  if (!predicate) {
    return null;
  }
  const subject = subjectOfResolved(target, language);
  return {
    subject,
    predicate,
    symbol: symbolOf(rule.condition?.operator ?? '', target.kind),
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
  { documents, optionSets, language = DEFAULT_LANGUAGE }: RuleContext
): StatementParts | null {
  const target = resolveTarget(rule.target, documents);
  if (!target) {
    return null;
  }
  const classMissing = Boolean(target.part?.per_licence_class && !target.licenceClass);
  return {
    document: target.document.label,
    documentType: target.document.key,
    data: dataOfResolved(target, language),
    predicate: classMissing ? null : predicatePartsOf(rule.condition, target, optionSets, language),
  };
}
