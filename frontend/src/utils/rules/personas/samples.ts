// The name and text pools of generated personas (specs/004-rule-test-personas, research R7 step 3
// "Plausible random values" and "Names"; FR-010): realistic, fictitious given and family names,
// towns of Baden-Württemberg with their postal codes, streets, places of birth, issuing
// authorities, makers of document numbers, emails and phone numbers in their format, countries
// weighted towards Germany and common licence-class combinations. Data and small makers only:
// pure, no dependency, and every random choice comes from the `Random` passed in.
//
// `sampleFor(key, random, context, codes)` gives a plausible value for a persona field, by its
// variable key (`SAMPLED_KEYS`), from one `SampleContext` per persona, so that a persona's town,
// postal code, street and authority belong together. Dates and numbers aren't here: they depend
// on today and the ranges of `constants.ts` (`sampling.ts`)
import type { Random } from './random';
import type { PersonaValue } from './types';

// Names (research R7, "Names"). Given names are one word each, so that a persona's name splits at
// its first space into the given and the family name (`nameParts()`)

/** Given names, common in Baden-Württemberg */
export const GIVEN_NAMES: readonly string[] = [
  'Mia',
  'Anna',
  'Lena',
  'Sophie',
  'Emma',
  'Hannah',
  'Lea',
  'Marie',
  'Laura',
  'Julia',
  'Sarah',
  'Katharina',
  'Elif',
  'Zeynep',
  'Aylin',
  'Fatma',
  'Giulia',
  'Elena',
  'Natalia',
  'Ioana',
  'Jürgen',
  'Lukas',
  'Jonas',
  'Felix',
  'Paul',
  'Leon',
  'Maximilian',
  'Tobias',
  'Simon',
  'David',
  'Michael',
  'Thomas',
  'Stefan',
  'Yusuf',
  'Emre',
  'Mehmet',
  'Luca',
  'Marco',
  'Dimitrios',
  'Piotr',
];

/** Family names, common in Baden-Württemberg */
export const FAMILY_NAMES: readonly string[] = [
  'Schulz',
  'Keller',
  'Müller',
  'Schmid',
  'Schneider',
  'Fischer',
  'Weber',
  'Wagner',
  'Becker',
  'Hoffmann',
  'Maier',
  'Bauer',
  'Huber',
  'Wolf',
  'Krause',
  'Braun',
  'Zimmermann',
  'Hartmann',
  'Lang',
  'Schäfer',
  'Haug',
  'Kienzle',
  'Rapp',
  'Pfeiffer',
  'Bühler',
  'Demir',
  'Yılmaz',
  'Kaya',
  'Şahin',
  'Öztürk',
  'Rossi',
  'Russo',
  'Esposito',
  'Nowak',
  'Kowalski',
  'Papadopoulos',
  'Popescu',
  'Horvat',
  'Berger',
  'Vogel',
];

// Places (research R7, "texts from per-field pools")

/** A town of Baden-Württemberg: where a persona lives and which authority issued its documents */
export interface HomeTown {
  town: string;
  /** A postal code of the town, five digits */
  postalCode: string;
  /** The authority that issues identity cards and driving licences there */
  authority: string;
}

/** The region of every home town */
export const HOME_REGION = 'Baden-Württemberg';

/** The country of every home town, and of the issuing authorities */
export const HOME_COUNTRY = 'DE';

/** The jurisdiction of the issuing authorities (ISO 3166-2) */
export const HOME_JURISDICTION = 'DE-BW';

/** Germany's UN distinguishing sign for vehicles */
export const HOME_UN_SIGN = 'D';

/** Towns of Baden-Württemberg, each with a postal code and its issuing authority */
export const HOME_TOWNS: readonly HomeTown[] = [
  { town: 'Stuttgart', postalCode: '70173', authority: 'Landeshauptstadt Stuttgart' },
  { town: 'Karlsruhe', postalCode: '76133', authority: 'Stadt Karlsruhe' },
  { town: 'Mannheim', postalCode: '68159', authority: 'Stadt Mannheim' },
  { town: 'Freiburg im Breisgau', postalCode: '79098', authority: 'Stadt Freiburg im Breisgau' },
  { town: 'Heidelberg', postalCode: '69117', authority: 'Stadt Heidelberg' },
  { town: 'Ulm', postalCode: '89073', authority: 'Stadt Ulm' },
  { town: 'Heilbronn', postalCode: '74072', authority: 'Stadt Heilbronn' },
  { town: 'Pforzheim', postalCode: '75175', authority: 'Stadt Pforzheim' },
  { town: 'Reutlingen', postalCode: '72764', authority: 'Stadt Reutlingen' },
  { town: 'Esslingen am Neckar', postalCode: '73728', authority: 'Stadt Esslingen am Neckar' },
  { town: 'Ludwigsburg', postalCode: '71634', authority: 'Stadt Ludwigsburg' },
  { town: 'Tübingen', postalCode: '72070', authority: 'Universitätsstadt Tübingen' },
  { town: 'Konstanz', postalCode: '78462', authority: 'Stadt Konstanz' },
  { town: 'Böblingen', postalCode: '71032', authority: 'Landratsamt Böblingen' },
  { town: 'Sindelfingen', postalCode: '71063', authority: 'Stadt Sindelfingen' },
  { town: 'Waiblingen', postalCode: '71332', authority: 'Landratsamt Rems-Murr-Kreis' },
  { town: 'Göppingen', postalCode: '73033', authority: 'Landratsamt Göppingen' },
  { town: 'Schwäbisch Gmünd', postalCode: '73525', authority: 'Stadt Schwäbisch Gmünd' },
  { town: 'Aalen', postalCode: '73430', authority: 'Landratsamt Ostalbkreis' },
  { town: 'Offenburg', postalCode: '77652', authority: 'Landratsamt Ortenaukreis' },
  { town: 'Ravensburg', postalCode: '88212', authority: 'Landratsamt Ravensburg' },
  { town: 'Friedrichshafen', postalCode: '88045', authority: 'Stadt Friedrichshafen' },
  { town: 'Fellbach', postalCode: '70734', authority: 'Stadt Fellbach' },
  { town: 'Leonberg', postalCode: '71229', authority: 'Stadt Leonberg' },
  { town: 'Kornwestheim', postalCode: '70806', authority: 'Stadt Kornwestheim' },
  { town: 'Ostfildern', postalCode: '73760', authority: 'Stadt Ostfildern' },
  { town: 'Nürtingen', postalCode: '72622', authority: 'Stadt Nürtingen' },
  { town: 'Baden-Baden', postalCode: '76530', authority: 'Stadt Baden-Baden' },
  {
    town: 'Villingen-Schwenningen',
    postalCode: '78050',
    authority: 'Stadt Villingen-Schwenningen',
  },
  { town: 'Bietigheim-Bissingen', postalCode: '74321', authority: 'Stadt Bietigheim-Bissingen' },
];

/** Street names */
export const STREETS: readonly string[] = [
  'Königstraße',
  'Hauptstraße',
  'Bahnhofstraße',
  'Schillerstraße',
  'Goethestraße',
  'Lindenstraße',
  'Gartenstraße',
  'Kirchstraße',
  'Mozartstraße',
  'Wilhelmstraße',
  'Friedrichstraße',
  'Neckarstraße',
  'Uhlandstraße',
  'Schulstraße',
  'Bergstraße',
  'Talstraße',
  'Rosenweg',
  'Weinbergweg',
  'Am Marktplatz',
  'Panoramastraße',
];

/** A place of birth: a town, its region and its country's ISO 3166-1 code */
export interface BirthPlace {
  locality: string;
  region: string;
  country: string;
}

/** Places of birth, most in Germany; `BIRTH_PLACE_WEIGHTS` holds their weights */
export const BIRTH_PLACES: readonly BirthPlace[] = [
  { locality: 'Stuttgart', region: 'Baden-Württemberg', country: 'DE' },
  { locality: 'Karlsruhe', region: 'Baden-Württemberg', country: 'DE' },
  { locality: 'Mannheim', region: 'Baden-Württemberg', country: 'DE' },
  { locality: 'Ulm', region: 'Baden-Württemberg', country: 'DE' },
  { locality: 'Tübingen', region: 'Baden-Württemberg', country: 'DE' },
  { locality: 'Ludwigsburg', region: 'Baden-Württemberg', country: 'DE' },
  { locality: 'München', region: 'Bayern', country: 'DE' },
  { locality: 'Augsburg', region: 'Bayern', country: 'DE' },
  { locality: 'Frankfurt am Main', region: 'Hessen', country: 'DE' },
  { locality: 'Köln', region: 'Nordrhein-Westfalen', country: 'DE' },
  { locality: 'Berlin', region: 'Berlin', country: 'DE' },
  { locality: 'Hamburg', region: 'Hamburg', country: 'DE' },
  { locality: 'Leipzig', region: 'Sachsen', country: 'DE' },
  { locality: 'Mainz', region: 'Rheinland-Pfalz', country: 'DE' },
  { locality: 'Istanbul', region: 'İstanbul', country: 'TR' },
  { locality: 'Napoli', region: 'Campania', country: 'IT' },
  { locality: 'Kraków', region: 'Małopolskie', country: 'PL' },
  { locality: 'Thessaloniki', region: 'Central Macedonia', country: 'GR' },
  { locality: 'Zagreb', region: 'Grad Zagreb', country: 'HR' },
  { locality: 'Wien', region: 'Wien', country: 'AT' },
];

/** The weight of each place of birth in `BIRTH_PLACES`: German ones far more likely */
export const BIRTH_PLACE_WEIGHTS: readonly number[] = BIRTH_PLACES.map((place) =>
  place.country === HOME_COUNTRY ? 6 : 1
);

// Enums (research R7: "enums from their set, with countries weighted towards Germany and licence
// classes taken from common combinations"). Every code belongs to its value set of
// `backend/app/option_sets.py`

/** Countries (ISO 3166-1 alpha-2) with weights, Germany far ahead */
export const COUNTRY_WEIGHTS: readonly (readonly [string, number])[] = [
  ['DE', 80],
  ['TR', 4],
  ['IT', 3],
  ['PL', 2],
  ['GR', 2],
  ['HR', 2],
  ['RO', 2],
  ['AT', 1],
  ['FR', 1],
  ['ES', 1],
  ['PT', 1],
  ['BA', 1],
];

/** The share of personas with a second nationality */
export const SECOND_NATIONALITY_CHANCE = 0.1;

/** Common combinations of licence classes, each in the value set's order */
export const LICENCE_CLASS_COMBINATIONS: readonly (readonly string[])[] = [
  ['B'],
  ['B', 'BE'],
  ['AM', 'B'],
  ['A', 'B'],
  ['B', 'C1'],
];

/** The weight of each combination in `LICENCE_CLASS_COMBINATIONS`: B alone the most common */
export const LICENCE_CLASS_WEIGHTS: readonly number[] = [6, 2, 2, 2, 1];

/** Sex codes (ISO/IEC 5218 and the PID's) with weights */
export const SEX_WEIGHTS: readonly (readonly [number, number])[] = [
  [1, 49],
  [2, 49],
  [5, 1],
  [9, 1],
];

/** Eye colours (ISO/IEC 18013-5) with weights */
export const EYE_COLOUR_WEIGHTS: readonly (readonly [string, number])[] = [
  ['brown', 5],
  ['blue', 4],
  ['green', 2],
  ['grey', 2],
  ['hazel', 2],
  ['black', 1],
];

/** Hair colours (ISO/IEC 18013-5) with weights */
export const HAIR_COLOUR_WEIGHTS: readonly (readonly [string, number])[] = [
  ['brown', 5],
  ['black', 4],
  ['blond', 3],
  ['grey', 2],
  ['auburn', 1],
  ['red', 1],
  ['white', 1],
  ['bald', 1],
];

// Makers of formatted texts

/** The domains of made-up emails: reserved for examples (RFC 2606), so no address is real */
export const EMAIL_DOMAINS: readonly string[] = ['example.com', 'example.org', 'example.net'];

/** The prefixes of German mobile numbers */
export const MOBILE_PREFIXES: readonly string[] = [
  '151',
  '152',
  '157',
  '159',
  '160',
  '162',
  '170',
  '171',
  '172',
  '173',
  '175',
  '176',
  '177',
  '178',
  '179',
];

/** The letters and digits of a German identity card's number: no vowels, no B, D, Q or S */
const ID_CARD_CHARACTERS = 'CFGHJKLMNPRTVWXYZ0123456789';

/** The first character of a German identity card's number */
const ID_CARD_FIRST = 'LMNPRTVWXY';

/** Capital letters without I and O, which read as digits */
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

const DIGITS = '0123456789';

/** `count` characters, each picked from `characters` */
function charactersOf(random: Random, characters: string, count: number): string {
  return Array.from({ length: count }, () => random.pick([...characters])).join('');
}

/** A German identity card's number: nine letters and digits, such as "L01X00T47" */
export function makeIdCardNumber(random: Random): string {
  return random.pick([...ID_CARD_FIRST]) + charactersOf(random, ID_CARD_CHARACTERS, 8);
}

/**
 * A German driving licence's number: eleven characters, such as "B072RRE2I55": the authority's
 * letter and three digits, five letters or digits, a check digit and a serial character
 */
export function makeLicenceNumber(random: Random): string {
  return (
    charactersOf(random, LETTERS, 1) +
    charactersOf(random, DIGITS, 3) +
    charactersOf(random, LETTERS + DIGITS, 5) +
    charactersOf(random, DIGITS, 1) +
    charactersOf(random, LETTERS + DIGITS, 1)
  );
}

/** An administrative number: eleven digits, the first not 0, such as "47036892815" */
export function makeAdministrativeNumber(random: Random): string {
  return charactersOf(random, DIGITS.slice(1), 1) + charactersOf(random, DIGITS, 10);
}

/** A German mobile number, such as "+49 151 23456789" */
export function makePhoneNumber(random: Random): string {
  return `+49 ${random.pick(MOBILE_PREFIXES)} ${charactersOf(random, DIGITS, random.int(7, 8))}`;
}

/** A house number from 1 to 120, now and then with a letter, such as "12" or "7a" */
export function makeHouseNumber(random: Random): string {
  const number = String(random.int(1, 120));
  return random.next() < 0.1 ? number + random.pick(['a', 'b', 'c']) : number;
}

/** A name part as an email's local part: lower case ASCII, "Müller" gives "mueller" */
function emailPart(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[^a-z0-9-]/g, '');
}

/** An email made from a name, such as "mia.schulz@example.org" */
export function makeEmail(random: Random, given: string, family: string): string {
  const local = `${emailPart(given)}.${emailPart(family)}`;
  const suffix = random.next() < 0.3 ? String(random.int(1, 99)) : '';
  return `${local}${suffix}@${random.pick(EMAIL_DOMAINS)}`;
}

// Names

/** A persona's name split at its first space: "Mia Schulz" gives "Mia" and "Schulz" */
export function nameParts(name: string): { given: string; family: string } {
  const trimmed = name.trim();
  const space = trimmed.indexOf(' ');
  if (space < 0) {
    return { given: trimmed, family: '' };
  }
  return { given: trimmed.slice(0, space), family: trimmed.slice(space + 1).trim() };
}

/**
 * `count` names ("Mia Schulz"), drawn at random: their given names differ from each other and
 * from those of the `taken` names, and so do their family names, so that every name and every
 * "<Given name>'s data" heading differs (FR-010). Throws a `RangeError` when the pools can't give
 * that many
 */
export function drawNames(random: Random, count: number, taken: readonly string[] = []): string[] {
  const takenParts = taken.map(nameParts);
  const givens = random
    .shuffle(GIVEN_NAMES)
    .filter((given) => !takenParts.some((parts) => parts.given === given));
  const families = random
    .shuffle(FAMILY_NAMES)
    .filter((family) => !takenParts.some((parts) => parts.family === family));
  if (count > givens.length || count > families.length) {
    throw new RangeError(`Not ${count} more different names`);
  }
  return Array.from({ length: count }, (_, index) => `${givens[index]} ${families[index]}`);
}

// Values by field

/** What one persona's values share, drawn once per persona, so that they belong together */
export interface SampleContext {
  given: string;
  family: string;
  home: HomeTown;
  street: string;
  houseNumber: string;
  birthPlace: BirthPlace;
}

/** A persona's shared sample data, with its given and family name from `name` ("Mia Schulz") */
export function makeSampleContext(random: Random, name: string): SampleContext {
  const { given, family } = nameParts(name);
  return {
    given,
    family,
    home: random.pick(HOME_TOWNS),
    street: random.pick(STREETS),
    houseNumber: makeHouseNumber(random),
    birthPlace: random.weighted(BIRTH_PLACES, BIRTH_PLACE_WEIGHTS),
  };
}

/** The value set's codes, or every code when `codes` is absent */
type Codes = readonly (string | number)[] | undefined;

/**
 * One code of `weights` by weight, among those in `codes`; a random one of `codes` when none of
 * `weights` is among them, and `null` when `codes` is empty
 */
function weightedCode<T extends string | number>(
  random: Random,
  weights: readonly (readonly [T, number])[],
  codes: Codes
): T | string | number | null {
  const allowed = codes ? weights.filter(([code]) => codes.includes(code)) : weights;
  if (allowed.length > 0) {
    return random.weighted(
      allowed.map(([code]) => code),
      allowed.map(([, weight]) => weight)
    );
  }
  return codes && codes.length > 0 ? random.pick(codes) : null;
}

/** `preferred` when it is among `codes`, a country by weight otherwise */
function countryOf(random: Random, preferred: string, codes: Codes): string | number | null {
  return !codes || codes.includes(preferred)
    ? preferred
    : weightedCode(random, COUNTRY_WEIGHTS, codes);
}

/** One or, now and then, two different nationalities by weight */
function nationalitiesOf(random: Random, codes: Codes): (string | number)[] {
  const first = weightedCode(random, COUNTRY_WEIGHTS, codes);
  if (first === null) {
    return [];
  }
  if (random.next() >= SECOND_NATIONALITY_CHANCE) {
    return [first];
  }
  const others = COUNTRY_WEIGHTS.filter(([code]) => code !== first);
  const second = weightedCode(
    random,
    others,
    codes?.filter((code) => code !== first) ?? others.map(([code]) => code)
  );
  return second === null ? [first] : [first, second];
}

/** A common combination of licence classes whose codes are all in `codes`; else one code */
function licenceClassesOf(random: Random, codes: Codes): (string | number)[] {
  const indices = LICENCE_CLASS_COMBINATIONS.map((_, index) => index).filter(
    (index) => !codes || LICENCE_CLASS_COMBINATIONS[index].every((code) => codes.includes(code))
  );
  if (indices.length > 0) {
    const index = random.weighted(
      indices,
      indices.map((each) => LICENCE_CLASS_WEIGHTS[each])
    );
    return [...LICENCE_CLASS_COMBINATIONS[index]];
  }
  return codes && codes.length > 0 ? [random.pick(codes)] : [];
}

/** The persona's address on one line, such as "Königstraße 12, 70173 Stuttgart" */
function addressOf(context: SampleContext): string {
  return `${context.street} ${context.houseNumber}, ${context.home.postalCode} ${context.home.town}`;
}

/** The makers of a plausible value, by variable key */
const SAMPLERS: Readonly<
  Record<string, (random: Random, context: SampleContext, codes: Codes) => PersonaValue>
> = {
  // Personal ID
  'pid.family_name': (_, context) => context.family,
  'pid.given_name': (_, context) => context.given,
  'pid.place_of_birth.country': (random, context, codes) =>
    countryOf(random, context.birthPlace.country, codes),
  'pid.place_of_birth.region': (_, context) => context.birthPlace.region,
  'pid.place_of_birth.locality': (_, context) => context.birthPlace.locality,
  'pid.nationalities': (random, _, codes) => nationalitiesOf(random, codes),
  'pid.address_formatted': (_, context) => addressOf(context),
  'pid.address_street_address': (_, context) => context.street,
  'pid.address_house_number': (_, context) => context.houseNumber,
  'pid.address_postal_code': (_, context) => context.home.postalCode,
  'pid.address_locality': (_, context) => context.home.town,
  'pid.address_region': () => HOME_REGION,
  'pid.address_country': (random, _, codes) => countryOf(random, HOME_COUNTRY, codes),
  'pid.personal_administrative_number': (random) => makeAdministrativeNumber(random),
  'pid.birth_family_name': (_, context) => context.family,
  'pid.birth_given_name': (_, context) => context.given,
  'pid.sex': (random, _, codes) => weightedCode(random, SEX_WEIGHTS, codes),
  'pid.email': (random, context) => makeEmail(random, context.given, context.family),
  'pid.phone_number': (random) => makePhoneNumber(random),
  'pid.document_number': (random) => makeIdCardNumber(random),
  'pid.issuing_authority': (_, context) => context.home.authority,
  'pid.issuing_country': (random, _, codes) => countryOf(random, HOME_COUNTRY, codes),
  'pid.issuing_jurisdiction': () => HOME_JURISDICTION,
  // Driving licence
  'mdl.family_name': (_, context) => context.family,
  'mdl.given_name': (_, context) => context.given,
  'mdl.issuing_country': (random, _, codes) => countryOf(random, HOME_COUNTRY, codes),
  'mdl.issuing_authority': (_, context) => context.home.authority,
  'mdl.document_number': (random) => makeLicenceNumber(random),
  'mdl.driving_privileges.classes': (random, _, codes) => licenceClassesOf(random, codes),
  'mdl.un_distinguishing_sign': () => HOME_UN_SIGN,
  'mdl.administrative_number': (random) => makeAdministrativeNumber(random),
  'mdl.sex': (random, _, codes) => weightedCode(random, SEX_WEIGHTS, codes),
  'mdl.eye_colour': (random, _, codes) => weightedCode(random, EYE_COLOUR_WEIGHTS, codes),
  'mdl.hair_colour': (random, _, codes) => weightedCode(random, HAIR_COLOUR_WEIGHTS, codes),
  'mdl.birth_place': (_, context) => context.birthPlace.locality,
  'mdl.resident_address': (_, context) => addressOf(context),
  'mdl.issuing_jurisdiction': () => HOME_JURISDICTION,
  'mdl.nationality': (random, _, codes) => weightedCode(random, COUNTRY_WEIGHTS, codes),
  'mdl.resident_city': (_, context) => context.home.town,
  'mdl.resident_state': () => HOME_REGION,
  'mdl.resident_postal_code': (_, context) => context.home.postalCode,
  'mdl.resident_country': (random, _, codes) => countryOf(random, HOME_COUNTRY, codes),
  'mdl.family_name_national_character': (_, context) => context.family,
  'mdl.given_name_national_character': (_, context) => context.given,
};

/**
 * The variable keys `sampleFor()` gives a value for: every text and enum field and part of the
 * catalog. Dates, numbers and class dates aren't among them
 */
export const SAMPLED_KEYS: readonly string[] = Object.keys(SAMPLERS);

/**
 * A plausible value for the persona field with this variable key (`PersonaField.key`), from the
 * persona's `context`: a text, an enum's code (a list of codes for "Nationality" of the Personal
 * ID and "Licence classes"), or `undefined` for a key not in `SAMPLED_KEYS`. For enums, `codes`
 * are the value set's codes: the value uses only them, preferring plausible ones, and is `null`
 * (or `[]` for a list) when there are none
 */
export function sampleFor(
  key: string,
  random: Random,
  context: SampleContext,
  codes?: readonly (string | number)[]
): PersonaValue | undefined {
  const sampler = Object.hasOwn(SAMPLERS, key) ? SAMPLERS[key] : undefined;
  return sampler ? sampler(random, context, codes) : undefined;
}
