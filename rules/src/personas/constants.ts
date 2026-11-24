// The numbers of the personas (specs/004-rule-test-personas): the personas' ids (data-model.md),
// a run's deadline and watchdog (research R9), the generation's budgets (research R6, R7), the
// plausible ranges of generated values (research R7, FR-010) and the fields that describe the same
// fact (research R7, step 1). Times are in milliseconds
import type { Combinator } from '@konnekt/api-types/form-connections';

import { defineTexts } from '../language';
import type { PersonaId } from './types';

// The three personas, in their fixed order (data-model.md, "Persona")
export const PERSONA_IDS: readonly PersonaId[] = ['persona-1', 'persona-2', 'persona-3'];

// How a group's members combine, as its header says it (Figma "Rules/Group header", U14
// 6094:6413, 6094:6320): a group's statement in the test results, in each language (spec 009,
// glossary §3 "group subtitles"); read `GROUP_SUBTITLES[language]`. The SPA's group frame builds
// its subtitles from these
export const GROUP_SUBTITLES = defineTexts<Record<Combinator, string>>(
  { and: 'All of these must be met', or: 'At least one of these must be met' },
  { and: 'Alle müssen erfüllt sein', or: 'Mindestens eine muss erfüllt sein' }
);

// A run's personas are due 5 seconds after the request (FR-013, SC-003). The worker stops planning
// 4.5 seconds after it and posts the best personas found: the `deadline` of its 'generate' message
// is the request's time plus this
export const GENERATION_STOP_MS = 4500;

// The hook terminates a worker that hasn't posted 'generated' 5.5 seconds after the request, and
// the run fails
export const GENERATION_WATCHDOG_MS = 5500;

// The search over outcome vectors is exhaustive up to this many realizable vectors; beyond it, each
// target of goals 1 to 3 is asked directly (research R6)
export const MAX_VECTORS = 256;

// The free slots' vectors are chosen by trying every combination up to this many, and greedily
// with random restarts beyond it (research R6)
export const MAX_COMBINATIONS = 4096;

// Generation stops after this many restarts in a row that cover no further target (research R7)
export const MAX_RESTARTS_WITHOUT_GAIN = 20;

// Plausible values (research R7, FR-010). They give way when a goal needs otherwise.

// Dates of birth for ages 18 to 80: "at least 18 years ago" and "less than 81 years ago", greater
// than 17 and less than 81 on "Age in years", and the matching range on "Year of birth"
export const MIN_AGE = 18;
export const MAX_AGE = 80;

// Issue dates lie in the past, at most this many years ago, and never before the date of birth
export const MAX_ISSUE_YEARS_AGO = 15;

// Expiry dates from two years ago to fifteen years ahead, and never before the issue date of the
// same document or class
export const MIN_EXPIRY_YEARS_AGO = 2;
export const MAX_EXPIRY_YEARS_AHEAD = 15;

// Height and weight in human ranges: "Height (cm)" and "Weight (kg)" of the driving licence
export const HEIGHT_FIELD = 'mdl.height';
export const MIN_HEIGHT_CM = 150;
export const MAX_HEIGHT_CM = 200;
export const WEIGHT_FIELD = 'mdl.weight';
export const MIN_WEIGHT_KG = 45;
export const MAX_WEIGHT_KG = 120;

// Fields that describe the same fact (research R7, step 1; EC "Fields that describe the same
// fact"). Agreement comes first among a value's candidates.

// Pairs of fields, by variable key, whose values are equal: a second date of birth equals the
// first, and a city, postal code, region, country or nationality follows its counterpart in the
// other document
export const AGREEING_FIELDS: readonly (readonly [string, string])[] = [
  ['pid.birthdate', 'mdl.birth_date'],
  ['pid.address_locality', 'mdl.resident_city'],
  ['pid.address_postal_code', 'mdl.resident_postal_code'],
  ['pid.address_region', 'mdl.resident_state'],
  ['pid.address_country', 'mdl.resident_country'],
  ['pid.nationalities', 'mdl.nationality'],
];

// Fields that follow the date of birth: "Age in years" is the age it gives today, and "Year of
// birth" its year
export const FROM_DATE_OF_BIRTH: Readonly<Record<string, 'age' | 'year'>> = {
  'mdl.age_in_years': 'age',
  'mdl.age_birth_year': 'year',
};

// Fields that follow the persona's name: its given name and its family name
export const FROM_NAME: Readonly<Record<string, 'given' | 'family'>> = {
  'pid.given_name': 'given',
  'mdl.given_name': 'given',
  'pid.family_name': 'family',
  'mdl.family_name': 'family',
};
