// The error message the rule editor proposes once a condition is complete (FR-004; F9), in the
// design's words (spec 008 C3, FR-021): "You need to be at least 21 years old.", "You need to live
// in Stuttgart.", "You need a class B or BE licence.". A condition the design doesn't word, such
// as a negation or a plain field, keeps its sentence: "You must not live in Esslingen."
import type { Condition, RuleItem } from '@connection-portal/api-types/form-connections';

import { conditionProblem, optionsOf, resolveTarget } from './conditions';
import {
  EXPIRY_DATE_FIELDS,
  ISSUING_COUNTRY_FIELDS,
  LIVES_IN_COUNTRY_FIELDS,
  LIVES_IN_FIELDS,
  NATIONALITY_FIELDS,
  PLACE_OF_BIRTH_FIELD,
} from './constants';
import { formatDate } from './dates';
import { optionLabel } from './statements';
import type { ResolvedTarget, RuleContext } from './types';

/** "Expiry date" → "expiry date"; a leading acronym, such as "UN", stays as it is. */
export function lowerFirst(label: string): string {
  const second = label.charAt(1);
  if (second && second === second.toUpperCase() && second !== second.toLowerCase()) {
    return label;
  }
  return label.charAt(0).toLowerCase() + label.slice(1);
}

function upperFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "A", "A or B", "A, B or C". */
export function orList(items: string[]): string {
  if (items.length <= 1) {
    return items.join('');
  }
  return `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`;
}

function count(amount: number, unit: 'years' | 'months'): string {
  return `${amount} ${amount === 1 ? unit.slice(0, -1) : unit}`;
}

function keyOf({ document, field }: ResolvedTarget): string {
  return `${document.key}.${field.key}`;
}

/**
 * The proposed error message of a rule, which the team member may change (FR-004), or null while
 * its target or condition is incomplete. It describes the condition as entered: enum values by
 * their label, licence classes by their code (FR-005).
 */
export function proposedMessage(
  rule: Pick<RuleItem, 'target' | 'condition'>,
  { documents, optionSets }: RuleContext
): string | null {
  const target = resolveTarget(rule.target, documents);
  const { condition } = rule;
  if (!target?.kind || !condition) {
    return null;
  }
  if (target.part?.per_licence_class && !target.licenceClass) {
    return null;
  }
  const options = target.optionSet ? optionsOf(optionSets, target.optionSet) : null;
  if (conditionProblem(condition, target.kind, options) !== null) {
    return null;
  }
  switch (target.kind) {
    case 'number':
      return numberMessage(target, condition);
    case 'text':
      return textMessage(target, condition);
    case 'enum': {
      const labels = (condition.values ?? []).map((value) =>
        optionLabel(optionSets, target.optionSet, value)
      );
      return enumMessage(target, condition.operator === 'includes_none_of', labels);
    }
    case 'date':
      return dateMessage(target, condition);
  }
}

function numberMessage(target: ResolvedTarget, condition: Condition): string {
  const subject = `Your ${lowerFirst(target.field.label)}`;
  const value = String(condition.value);
  switch (condition.operator) {
    case 'greater_than':
      return `${subject} must be greater than ${value}.`;
    case 'less_than':
      return `${subject} must be less than ${value}.`;
    case 'not_equal_to':
      return `${subject} must not be ${value}.`;
    default:
      return `${subject} must be ${value}.`;
  }
}

function textMessage(target: ResolvedTarget, condition: Condition): string {
  const value = String(condition.value).trim();
  const negated = condition.operator === 'not_equal_to';
  if (condition.operator === 'equal_to' || negated) {
    if (LIVES_IN_FIELDS.has(keyOf(target))) {
      return negated ? `You must not live in ${value}.` : `You need to live in ${value}.`;
    }
    if (keyOf(target) === PLACE_OF_BIRTH_FIELD) {
      return negated
        ? `You must not have been born in ${value}.`
        : `You need to be born in ${value}.`;
    }
  }
  const subject = target.part
    ? `The ${lowerFirst(target.part.label)} of your ${lowerFirst(target.field.label)}`
    : `Your ${lowerFirst(target.field.label)}`;
  switch (condition.operator) {
    case 'not_equal_to':
      return `${subject} must not be "${value}".`;
    case 'contains':
      return `${subject} must contain "${value}".`;
    case 'not_contains':
      return `${subject} must not contain "${value}".`;
    default:
      return `${subject} must be "${value}".`;
  }
}

function enumMessage(target: ResolvedTarget, none: boolean, labels: string[]): string {
  const values = orList(labels);
  const not = none ? 'not ' : '';
  const key = keyOf(target);
  if (target.part?.key === 'classes') {
    return none
      ? `You must not hold a class ${values} licence.`
      : `You need a class ${values} licence.`;
  }
  if (key === PLACE_OF_BIRTH_FIELD) {
    return none ? `You must not have been born in ${values}.` : `You need to be born in ${values}.`;
  }
  if (NATIONALITY_FIELDS.has(key)) {
    return none
      ? `You must not be a national of ${values}.`
      : `You need the nationality of ${values}.`;
  }
  if (LIVES_IN_COUNTRY_FIELDS.has(key)) {
    return none ? `You must not live in ${values}.` : `You need to live in ${values}.`;
  }
  if (ISSUING_COUNTRY_FIELDS.has(key)) {
    const document = lowerFirst(target.document.label);
    return none
      ? `Your ${document} must not have been issued in ${values}.`
      : `You need a ${document} issued in ${values}.`;
  }
  return `Your ${lowerFirst(target.field.label)} must ${not}be ${values}.`;
}

function dateMessage(target: ResolvedTarget, condition: Condition): string {
  const { operator } = condition;
  const years = count(condition.years ?? 0, 'years');
  const amount = count(condition.amount ?? 0, condition.unit === 'months' ? 'months' : 'years');
  // "6 more months", "1 more year": the design's validity (U42, U66)
  const moreAmount = amount.replace(' ', ' more ');
  const date = condition.date ? formatDate(condition.date) : '';
  const licenceClass = target.part?.per_licence_class ? target.licenceClass : null;

  if (target.dateOfBirth) {
    switch (operator) {
      case 'at_least_years_ago':
        return `You need to be at least ${years} old.`;
      case 'less_than_years_ago':
        return `You need to be under ${years} old.`;
      case 'exactly_years_ago':
        return `You need to be exactly ${years} old.`;
      case 'before':
      case 'after':
      case 'on':
        return `You need to be born ${operator} ${date}.`;
    }
  }
  if (licenceClass && target.part?.key === 'issue_date') {
    const held = `You need to have held a class ${licenceClass} ${lowerFirst(target.document.label)}`;
    switch (operator) {
      case 'at_least_years_ago':
        return `${held} for at least ${years}.`;
      case 'less_than_years_ago':
        return `${held} for less than ${years}.`;
      case 'exactly_years_ago':
        return `${held} for exactly ${years}.`;
    }
  }
  const expiry = target.part?.key === 'expiry_date' || EXPIRY_DATE_FIELDS.has(keyOf(target));
  if (expiry) {
    const holder = licenceClass
      ? `You need a class ${licenceClass} licence`
      : `You need a ${lowerFirst(target.document.label)}`;
    if (operator === 'at_least_from_now') {
      return `${holder} that’s valid for at least ${moreAmount}.`;
    }
    if (operator === 'less_than_from_now') {
      return `${holder} that expires in less than ${amount}.`;
    }
  }

  const subject = upperFirst(
    licenceClass && target.part
      ? `the ${lowerFirst(target.part.label)} of your class ${licenceClass}`
      : `the ${lowerFirst(target.field.label)} of your ${lowerFirst(target.document.label)}`
  );
  switch (operator) {
    case 'before':
    case 'after':
      return `${subject} must be ${operator} ${date}.`;
    case 'on':
      return `${subject} must be ${date}.`;
    case 'at_least_years_ago':
      return `${subject} must be at least ${years} ago.`;
    case 'less_than_years_ago':
      return `${subject} must be less than ${years} ago.`;
    case 'exactly_years_ago':
      return `${subject} must be exactly ${years} ago.`;
    case 'at_least_from_now':
      return `${subject} must be at least ${amount} from now.`;
    default:
      return `${subject} must be less than ${amount} from now.`;
  }
}
