// The error message the rule editor proposes once a condition is complete (FR-004; F9), in the
// design's words (spec 008 C3, FR-021): "You need to be at least 21 years old.", "You need to live
// in Stuttgart.", "You need a class B or BE licence.". A condition the design doesn't word, such
// as a negation or a plain field, keeps its sentence: "You must not live in Esslingen." In the
// context's language (spec 009, R4): "Sie müssen mindestens 21 Jahre alt sein."
import type { Condition, RuleItem } from '@connection-portal/api-types/form-connections';

import { conditionProblem, optionsOf, resolveTarget } from './conditions';
import {
  EXPIRY_DATE_FIELDS,
  ISSUING_COUNTRY_FIELDS,
  LIVES_IN_COUNTRY_FIELDS,
  LIVES_IN_FIELDS,
  NATIONALITY_FIELDS,
  PLACE_OF_BIRTH_FIELD,
  RELATION_WORDS,
} from './constants';
import { countOf, formatDate } from './dates';
import { DEFAULT_LANGUAGE, defineTexts, type Language } from './language';
import { optionLabel } from './statements';
import type { ResolvedTarget, RuleContext, RuleDocument } from './types';

/** "Expiry date" → "expiry date"; a leading acronym, such as "UN", stays as it is. English only. */
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

type Unit = 'years' | 'months';
type FixedDateOperator = 'before' | 'after' | 'on';
type Gender = 'm' | 'f' | 'n';

// The grammatical gender of the catalog's German labels (glossary G§4), which the German messages
// need for "Ihr" / "Ihre", "der" / "die" / "das" and the genitive: fields by their key, parts by
// `{field}.{part}`, documents by theirs. A label that starts with an adjective ("Ausstellende
// Behörde") or names two things ("Bundesland oder Region") isn't here: the messages name it as
// "Das Feld „…“" instead, as they do any field the catalog adds later
const GERMAN_FIELD_GENDERS: Record<string, Gender> = {
  family_name: 'm',
  given_name: 'm',
  birthdate: 'n',
  birth_date: 'n',
  place_of_birth: 'm',
  'place_of_birth.country': 'n',
  'place_of_birth.region': 'f',
  'place_of_birth.locality': 'm',
  nationalities: 'f',
  nationality: 'f',
  address_formatted: 'f',
  address_street_address: 'f',
  address_house_number: 'f',
  address_postal_code: 'f',
  address_locality: 'm',
  address_country: 'n',
  birth_family_name: 'm',
  birth_given_name: 'm',
  sex: 'n',
  email: 'f',
  phone_number: 'f',
  document_number: 'f',
  date_of_issuance: 'n',
  date_of_expiry: 'n',
  issue_date: 'n',
  expiry_date: 'n',
  'driving_privileges.issue_date': 'n',
  'driving_privileges.expiry_date': 'n',
  issuing_country: 'n',
  un_distinguishing_sign: 'n',
  administrative_number: 'f',
  height: 'f',
  weight: 'n',
  eye_colour: 'f',
  hair_colour: 'f',
  birth_place: 'm',
  resident_address: 'f',
  portrait_capture_date: 'n',
  age_in_years: 'n',
  age_birth_year: 'n',
  resident_city: 'm',
  resident_state: 'n',
  resident_postal_code: 'f',
  resident_country: 'n',
  family_name_national_character: 'm',
  given_name_national_character: 'm',
};

const GERMAN_DOCUMENT_GENDERS: Record<string, Gender> = { pid: 'm', mdl: 'm' };

const POSSESSIVE: Record<Gender, string> = { m: 'Ihr', n: 'Ihr', f: 'Ihre' };
const POSSESSIVE_GENITIVE: Record<Gender, string> = { m: 'Ihres', n: 'Ihres', f: 'Ihrer' };
const ARTICLE: Record<Gender, string> = { m: 'Der', n: 'Das', f: 'Die' };
const INDEFINITE_ACCUSATIVE: Record<Gender, string> = { m: 'einen', n: 'ein', f: 'eine' };
const RELATIVE: Record<Gender, string> = { m: 'der', n: 'das', f: 'die' };

/** A one-word German noun in the genitive: "Führerschein" → "Führerscheins". */
function genitiveOf(noun: string, gender: Gender): string {
  if (gender === 'f') {
    return noun;
  }
  return /(s|ß|x|z)$/.test(noun) ? `${noun}es` : `${noun}s`;
}

function isOneWord(label: string): boolean {
  return /^[\p{L}-]+$/u.test(label);
}

/** A field named in German without its gender: "Das Feld „Ausstellende Behörde“". */
function germanField(label: string): string {
  return `Das Feld „${label}“`;
}

/** "Ihres Führerscheins", or "des Dokuments „…“" for a document without a known gender. */
function germanDocumentGenitive(document: RuleDocument): string {
  const gender = GERMAN_DOCUMENT_GENDERS[document.key];
  return gender && isOneWord(document.label)
    ? `${POSSESSIVE_GENITIVE[gender]} ${genitiveOf(document.label, gender)}`
    : `des Dokuments „${document.label}“`;
}

/** "einen Personalausweis" and its relative pronoun "der", for "Sie brauchen …, der …". */
function germanDocumentWanted(document: RuleDocument): { noun: string; which: string } {
  const gender = GERMAN_DOCUMENT_GENDERS[document.key];
  return gender
    ? { noun: `${INDEFINITE_ACCUSATIVE[gender]} ${document.label}`, which: RELATIVE[gender] }
    : { noun: `ein Dokument „${document.label}“`, which: 'das' };
}

/** "Ihr Personalausweis". */
function germanDocumentOwned(document: RuleDocument): string {
  const gender = GERMAN_DOCUMENT_GENDERS[document.key];
  return gender ? `${POSSESSIVE[gender]} ${document.label}` : `Ihr Dokument „${document.label}“`;
}

/** "einen Führerschein der Klasse B" with its relative pronoun, or the document alone. */
function germanWanted(target: ResolvedTarget, licenceClass: string | null) {
  const wanted = germanDocumentWanted(target.document);
  return licenceClass ? { ...wanted, noun: `${wanted.noun} der Klasse ${licenceClass}` } : wanted;
}

/** A condition's operator among the years-ago ones, as the templates take it. */
type YearsAgoOperator = 'at_least_years_ago' | 'less_than_years_ago' | 'exactly_years_ago';

// The proposed messages' templates, in each language (spec 009, R4; glossary G§3 "proposed
// messages"). English lowers the first letter of a label (`lowerFirst()`); German keeps its
// nouns' capitals and places the label where a noun fits ("Ihre Körpergröße (cm) …"). Values are
// inserted as entered, enum values by their label in the context's language
export const MESSAGE_TEXTS = defineTexts<{
  /** "A", "A or B", "A, B or C": the word before the last item */
  or: string;
  /** "Your height (cm)", the subject of a plain field's sentence */
  fieldSubject: (target: ResolvedTarget) => string;
  /** "The region of your place of birth" */
  partSubject: (target: ResolvedTarget) => string;
  /** "The issue date of your driving licence", "The expiry date of your class B" */
  dateSubject: (target: ResolvedTarget, licenceClass: string | null) => string;
  greaterThan: (subject: string, value: string) => string;
  lessThan: (subject: string, value: string) => string;
  notValue: (subject: string, value: string) => string;
  isValue: (subject: string, value: string) => string;
  textNotEqualTo: (subject: string, value: string) => string;
  textContains: (subject: string, value: string) => string;
  textNotContains: (subject: string, value: string) => string;
  textEqualTo: (subject: string, value: string) => string;
  livesIn: (place: string) => string;
  notLivesIn: (place: string) => string;
  bornIn: (place: string) => string;
  notBornIn: (place: string) => string;
  holdsClass: (classes: string) => string;
  notHoldsClass: (classes: string) => string;
  nationality: (countries: string) => string;
  notNationality: (countries: string) => string;
  issuedIn: (document: RuleDocument, countries: string) => string;
  notIssuedIn: (document: RuleDocument, countries: string) => string;
  atLeastYearsOld: (years: number) => string;
  underYearsOld: (years: number) => string;
  exactlyYearsOld: (years: number) => string;
  bornOn: (operator: FixedDateOperator, date: string) => string;
  held: (
    operator: YearsAgoOperator,
    target: ResolvedTarget,
    licenceClass: string,
    years: number
  ) => string;
  validFor: (
    target: ResolvedTarget,
    licenceClass: string | null,
    amount: number,
    unit: Unit
  ) => string;
  expiresWithin: (
    target: ResolvedTarget,
    licenceClass: string | null,
    amount: number,
    unit: Unit
  ) => string;
  dateRelative: (subject: string, operator: 'before' | 'after', date: string) => string;
  dateOn: (subject: string, date: string) => string;
  atLeastAgo: (subject: string, years: number) => string;
  lessThanAgo: (subject: string, years: number) => string;
  exactlyAgo: (subject: string, years: number) => string;
  atLeastFromNow: (subject: string, amount: number, unit: Unit) => string;
  lessThanFromNow: (subject: string, amount: number, unit: Unit) => string;
}>(
  {
    or: ' or ',
    fieldSubject: ({ field }) => `Your ${lowerFirst(field.label)}`,
    partSubject: ({ field, part }) =>
      `The ${lowerFirst(part?.label ?? '')} of your ${lowerFirst(field.label)}`,
    dateSubject: ({ document, field, part }, licenceClass) =>
      upperFirst(
        licenceClass && part
          ? `the ${lowerFirst(part.label)} of your class ${licenceClass}`
          : `the ${lowerFirst(field.label)} of your ${lowerFirst(document.label)}`
      ),
    greaterThan: (subject, value) => `${subject} must be greater than ${value}.`,
    lessThan: (subject, value) => `${subject} must be less than ${value}.`,
    notValue: (subject, value) => `${subject} must not be ${value}.`,
    isValue: (subject, value) => `${subject} must be ${value}.`,
    textNotEqualTo: (subject, value) => `${subject} must not be "${value}".`,
    textContains: (subject, value) => `${subject} must contain "${value}".`,
    textNotContains: (subject, value) => `${subject} must not contain "${value}".`,
    textEqualTo: (subject, value) => `${subject} must be "${value}".`,
    livesIn: (place) => `You need to live in ${place}.`,
    notLivesIn: (place) => `You must not live in ${place}.`,
    bornIn: (place) => `You need to be born in ${place}.`,
    notBornIn: (place) => `You must not have been born in ${place}.`,
    holdsClass: (classes) => `You need a class ${classes} licence.`,
    notHoldsClass: (classes) => `You must not hold a class ${classes} licence.`,
    nationality: (countries) => `You need the nationality of ${countries}.`,
    notNationality: (countries) => `You must not be a national of ${countries}.`,
    issuedIn: (document, countries) =>
      `You need a ${lowerFirst(document.label)} issued in ${countries}.`,
    notIssuedIn: (document, countries) =>
      `Your ${lowerFirst(document.label)} must not have been issued in ${countries}.`,
    atLeastYearsOld: (years) => `You need to be at least ${countOf(years, 'years')} old.`,
    underYearsOld: (years) => `You need to be under ${countOf(years, 'years')} old.`,
    exactlyYearsOld: (years) => `You need to be exactly ${countOf(years, 'years')} old.`,
    bornOn: (operator, date) => `You need to be born ${operator} ${date}.`,
    held: (operator, { document }, licenceClass, years) => {
      const held = `You need to have held a class ${licenceClass} ${lowerFirst(document.label)}`;
      const length = countOf(years, 'years');
      switch (operator) {
        case 'at_least_years_ago':
          return `${held} for at least ${length}.`;
        case 'less_than_years_ago':
          return `${held} for less than ${length}.`;
        case 'exactly_years_ago':
          return `${held} for exactly ${length}.`;
      }
    },
    validFor: ({ document }, licenceClass, amount, unit) => {
      // "6 more months", "1 more year": the design's validity (U42, U66)
      const moreAmount = countOf(amount, unit).replace(' ', ' more ');
      const holder = licenceClass
        ? `You need a class ${licenceClass} licence`
        : `You need a ${lowerFirst(document.label)}`;
      return `${holder} that’s valid for at least ${moreAmount}.`;
    },
    expiresWithin: ({ document }, licenceClass, amount, unit) => {
      const holder = licenceClass
        ? `You need a class ${licenceClass} licence`
        : `You need a ${lowerFirst(document.label)}`;
      return `${holder} that expires in less than ${countOf(amount, unit)}.`;
    },
    dateRelative: (subject, operator, date) => `${subject} must be ${operator} ${date}.`,
    dateOn: (subject, date) => `${subject} must be ${date}.`,
    atLeastAgo: (subject, years) => `${subject} must be at least ${countOf(years, 'years')} ago.`,
    lessThanAgo: (subject, years) => `${subject} must be less than ${countOf(years, 'years')} ago.`,
    exactlyAgo: (subject, years) => `${subject} must be exactly ${countOf(years, 'years')} ago.`,
    atLeastFromNow: (subject, amount, unit) =>
      `${subject} must be at least ${countOf(amount, unit)} from now.`,
    lessThanFromNow: (subject, amount, unit) =>
      `${subject} must be less than ${countOf(amount, unit)} from now.`,
  },
  {
    or: ' oder ',
    fieldSubject: ({ field }) => {
      const gender = GERMAN_FIELD_GENDERS[field.key];
      return gender ? `${POSSESSIVE[gender]} ${field.label}` : germanField(field.label);
    },
    partSubject: ({ field, part }) => {
      const partGender = part && GERMAN_FIELD_GENDERS[`${field.key}.${part.key}`];
      const fieldGender = GERMAN_FIELD_GENDERS[field.key];
      if (!part || !partGender || !fieldGender || !isOneWord(field.label)) {
        return germanField(part ? `${field.label} – ${part.label}` : field.label);
      }
      const owner = `${POSSESSIVE_GENITIVE[fieldGender]} ${genitiveOf(field.label, fieldGender)}`;
      return `${ARTICLE[partGender]} ${part.label} ${owner}`;
    },
    dateSubject: ({ document, field, part }, licenceClass) => {
      if (licenceClass && part) {
        const gender = GERMAN_FIELD_GENDERS[`${field.key}.${part.key}`];
        const named = gender ? `${ARTICLE[gender]} ${part.label}` : germanField(part.label);
        return `${named} Ihrer Klasse ${licenceClass}`;
      }
      const gender = GERMAN_FIELD_GENDERS[field.key];
      const named = gender ? `${ARTICLE[gender]} ${field.label}` : germanField(field.label);
      return `${named} ${germanDocumentGenitive(document)}`;
    },
    greaterThan: (subject, value) => `${subject} muss größer als ${value} sein.`,
    lessThan: (subject, value) => `${subject} muss kleiner als ${value} sein.`,
    notValue: (subject, value) => `${subject} darf nicht ${value} sein.`,
    isValue: (subject, value) => `${subject} muss ${value} sein.`,
    textNotEqualTo: (subject, value) => `${subject} darf nicht „${value}“ sein.`,
    textContains: (subject, value) => `${subject} muss „${value}“ enthalten.`,
    textNotContains: (subject, value) => `${subject} darf „${value}“ nicht enthalten.`,
    textEqualTo: (subject, value) => `${subject} muss „${value}“ sein.`,
    livesIn: (place) => `Sie müssen in ${place} wohnen.`,
    notLivesIn: (place) => `Sie dürfen nicht in ${place} wohnen.`,
    bornIn: (place) => `Sie müssen in ${place} geboren sein.`,
    notBornIn: (place) => `Sie dürfen nicht in ${place} geboren sein.`,
    holdsClass: (classes) => `Sie brauchen einen Führerschein der Klasse ${classes}.`,
    notHoldsClass: (classes) => `Sie dürfen keinen Führerschein der Klasse ${classes} besitzen.`,
    nationality: (countries) => `Sie brauchen die Staatsangehörigkeit von ${countries}.`,
    notNationality: (countries) =>
      `Sie dürfen nicht die Staatsangehörigkeit von ${countries} besitzen.`,
    issuedIn: (document, countries) => {
      const { noun, which } = germanDocumentWanted(document);
      return `Sie brauchen ${noun}, ${which} in ${countries} ausgestellt wurde.`;
    },
    notIssuedIn: (document, countries) =>
      `${germanDocumentOwned(document)} darf nicht in ${countries} ausgestellt worden sein.`,
    atLeastYearsOld: (years) => `Sie müssen mindestens ${countOf(years, 'years', 'de')} alt sein.`,
    underYearsOld: (years) => `Sie müssen jünger als ${countOf(years, 'years', 'de')} sein.`,
    exactlyYearsOld: (years) => `Sie müssen genau ${countOf(years, 'years', 'de')} alt sein.`,
    bornOn: (operator, date) => `Sie müssen ${RELATION_WORDS.de[operator]} ${date} geboren sein.`,
    held: (operator, target, licenceClass, years) => {
      const { noun } = germanWanted(target, licenceClass);
      const since = countOf(years, 'years', 'de', true);
      switch (operator) {
        case 'at_least_years_ago':
          return `Sie müssen seit mindestens ${since} ${noun} besitzen.`;
        case 'less_than_years_ago':
          return `Sie müssen seit weniger als ${since} ${noun} besitzen.`;
        case 'exactly_years_ago':
          return `Sie müssen seit genau ${since} ${noun} besitzen.`;
      }
    },
    validFor: (target, licenceClass, amount, unit) => {
      const { noun, which } = germanWanted(target, licenceClass);
      return `Sie brauchen ${noun}, ${which} noch mindestens ${countOf(amount, unit, 'de')} gültig ist.`;
    },
    expiresWithin: (target, licenceClass, amount, unit) => {
      const { noun, which } = germanWanted(target, licenceClass);
      const within = countOf(amount, unit, 'de', true);
      return `Sie brauchen ${noun}, ${which} in weniger als ${within} abläuft.`;
    },
    dateRelative: (subject, operator, date) =>
      `${subject} muss ${RELATION_WORDS.de[operator]} ${date} liegen.`,
    dateOn: (subject, date) => `${subject} muss der ${date} sein.`,
    atLeastAgo: (subject, years) =>
      `${subject} muss mindestens ${countOf(years, 'years', 'de')} zurückliegen.`,
    lessThanAgo: (subject, years) =>
      `${subject} muss weniger als ${countOf(years, 'years', 'de')} zurückliegen.`,
    exactlyAgo: (subject, years) =>
      `${subject} muss genau ${countOf(years, 'years', 'de')} zurückliegen.`,
    atLeastFromNow: (subject, amount, unit) =>
      `${subject} muss mindestens ${countOf(amount, unit, 'de')} in der Zukunft liegen.`,
    lessThanFromNow: (subject, amount, unit) =>
      `${subject} muss weniger als ${countOf(amount, unit, 'de')} in der Zukunft liegen.`,
  }
);

type MessageTexts = (typeof MESSAGE_TEXTS)['en'];

/** "A", "A or B", "A, B or C"; in German "A, B oder C". */
export function orList(items: string[], language: Language = DEFAULT_LANGUAGE): string {
  if (items.length <= 1) {
    return items.join('');
  }
  return `${items.slice(0, -1).join(', ')}${MESSAGE_TEXTS[language].or}${items[items.length - 1]}`;
}

function keyOf({ document, field }: ResolvedTarget): string {
  return `${document.key}.${field.key}`;
}

/**
 * The proposed error message of a rule, which the team member may change (FR-004), or null while
 * its target or condition is incomplete. It describes the condition as entered: enum values by
 * their label, licence classes by their code (FR-005). In the context's language, English when it
 * has none.
 */
export function proposedMessage(
  rule: Pick<RuleItem, 'target' | 'condition'>,
  { documents, optionSets, language = DEFAULT_LANGUAGE }: RuleContext
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
  const texts = MESSAGE_TEXTS[language];
  switch (target.kind) {
    case 'number':
      return numberMessage(texts, target, condition);
    case 'text':
      return textMessage(texts, target, condition);
    case 'enum': {
      const labels = (condition.values ?? []).map((value) =>
        optionLabel(optionSets, target.optionSet, value)
      );
      const values = orList(labels, language);
      return enumMessage(texts, target, condition.operator === 'includes_none_of', values);
    }
    case 'date':
      return dateMessage(texts, target, condition, language);
  }
}

function numberMessage(texts: MessageTexts, target: ResolvedTarget, condition: Condition): string {
  const subject = texts.fieldSubject(target);
  const value = String(condition.value);
  switch (condition.operator) {
    case 'greater_than':
      return texts.greaterThan(subject, value);
    case 'less_than':
      return texts.lessThan(subject, value);
    case 'not_equal_to':
      return texts.notValue(subject, value);
    default:
      return texts.isValue(subject, value);
  }
}

function textMessage(texts: MessageTexts, target: ResolvedTarget, condition: Condition): string {
  const value = String(condition.value).trim();
  const negated = condition.operator === 'not_equal_to';
  if (condition.operator === 'equal_to' || negated) {
    if (LIVES_IN_FIELDS.has(keyOf(target))) {
      return negated ? texts.notLivesIn(value) : texts.livesIn(value);
    }
    if (keyOf(target) === PLACE_OF_BIRTH_FIELD) {
      return negated ? texts.notBornIn(value) : texts.bornIn(value);
    }
  }
  const subject = target.part ? texts.partSubject(target) : texts.fieldSubject(target);
  switch (condition.operator) {
    case 'not_equal_to':
      return texts.textNotEqualTo(subject, value);
    case 'contains':
      return texts.textContains(subject, value);
    case 'not_contains':
      return texts.textNotContains(subject, value);
    default:
      return texts.textEqualTo(subject, value);
  }
}

function enumMessage(
  texts: MessageTexts,
  target: ResolvedTarget,
  none: boolean,
  values: string
): string {
  const key = keyOf(target);
  if (target.part?.key === 'classes') {
    return none ? texts.notHoldsClass(values) : texts.holdsClass(values);
  }
  if (key === PLACE_OF_BIRTH_FIELD) {
    return none ? texts.notBornIn(values) : texts.bornIn(values);
  }
  if (NATIONALITY_FIELDS.has(key)) {
    return none ? texts.notNationality(values) : texts.nationality(values);
  }
  if (LIVES_IN_COUNTRY_FIELDS.has(key)) {
    return none ? texts.notLivesIn(values) : texts.livesIn(values);
  }
  if (ISSUING_COUNTRY_FIELDS.has(key)) {
    return none
      ? texts.notIssuedIn(target.document, values)
      : texts.issuedIn(target.document, values);
  }
  const subject = texts.fieldSubject(target);
  return none ? texts.notValue(subject, values) : texts.isValue(subject, values);
}

function dateMessage(
  texts: MessageTexts,
  target: ResolvedTarget,
  condition: Condition,
  language: Language
): string {
  const { operator } = condition;
  const years = condition.years ?? 0;
  const amount = condition.amount ?? 0;
  const unit: Unit = condition.unit === 'months' ? 'months' : 'years';
  const date = condition.date ? formatDate(condition.date, language) : '';
  const licenceClass = target.part?.per_licence_class ? target.licenceClass : null;

  if (target.dateOfBirth) {
    switch (operator) {
      case 'at_least_years_ago':
        return texts.atLeastYearsOld(years);
      case 'less_than_years_ago':
        return texts.underYearsOld(years);
      case 'exactly_years_ago':
        return texts.exactlyYearsOld(years);
      case 'before':
      case 'after':
      case 'on':
        return texts.bornOn(operator, date);
    }
  }
  if (licenceClass && target.part?.key === 'issue_date') {
    switch (operator) {
      case 'at_least_years_ago':
      case 'less_than_years_ago':
      case 'exactly_years_ago':
        return texts.held(operator, target, licenceClass, years);
    }
  }
  const expiry = target.part?.key === 'expiry_date' || EXPIRY_DATE_FIELDS.has(keyOf(target));
  if (expiry) {
    if (operator === 'at_least_from_now') {
      return texts.validFor(target, licenceClass, amount, unit);
    }
    if (operator === 'less_than_from_now') {
      return texts.expiresWithin(target, licenceClass, amount, unit);
    }
  }

  const subject = texts.dateSubject(target, licenceClass);
  switch (operator) {
    case 'before':
    case 'after':
      return texts.dateRelative(subject, operator, date);
    case 'on':
      return texts.dateOn(subject, date);
    case 'at_least_years_ago':
      return texts.atLeastAgo(subject, years);
    case 'less_than_years_ago':
      return texts.lessThanAgo(subject, years);
    case 'exactly_years_ago':
      return texts.exactlyAgo(subject, years);
    case 'at_least_from_now':
      return texts.atLeastFromNow(subject, amount, unit);
    default:
      return texts.lessThanFromNow(subject, amount, unit);
  }
}
