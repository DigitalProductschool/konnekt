// The test connections of the connection PDF (spec 011, quickstart §0; FR-045, SC-002), as the
// API shapes them: real catalog keys and labels, valid conditions, the server's invariants for a
// based variant's marks and inherited items (backend/app/services/rules.py, rules/src/branches.ts).
// A is the prototype's sample (prototype/data.mjs) as backend/tests/unit/test_versions.py holds
// it, with the same ids and content, so that its version is the backend's. Fiction about
// connections only: no finding, persona or citizen data. Pure: no browser API, no logging.
import type {
  DocumentField,
  DocumentType,
  FieldKind,
  FieldPart,
  PartKind,
} from '@connection-portal/api-types/document-types';
import type {
  Branch,
  BranchInput,
  Combinator,
  Condition,
  DraftCreate,
  FormConnection,
  FormConnectionCreate,
  FormConnectionDraft,
  GroupItem,
  Mark,
  RequestedDocument,
  RequestedDocumentView,
  RuleItem,
  RuleTarget,
  RuleTreeItem,
} from '@connection-portal/api-types/form-connections';
import type { OptionSet } from '@connection-portal/api-types/option-sets';
import { requestedRuleDocuments } from '@connection-portal/rules/conditions';
import type { Language } from '@connection-portal/rules/language';
import type { RuleContext } from '@connection-portal/rules/types';

// ---------------------------------------------------------------------------------------------
// The catalog (backend/app/catalog.py, option_sets.py): GET /api/document-types and
// GET /api/option-sets as they answer in English and in German

/** An English and a German text */
type Labels = readonly [en: string, de: string];

const LABEL_INDEX: Record<Language, 0 | 1> = { en: 0, de: 1 };

interface PartRow {
  key: string;
  labels: Labels;
  kind: PartKind;
  option_set?: string;
  per_licence_class?: boolean;
  multiple_values?: boolean;
}

interface FieldRow {
  key: string;
  labels: Labels;
  kind: FieldKind;
  /** The key of its data group */
  group: string;
  option_set?: string;
  date_of_birth?: boolean;
  multiple_values?: boolean;
  parts?: PartRow[];
}

interface DocumentRow {
  key: string;
  labels: Labels;
  /** The data groups in the panel's order: key, English, German */
  groups: (readonly [string, string, string])[];
  fields: FieldRow[];
}

type PartExtra = Pick<PartRow, 'option_set' | 'per_licence_class' | 'multiple_values'>;
type FieldExtra = Pick<FieldRow, 'option_set' | 'date_of_birth' | 'multiple_values' | 'parts'>;

function part(key: string, en: string, de: string, kind: PartKind, extra: PartExtra = {}): PartRow {
  return { key, labels: [en, de], kind, ...extra };
}

function row(
  key: string,
  en: string,
  de: string,
  kind: FieldKind,
  group: string,
  extra: FieldExtra = {}
): FieldRow {
  return { key, labels: [en, de], kind, group, ...extra };
}

const PID_ROW: DocumentRow = {
  key: 'pid',
  labels: ['Personal ID', 'Personalausweis'],
  groups: [
    ['name', 'Name', 'Name'],
    ['birth', 'Birth', 'Geburt'],
    ['address', 'Address', 'Adresse'],
    ['document', 'Document', 'Dokument'],
    ['other', 'Other details', 'Weitere Angaben'],
  ],
  fields: [
    row('family_name', 'Family name', 'Familienname', 'text', 'name'),
    row('given_name', 'Given name', 'Vorname', 'text', 'name'),
    row('birthdate', 'Date of birth', 'Geburtsdatum', 'date', 'birth', { date_of_birth: true }),
    row('place_of_birth', 'Place of birth', 'Geburtsort', 'parts', 'birth', {
      parts: [
        part('country', 'Country', 'Land', 'enum', { option_set: 'countries' }),
        part('region', 'Region', 'Region', 'text'),
        part('locality', 'City or town', 'Ort', 'text'),
      ],
    }),
    row('nationalities', 'Nationality', 'Staatsangehörigkeit', 'enum', 'birth', {
      option_set: 'countries',
      multiple_values: true,
    }),
    row('address_formatted', 'Address (full)', 'Adresse (vollständig)', 'text', 'address'),
    row(
      'address_street_address',
      'Street (may include the house number)',
      'Straße (kann die Hausnummer enthalten)',
      'text',
      'address'
    ),
    row('address_house_number', 'House number', 'Hausnummer', 'text', 'address'),
    row('address_postal_code', 'Postal code', 'Postleitzahl', 'text', 'address'),
    row('address_locality', 'City or town', 'Ort', 'text', 'address'),
    row('address_region', 'State or region', 'Bundesland oder Region', 'text', 'address'),
    row('address_country', 'Country of residence', 'Wohnsitzland', 'enum', 'address', {
      option_set: 'countries',
    }),
    row(
      'personal_administrative_number',
      'Personal administrative number',
      'Persönliche Verwaltungsnummer',
      'text',
      'other'
    ),
    row('picture', 'Photo', 'Foto', 'image', 'other'),
    row('birth_family_name', 'Family name at birth', 'Geburtsname', 'text', 'name'),
    row('birth_given_name', 'Given name at birth', 'Geburtsvorname', 'text', 'name'),
    row('sex', 'Sex', 'Geschlecht', 'enum', 'birth', { option_set: 'sex' }),
    row('email', 'Email address', 'E-Mail-Adresse', 'text', 'other'),
    row('phone_number', 'Mobile phone number', 'Mobilnummer', 'text', 'other'),
    row('document_number', 'Document number', 'Dokumentennummer', 'text', 'document'),
    row('date_of_issuance', 'Issue date', 'Ausstellungsdatum', 'date', 'document'),
    row('date_of_expiry', 'Expiry date', 'Ablaufdatum', 'date', 'document'),
    row('issuing_authority', 'Issuing authority', 'Ausstellende Behörde', 'text', 'document'),
    row('issuing_country', 'Issuing country', 'Ausstellungsland', 'enum', 'document', {
      option_set: 'countries',
    }),
    row(
      'issuing_jurisdiction',
      'Issuing jurisdiction',
      'Ausstellende Gebietskörperschaft',
      'text',
      'document'
    ),
  ],
};

const MDL_ROW: DocumentRow = {
  key: 'mdl',
  labels: ['Driving licence', 'Führerschein'],
  groups: [
    ['name', 'Name', 'Name'],
    ['birth', 'Birth', 'Geburt'],
    ['address', 'Address', 'Adresse'],
    ['document', 'Document', 'Dokument'],
    ['licence', 'Licence', 'Fahrerlaubnis'],
    ['appearance', 'Appearance', 'Aussehen'],
    ['other', 'Other details', 'Weitere Angaben'],
  ],
  fields: [
    row('family_name', 'Family name', 'Familienname', 'text', 'name'),
    row('given_name', 'Given name', 'Vorname', 'text', 'name'),
    row('birth_date', 'Date of birth', 'Geburtsdatum', 'date', 'birth', { date_of_birth: true }),
    row('issue_date', 'Issue date', 'Ausstellungsdatum', 'date', 'document'),
    row('expiry_date', 'Expiry date', 'Ablaufdatum', 'date', 'document'),
    row('issuing_country', 'Issuing country', 'Ausstellungsland', 'enum', 'document', {
      option_set: 'countries',
    }),
    row('issuing_authority', 'Issuing authority', 'Ausstellende Behörde', 'text', 'document'),
    row('document_number', 'Licence number', 'Führerscheinnummer', 'text', 'document'),
    row('portrait', 'Portrait', 'Lichtbild', 'image', 'appearance'),
    row('driving_privileges', 'Licence classes', 'Führerscheinklassen', 'parts', 'licence', {
      parts: [
        part('classes', 'Licence classes', 'Führerscheinklassen', 'enum', {
          option_set: 'licence_classes',
          multiple_values: true,
        }),
        part('issue_date', 'Issue date', 'Ausstellungsdatum', 'date', { per_licence_class: true }),
        part('expiry_date', 'Expiry date', 'Ablaufdatum', 'date', { per_licence_class: true }),
      ],
    }),
    row(
      'un_distinguishing_sign',
      'UN distinguishing sign',
      'Unterscheidungszeichen (UN)',
      'text',
      'licence'
    ),
    row('administrative_number', 'Administrative number', 'Verwaltungsnummer', 'text', 'licence'),
    row('sex', 'Sex', 'Geschlecht', 'enum', 'birth', { option_set: 'sex' }),
    row('height', 'Height (cm)', 'Körpergröße (cm)', 'number', 'appearance'),
    row('weight', 'Weight (kg)', 'Gewicht (kg)', 'number', 'appearance'),
    row('eye_colour', 'Eye colour', 'Augenfarbe', 'enum', 'appearance', {
      option_set: 'eye_colours',
    }),
    row('hair_colour', 'Hair colour', 'Haarfarbe', 'enum', 'appearance', {
      option_set: 'hair_colours',
    }),
    row('birth_place', 'Place of birth', 'Geburtsort', 'text', 'birth'),
    row('resident_address', 'Resident address', 'Wohnanschrift', 'text', 'address'),
    row(
      'portrait_capture_date',
      'Portrait capture date',
      'Aufnahmedatum des Lichtbilds',
      'date',
      'appearance'
    ),
    row('age_in_years', 'Age in years', 'Alter in Jahren', 'number', 'birth'),
    row('age_birth_year', 'Year of birth', 'Geburtsjahr', 'number', 'birth'),
    row(
      'issuing_jurisdiction',
      'Issuing jurisdiction',
      'Ausstellende Gebietskörperschaft',
      'text',
      'document'
    ),
    row('nationality', 'Nationality', 'Staatsangehörigkeit', 'enum', 'birth', {
      option_set: 'countries',
    }),
    row('resident_city', 'Resident city', 'Wohnort', 'text', 'address'),
    row('resident_state', 'Resident state', 'Bundesland des Wohnorts', 'text', 'address'),
    row(
      'resident_postal_code',
      'Resident postal code',
      'Postleitzahl des Wohnorts',
      'text',
      'address'
    ),
    row('resident_country', 'Resident country', 'Land des Wohnorts', 'enum', 'address', {
      option_set: 'countries',
    }),
    row(
      'family_name_national_character',
      'Family name (national characters)',
      'Familienname (nationale Schriftzeichen)',
      'text',
      'name'
    ),
    row(
      'given_name_national_character',
      'Given name (national characters)',
      'Vorname (nationale Schriftzeichen)',
      'text',
      'name'
    ),
    row(
      'signature_usual_mark',
      'Signature or usual mark',
      'Unterschrift oder übliches Zeichen',
      'image',
      'other'
    ),
  ],
};

const CATALOG: DocumentRow[] = [PID_ROW, MDL_ROW];

function fieldOf(entry: FieldRow, language: Language, group: string | null): DocumentField {
  const at = LABEL_INDEX[language];
  return {
    key: entry.key,
    label: entry.labels[at],
    kind: entry.kind,
    option_set: entry.option_set ?? null,
    date_of_birth: entry.date_of_birth ?? false,
    parts:
      entry.parts?.map((each): FieldPart => ({
        key: each.key,
        label: each.labels[at],
        kind: each.kind,
        option_set: each.option_set ?? null,
        per_licence_class: each.per_licence_class ?? false,
        multiple_values: each.multiple_values ?? false,
      })) ?? null,
    multiple_values: entry.multiple_values ?? false,
    group,
  };
}

function documentTypesIn(language: Language): DocumentType[] {
  const at = LABEL_INDEX[language];
  return CATALOG.map((document) => ({
    key: document.key,
    label: document.labels[at],
    fields: document.fields.map((entry) => fieldOf(entry, language, entry.group)),
    field_groups: document.groups.map(([key, ...labels]) => ({ key, label: labels[at] })),
  }));
}

/**
 * The catalog's Personal ID and Driving licence, every field, as GET /api/document-types answers
 * in each language (with the data groups)
 */
export const SAMPLE_DOCUMENT_TYPES: Record<Language, DocumentType[]> = {
  en: documentTypesIn('en'),
  de: documentTypesIn('de'),
};

/**
 * Requested documents as an answer shows them in `language` (`documents_view()`): the catalog's
 * labels, the fields in the order given, without data groups; a type or field the catalog doesn't
 * have keeps its key as its label
 */
export function documentViewsOf(
  documents: RequestedDocument[],
  language: Language = 'en'
): RequestedDocumentView[] {
  return documents.map((document) => {
    const known = CATALOG.find((entry) => entry.key === document.document_type);
    return {
      document_type: document.document_type,
      label: known ? known.labels[LABEL_INDEX[language]] : document.document_type,
      fields: document.fields.map((key) => {
        const entry = known?.fields.find((each) => each.key === key);
        return entry
          ? fieldOf(entry, language, null)
          : {
              key,
              label: key,
              kind: 'image',
              option_set: null,
              date_of_birth: false,
              parts: null,
              multiple_values: false,
              group: null,
            };
      }),
    };
  });
}

/** ISO 3166-1 alpha-2, the 249 countries of the `countries` set: code, English, German */
const COUNTRY_ROWS: (readonly [string, string, string])[] = [
  ['AF', 'Afghanistan', 'Afghanistan'],
  ['AX', 'Åland Islands', 'Åland'],
  ['AL', 'Albania', 'Albanien'],
  ['DZ', 'Algeria', 'Algerien'],
  ['AS', 'American Samoa', 'Amerikanisch-Samoa'],
  ['AD', 'Andorra', 'Andorra'],
  ['AO', 'Angola', 'Angola'],
  ['AI', 'Anguilla', 'Anguilla'],
  ['AQ', 'Antarctica', 'Antarktis'],
  ['AG', 'Antigua and Barbuda', 'Antigua und Barbuda'],
  ['AR', 'Argentina', 'Argentinien'],
  ['AM', 'Armenia', 'Armenien'],
  ['AW', 'Aruba', 'Aruba'],
  ['AU', 'Australia', 'Australien'],
  ['AT', 'Austria', 'Österreich'],
  ['AZ', 'Azerbaijan', 'Aserbaidschan'],
  ['BS', 'Bahamas', 'Bahamas'],
  ['BH', 'Bahrain', 'Bahrain'],
  ['BD', 'Bangladesh', 'Bangladesch'],
  ['BB', 'Barbados', 'Barbados'],
  ['BY', 'Belarus', 'Belarus'],
  ['BE', 'Belgium', 'Belgien'],
  ['BZ', 'Belize', 'Belize'],
  ['BJ', 'Benin', 'Benin'],
  ['BM', 'Bermuda', 'Bermuda'],
  ['BT', 'Bhutan', 'Bhutan'],
  ['BO', 'Bolivia', 'Bolivien'],
  ['BQ', 'Bonaire, Sint Eustatius and Saba', 'Bonaire, Sint Eustatius und Saba'],
  ['BA', 'Bosnia and Herzegovina', 'Bosnien und Herzegowina'],
  ['BW', 'Botswana', 'Botsuana'],
  ['BV', 'Bouvet Island', 'Bouvetinsel'],
  ['BR', 'Brazil', 'Brasilien'],
  ['IO', 'British Indian Ocean Territory', 'Britisches Territorium im Indischen Ozean'],
  ['VG', 'British Virgin Islands', 'Britische Jungferninseln'],
  ['BN', 'Brunei', 'Brunei Darussalam'],
  ['BG', 'Bulgaria', 'Bulgarien'],
  ['BF', 'Burkina Faso', 'Burkina Faso'],
  ['BI', 'Burundi', 'Burundi'],
  ['CV', 'Cabo Verde', 'Cabo Verde'],
  ['KH', 'Cambodia', 'Kambodscha'],
  ['CM', 'Cameroon', 'Kamerun'],
  ['CA', 'Canada', 'Kanada'],
  ['KY', 'Cayman Islands', 'Kaimaninseln'],
  ['CF', 'Central African Republic', 'Zentralafrikanische Republik'],
  ['TD', 'Chad', 'Tschad'],
  ['CL', 'Chile', 'Chile'],
  ['CN', 'China', 'China'],
  ['CX', 'Christmas Island', 'Weihnachtsinsel'],
  ['CC', 'Cocos (Keeling) Islands', 'Kokosinseln'],
  ['CO', 'Colombia', 'Kolumbien'],
  ['KM', 'Comoros', 'Komoren'],
  ['CG', 'Congo', 'Kongo'],
  ['CK', 'Cook Islands', 'Cookinseln'],
  ['CR', 'Costa Rica', 'Costa Rica'],
  ['CI', 'Côte d’Ivoire', 'Côte d’Ivoire'],
  ['HR', 'Croatia', 'Kroatien'],
  ['CU', 'Cuba', 'Kuba'],
  ['CW', 'Curaçao', 'Curaçao'],
  ['CY', 'Cyprus', 'Zypern'],
  ['CZ', 'Czechia', 'Tschechien'],
  ['CD', 'Democratic Republic of the Congo', 'Kongo, Demokratische Republik'],
  ['DK', 'Denmark', 'Dänemark'],
  ['DJ', 'Djibouti', 'Dschibuti'],
  ['DM', 'Dominica', 'Dominica'],
  ['DO', 'Dominican Republic', 'Dominikanische Republik'],
  ['EC', 'Ecuador', 'Ecuador'],
  ['EG', 'Egypt', 'Ägypten'],
  ['SV', 'El Salvador', 'El Salvador'],
  ['GQ', 'Equatorial Guinea', 'Äquatorialguinea'],
  ['ER', 'Eritrea', 'Eritrea'],
  ['EE', 'Estonia', 'Estland'],
  ['SZ', 'Eswatini', 'Eswatini'],
  ['ET', 'Ethiopia', 'Äthiopien'],
  ['FK', 'Falkland Islands', 'Falklandinseln'],
  ['FO', 'Faroe Islands', 'Färöer'],
  ['FJ', 'Fiji', 'Fidschi'],
  ['FI', 'Finland', 'Finnland'],
  ['FR', 'France', 'Frankreich'],
  ['GF', 'French Guiana', 'Französisch-Guayana'],
  ['PF', 'French Polynesia', 'Französisch-Polynesien'],
  ['TF', 'French Southern Territories', 'Französische Süd- und Antarktisgebiete'],
  ['GA', 'Gabon', 'Gabun'],
  ['GM', 'Gambia', 'Gambia'],
  ['GE', 'Georgia', 'Georgien'],
  ['DE', 'Germany', 'Deutschland'],
  ['GH', 'Ghana', 'Ghana'],
  ['GI', 'Gibraltar', 'Gibraltar'],
  ['GR', 'Greece', 'Griechenland'],
  ['GL', 'Greenland', 'Grönland'],
  ['GD', 'Grenada', 'Grenada'],
  ['GP', 'Guadeloupe', 'Guadeloupe'],
  ['GU', 'Guam', 'Guam'],
  ['GT', 'Guatemala', 'Guatemala'],
  ['GG', 'Guernsey', 'Guernsey'],
  ['GN', 'Guinea', 'Guinea'],
  ['GW', 'Guinea-Bissau', 'Guinea-Bissau'],
  ['GY', 'Guyana', 'Guyana'],
  ['HT', 'Haiti', 'Haiti'],
  ['HM', 'Heard Island and McDonald Islands', 'Heard und McDonaldinseln'],
  ['HN', 'Honduras', 'Honduras'],
  ['HK', 'Hong Kong', 'Hongkong'],
  ['HU', 'Hungary', 'Ungarn'],
  ['IS', 'Iceland', 'Island'],
  ['IN', 'India', 'Indien'],
  ['ID', 'Indonesia', 'Indonesien'],
  ['IR', 'Iran', 'Iran'],
  ['IQ', 'Iraq', 'Irak'],
  ['IE', 'Ireland', 'Irland'],
  ['IM', 'Isle of Man', 'Insel Man'],
  ['IL', 'Israel', 'Israel'],
  ['IT', 'Italy', 'Italien'],
  ['JM', 'Jamaica', 'Jamaika'],
  ['JP', 'Japan', 'Japan'],
  ['JE', 'Jersey', 'Jersey'],
  ['JO', 'Jordan', 'Jordanien'],
  ['KZ', 'Kazakhstan', 'Kasachstan'],
  ['KE', 'Kenya', 'Kenia'],
  ['KI', 'Kiribati', 'Kiribati'],
  ['KW', 'Kuwait', 'Kuwait'],
  ['KG', 'Kyrgyzstan', 'Kirgisistan'],
  ['LA', 'Laos', 'Laos'],
  ['LV', 'Latvia', 'Lettland'],
  ['LB', 'Lebanon', 'Libanon'],
  ['LS', 'Lesotho', 'Lesotho'],
  ['LR', 'Liberia', 'Liberia'],
  ['LY', 'Libya', 'Libyen'],
  ['LI', 'Liechtenstein', 'Liechtenstein'],
  ['LT', 'Lithuania', 'Litauen'],
  ['LU', 'Luxembourg', 'Luxemburg'],
  ['MO', 'Macao', 'Macau'],
  ['MG', 'Madagascar', 'Madagaskar'],
  ['MW', 'Malawi', 'Malawi'],
  ['MY', 'Malaysia', 'Malaysia'],
  ['MV', 'Maldives', 'Malediven'],
  ['ML', 'Mali', 'Mali'],
  ['MT', 'Malta', 'Malta'],
  ['MH', 'Marshall Islands', 'Marshallinseln'],
  ['MQ', 'Martinique', 'Martinique'],
  ['MR', 'Mauritania', 'Mauretanien'],
  ['MU', 'Mauritius', 'Mauritius'],
  ['YT', 'Mayotte', 'Mayotte'],
  ['MX', 'Mexico', 'Mexiko'],
  ['FM', 'Micronesia', 'Mikronesien'],
  ['MD', 'Moldova', 'Moldau'],
  ['MC', 'Monaco', 'Monaco'],
  ['MN', 'Mongolia', 'Mongolei'],
  ['ME', 'Montenegro', 'Montenegro'],
  ['MS', 'Montserrat', 'Montserrat'],
  ['MA', 'Morocco', 'Marokko'],
  ['MZ', 'Mozambique', 'Mosambik'],
  ['MM', 'Myanmar', 'Myanmar'],
  ['NA', 'Namibia', 'Namibia'],
  ['NR', 'Nauru', 'Nauru'],
  ['NP', 'Nepal', 'Nepal'],
  ['NL', 'Netherlands', 'Niederlande'],
  ['NC', 'New Caledonia', 'Neukaledonien'],
  ['NZ', 'New Zealand', 'Neuseeland'],
  ['NI', 'Nicaragua', 'Nicaragua'],
  ['NE', 'Niger', 'Niger'],
  ['NG', 'Nigeria', 'Nigeria'],
  ['NU', 'Niue', 'Niue'],
  ['NF', 'Norfolk Island', 'Norfolkinsel'],
  ['KP', 'North Korea', 'Nordkorea'],
  ['MK', 'North Macedonia', 'Nordmazedonien'],
  ['MP', 'Northern Mariana Islands', 'Nördliche Marianen'],
  ['NO', 'Norway', 'Norwegen'],
  ['OM', 'Oman', 'Oman'],
  ['PK', 'Pakistan', 'Pakistan'],
  ['PW', 'Palau', 'Palau'],
  ['PS', 'Palestine', 'Palästinensische Gebiete'],
  ['PA', 'Panama', 'Panama'],
  ['PG', 'Papua New Guinea', 'Papua-Neuguinea'],
  ['PY', 'Paraguay', 'Paraguay'],
  ['PE', 'Peru', 'Peru'],
  ['PH', 'Philippines', 'Philippinen'],
  ['PN', 'Pitcairn Islands', 'Pitcairninseln'],
  ['PL', 'Poland', 'Polen'],
  ['PT', 'Portugal', 'Portugal'],
  ['PR', 'Puerto Rico', 'Puerto Rico'],
  ['QA', 'Qatar', 'Katar'],
  ['RE', 'Réunion', 'Réunion'],
  ['RO', 'Romania', 'Rumänien'],
  ['RU', 'Russia', 'Russland'],
  ['RW', 'Rwanda', 'Ruanda'],
  ['BL', 'Saint Barthélemy', 'Saint-Barthélemy'],
  [
    'SH',
    'Saint Helena, Ascension and Tristan da Cunha',
    'St. Helena, Ascension und Tristan da Cunha',
  ],
  ['KN', 'Saint Kitts and Nevis', 'St. Kitts und Nevis'],
  ['LC', 'Saint Lucia', 'St. Lucia'],
  ['MF', 'Saint Martin (French part)', 'Saint-Martin (französischer Teil)'],
  ['PM', 'Saint Pierre and Miquelon', 'Saint-Pierre und Miquelon'],
  ['VC', 'Saint Vincent and the Grenadines', 'St. Vincent und die Grenadinen'],
  ['WS', 'Samoa', 'Samoa'],
  ['SM', 'San Marino', 'San Marino'],
  ['ST', 'São Tomé and Príncipe', 'São Tomé und Príncipe'],
  ['SA', 'Saudi Arabia', 'Saudi-Arabien'],
  ['SN', 'Senegal', 'Senegal'],
  ['RS', 'Serbia', 'Serbien'],
  ['SC', 'Seychelles', 'Seychellen'],
  ['SL', 'Sierra Leone', 'Sierra Leone'],
  ['SG', 'Singapore', 'Singapur'],
  ['SX', 'Sint Maarten (Dutch part)', 'Sint Maarten (niederländischer Teil)'],
  ['SK', 'Slovakia', 'Slowakei'],
  ['SI', 'Slovenia', 'Slowenien'],
  ['SB', 'Solomon Islands', 'Salomonen'],
  ['SO', 'Somalia', 'Somalia'],
  ['ZA', 'South Africa', 'Südafrika'],
  [
    'GS',
    'South Georgia and the South Sandwich Islands',
    'Südgeorgien und die Südlichen Sandwichinseln',
  ],
  ['KR', 'South Korea', 'Südkorea'],
  ['SS', 'South Sudan', 'Südsudan'],
  ['ES', 'Spain', 'Spanien'],
  ['LK', 'Sri Lanka', 'Sri Lanka'],
  ['SD', 'Sudan', 'Sudan'],
  ['SR', 'Suriname', 'Suriname'],
  ['SJ', 'Svalbard and Jan Mayen', 'Svalbard und Jan Mayen'],
  ['SE', 'Sweden', 'Schweden'],
  ['CH', 'Switzerland', 'Schweiz'],
  ['SY', 'Syria', 'Syrien'],
  ['TW', 'Taiwan', 'Taiwan'],
  ['TJ', 'Tajikistan', 'Tadschikistan'],
  ['TZ', 'Tanzania', 'Tansania'],
  ['TH', 'Thailand', 'Thailand'],
  ['TL', 'Timor-Leste', 'Timor-Leste'],
  ['TG', 'Togo', 'Togo'],
  ['TK', 'Tokelau', 'Tokelau'],
  ['TO', 'Tonga', 'Tonga'],
  ['TT', 'Trinidad and Tobago', 'Trinidad und Tobago'],
  ['TN', 'Tunisia', 'Tunesien'],
  ['TR', 'Türkiye', 'Türkei'],
  ['TM', 'Turkmenistan', 'Turkmenistan'],
  ['TC', 'Turks and Caicos Islands', 'Turks- und Caicosinseln'],
  ['TV', 'Tuvalu', 'Tuvalu'],
  ['UG', 'Uganda', 'Uganda'],
  ['UA', 'Ukraine', 'Ukraine'],
  ['AE', 'United Arab Emirates', 'Vereinigte Arabische Emirate'],
  ['GB', 'United Kingdom', 'Vereinigtes Königreich'],
  ['US', 'United States', 'Vereinigte Staaten'],
  ['UM', 'United States Minor Outlying Islands', 'Kleinere Amerikanische Überseeinseln'],
  ['VI', 'United States Virgin Islands', 'Amerikanische Jungferninseln'],
  ['UY', 'Uruguay', 'Uruguay'],
  ['UZ', 'Uzbekistan', 'Usbekistan'],
  ['VU', 'Vanuatu', 'Vanuatu'],
  ['VA', 'Vatican City', 'Vatikanstadt'],
  ['VE', 'Venezuela', 'Venezuela'],
  ['VN', 'Vietnam', 'Vietnam'],
  ['WF', 'Wallis and Futuna', 'Wallis und Futuna'],
  ['EH', 'Western Sahara', 'Westsahara'],
  ['YE', 'Yemen', 'Jemen'],
  ['ZM', 'Zambia', 'Sambia'],
  ['ZW', 'Zimbabwe', 'Simbabwe'],
];

/** An option: its value, its English and German label and description */
type OptionRow = readonly [
  value: string | number,
  en: string,
  de: string,
  descriptionEn?: string,
  descriptionDe?: string,
];

const SEX_ROWS: OptionRow[] = [
  [0, 'Not known', 'Unbekannt'],
  [1, 'Male', 'Männlich'],
  [2, 'Female', 'Weiblich'],
  [3, 'Other', 'Anderes'],
  [4, 'Inter', 'Inter'],
  [5, 'Diverse', 'Divers'],
  [6, 'Open', 'Offen'],
  [9, 'Not applicable', 'Nicht zutreffend'],
];

const LICENCE_CLASS_ROWS: OptionRow[] = [
  ['AM', 'AM', 'AM', 'Mopeds up to 45 km/h', 'Kleinkrafträder bis 45 km/h'],
  ['A1', 'A1', 'A1', 'Light motorcycles up to 125 cm³', 'Leichtkrafträder bis 125 cm³'],
  ['A2', 'A2', 'A2', 'Motorcycles up to 35 kW', 'Krafträder bis 35 kW'],
  ['A', 'A', 'A', 'All motorcycles', 'Krafträder'],
  ['B1', 'B1', 'B1', 'Quadricycles up to 15 kW', 'Vierrädrige Kraftfahrzeuge bis 15 kW'],
  ['B', 'B', 'B', 'Cars up to 3.5 t', 'Pkw bis 3,5 t'],
  ['BE', 'BE', 'BE', 'Car with a heavy trailer', 'Pkw mit schwerem Anhänger'],
  ['C1', 'C1', 'C1', 'Trucks 3.5–7.5 t', 'Lkw 3,5–7,5 t'],
  ['C1E', 'C1E', 'C1E', 'C1 with a heavy trailer', 'C1 mit schwerem Anhänger'],
  ['C', 'C', 'C', 'Trucks over 3.5 t', 'Lkw über 3,5 t'],
  ['CE', 'CE', 'CE', 'C with a heavy trailer', 'C mit schwerem Anhänger'],
  ['D1', 'D1', 'D1', 'Minibuses up to 16 passengers', 'Kleinbusse bis 16 Fahrgäste'],
  ['D1E', 'D1E', 'D1E', 'D1 with a heavy trailer', 'D1 mit schwerem Anhänger'],
  ['D', 'D', 'D', 'Buses', 'Busse'],
  ['DE', 'DE', 'DE', 'D with a heavy trailer', 'D mit schwerem Anhänger'],
  ['L', 'L', 'L', 'Tractors up to 40 km/h', 'Zugmaschinen bis 40 km/h'],
  ['T', 'T', 'T', 'Tractors up to 60 km/h', 'Zugmaschinen bis 60 km/h'],
];

const EYE_COLOUR_ROWS: OptionRow[] = [
  ['black', 'Black', 'Schwarz'],
  ['blue', 'Blue', 'Blau'],
  ['brown', 'Brown', 'Braun'],
  ['dichromatic', 'Dichromatic', 'Zweifarbig'],
  ['grey', 'Grey', 'Grau'],
  ['green', 'Green', 'Grün'],
  ['hazel', 'Hazel', 'Haselnussbraun'],
  ['maroon', 'Maroon', 'Rotbraun'],
  ['pink', 'Pink', 'Rosa'],
  ['unknown', 'Unknown', 'Unbekannt'],
];

const HAIR_COLOUR_ROWS: OptionRow[] = [
  ['bald', 'Bald', 'Kahl'],
  ['black', 'Black', 'Schwarz'],
  ['blond', 'Blond', 'Blond'],
  ['brown', 'Brown', 'Braun'],
  ['grey', 'Grey', 'Grau'],
  ['red', 'Red', 'Rot'],
  ['auburn', 'Auburn', 'Kastanienbraun'],
  ['sandy', 'Sandy', 'Rotblond'],
  ['white', 'White', 'Weiß'],
  ['unknown', 'Unknown', 'Unbekannt'],
];

const OPTION_ROWS: Record<string, readonly OptionRow[]> = {
  countries: COUNTRY_ROWS,
  sex: SEX_ROWS,
  licence_classes: LICENCE_CLASS_ROWS,
  eye_colours: EYE_COLOUR_ROWS,
  hair_colours: HAIR_COLOUR_ROWS,
};

function optionSetsIn(language: Language): OptionSet[] {
  const at = LABEL_INDEX[language];
  return Object.entries(OPTION_ROWS).map(([key, rows]) => ({
    key,
    options: rows.map(([value, en, de, descriptionEn, descriptionDe]) => ({
      value,
      label: [en, de][at],
      description: [descriptionEn, descriptionDe][at] ?? null,
    })),
  }));
}

/** Every value set, as GET /api/option-sets answers in each language */
export const SAMPLE_OPTION_SETS: Record<Language, OptionSet[]> = {
  en: optionSetsIn('en'),
  de: optionSetsIn('de'),
};

/** The 249 country codes, in the set's order */
const ALL_COUNTRIES: string[] = COUNTRY_ROWS.map(([code]) => code);

/**
 * The rule context that validation (`firstProblem()`, `publishProblems()`) takes for a
 * connection or draft: the requested documents with only their requested fields, from the
 * catalog in `language` (`requestedRuleDocuments()`), the value sets and the language
 */
export function sampleRuleContext(
  connection: { documents: RequestedDocumentView[] },
  language: Language = 'en'
): RuleContext {
  const requested = connection.documents.map((document) => ({
    document_type: document.document_type,
    fields: document.fields.map((field) => field.key),
  }));
  return {
    documents: requestedRuleDocuments(SAMPLE_DOCUMENT_TYPES[language], requested),
    optionSets: SAMPLE_OPTION_SETS[language],
    language,
  };
}

// ---------------------------------------------------------------------------------------------
// Building rules

function target(
  documentType: string,
  field: string,
  partKey: string | null = null,
  licenceClass: string | null = null
): RuleTarget {
  return { document_type: documentType, field, part: partKey, licence_class: licenceClass };
}

function rule(
  number: number,
  name: string,
  ruleTarget: RuleTarget | null,
  condition: Condition | null,
  message: string,
  mark: Mark | null = null
): RuleItem {
  return { type: 'rule', id: `rule-${number}`, name, mark, target: ruleTarget, condition, message };
}

function group(
  number: number,
  name: string,
  operator: Combinator,
  items: RuleTreeItem[],
  message: string | null,
  mark: Mark | null = null
): GroupItem {
  return { type: 'group', id: `group-${number}`, name, mark, operator, message, items };
}

function yearsAgo(years: number): Condition {
  return { operator: 'at_least_years_ago', years };
}

/** The connection's URLs as the server makes them (`trigger_url_of()`, `pull_url_of()`) */
const CONNECT_BASE = 'https://connect.stuttgart.example/api/connect';

function publishedBranches(connectionId: string, branches: BranchInput[]): Branch[] {
  return branches.map((branch) => {
    const id = branch.id ?? '';
    const isMain = branch.origin === 'main';
    const base = `${CONNECT_BASE}/${connectionId}`;
    return {
      ...branch,
      id,
      is_main: isMain,
      pull_url: isMain
        ? `${base}/requests/{reference}`
        : `${base}/branches/${id}/requests/{reference}`,
    };
  });
}

/** Requested documents as a create body sends them */
function requestedOf(documents: RequestedDocumentView[]): RequestedDocument[] {
  return documents.map((document) => ({
    document_type: document.document_type,
    fields: document.fields.map((field) => field.key),
  }));
}

/** Branches as a create body sends them: no id, so the server gives each a new one */
function branchesToSend(branches: BranchInput[]): BranchInput[] {
  return branches.map(({ id: _id, ...branch }) => ({ ...branch, id: null }));
}

// ---------------------------------------------------------------------------------------------
// A: the prototype's sample, published and active (backend/tests/unit/test_versions.py's SAMPLE)

const SAMPLE_ID = '3f9a1c2e-7b4d-4c1a-9e2f-5d8b6a0c4e71';
const STANDARD_ID = '5d0b8f6e-2c4a-4e1b-9f3d-7a6c5b4e3d2c';
const TAXI_ID = '0c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f';
const HIRE_CAR_ID = '9e8d7c6b-5a49-4382-a716-05f4e3d2c1b0';

/** The 27 member states of the EU, rule-8's values */
const EU_MEMBER_STATES = [
  'AT',
  'BE',
  'BG',
  'CY',
  'CZ',
  'DE',
  'DK',
  'EE',
  'ES',
  'FI',
  'FR',
  'GR',
  'HR',
  'HU',
  'IE',
  'IT',
  'LT',
  'LU',
  'LV',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SE',
  'SI',
  'SK',
];

/**
 * Personal ID and Driving licence, 12 data items, each document's fields in catalog order as
 * publishing stores them. The prototype's "Address" is the country of residence, which rule-9
 * checks, and its "City or town of residence" the city or town (`address_locality`)
 */
const SAMPLE_DOCUMENTS: RequestedDocument[] = [
  {
    document_type: 'pid',
    fields: [
      'family_name',
      'given_name',
      'birthdate',
      'place_of_birth',
      'nationalities',
      'address_locality',
      'address_country',
    ],
  },
  {
    document_type: 'mdl',
    fields: [
      'issue_date',
      'expiry_date',
      'issuing_authority',
      'document_number',
      'driving_privileges',
    ],
  },
];

const AGE = target('pid', 'birthdate');
const CLASSES = target('mdl', 'driving_privileges', 'classes');
const EXPIRY = target('mdl', 'expiry_date');

/** The issue date of a licence class */
function held(licenceClass: string): RuleTarget {
  return target('mdl', 'driving_privileges', 'issue_date', licenceClass);
}

function standardItems(): RuleTreeItem[] {
  return [
    rule(1, 'Minimum age', AGE, yearsAgo(21), 'You must be at least 21 years old to apply.'),
    rule(
      2,
      'Licence class B',
      CLASSES,
      { operator: 'includes_one_of', values: ['B'] },
      'You need a driving licence of class B.'
    ),
    group(
      1,
      'Licence held long enough',
      'or',
      [
        rule(
          3,
          'Class B for two years',
          held('B'),
          yearsAgo(2),
          'You must have held class B for at least two years.'
        ),
        rule(
          4,
          'Class BE for two years',
          held('BE'),
          yearsAgo(2),
          'You must have held class BE for at least two years.'
        ),
      ],
      'You must have held your driving licence for at least two years.'
    ),
    rule(
      5,
      'Licence still valid',
      EXPIRY,
      { operator: 'at_least_from_now', amount: 6, unit: 'months' },
      'Your driving licence must be valid for at least six more months.'
    ),
  ];
}

/**
 * Taxi, based on Standard: rule-1 changed, rule-5 removed, rule-6 and group-2 (with its sub-group
 * group-3) added, every member of the added group marked `added`. rule-6's six towns are one, as
 * a text is compared with one value
 */
function taxiItems(): RuleTreeItem[] {
  const [minimumAge, classB, heldLongEnough, stillValid] = standardItems();
  return [
    {
      ...(minimumAge as RuleItem),
      mark: 'changed',
      condition: yearsAgo(23),
      message: 'You must be at least 23 years old to drive a taxi.',
    },
    classB,
    heldLongEnough,
    { ...stillValid, mark: 'removed' },
    rule(
      6,
      'Lives in the region',
      target('pid', 'address_locality'),
      { operator: 'equal_to', value: 'Stuttgart', match_case: false },
      'Taxi licences are only issued to residents of the Stuttgart region.',
      'added'
    ),
    group(
      2,
      'Nationality or residence',
      'or',
      [
        rule(
          7,
          'German nationality',
          target('pid', 'nationalities'),
          { operator: 'includes_one_of', values: ['DE'] },
          'You need German nationality.',
          'added'
        ),
        group(
          3,
          'EU citizen living here',
          'and',
          [
            rule(
              8,
              'EU nationality',
              target('pid', 'nationalities'),
              { operator: 'includes_one_of', values: EU_MEMBER_STATES },
              'You need the nationality of an EU member state.',
              'added'
            ),
            rule(
              9,
              'Lives in Germany',
              target('pid', 'address_country'),
              { operator: 'includes_one_of', values: ['DE'] },
              'You need an address in Germany.',
              'added'
            ),
          ],
          null,
          'added'
        ),
      ],
      'You need German nationality, or an EU nationality and an address in Germany.',
      'added'
    ),
  ];
}

/** Hire car, with rules of its own; rule-12's "is after today" is a fixed day */
function hireCarItems(): RuleTreeItem[] {
  return [
    rule(10, 'Minimum age', AGE, yearsAgo(21), 'You must be at least 21 years old to apply.'),
    rule(
      11,
      'Licence class B',
      CLASSES,
      { operator: 'includes_one_of', values: ['B'] },
      'You need a driving licence of class B.'
    ),
    rule(
      12,
      'Licence still valid',
      EXPIRY,
      { operator: 'after', date: '2026-11-09' },
      'Your driving licence has expired.'
    ),
  ];
}

function sampleBranches(): BranchInput[] {
  const branch = (
    id: string,
    name: string,
    description: string | null,
    origin: BranchInput['origin'],
    items: RuleTreeItem[]
  ): BranchInput => ({
    id,
    name,
    description,
    origin,
    operator: 'and',
    operator_mark: null,
    items,
  });
  return [
    branch(STANDARD_ID, 'Standard', null, 'main', standardItems()),
    branch(
      TAXI_ID,
      'Taxi',
      'For taxi drivers licensed in Stuttgart: local residence and a higher minimum age.',
      'based',
      taxiItems()
    ),
    branch(
      HIRE_CAR_ID,
      'Hire car',
      'Private hire vehicles (Mietwagen): no residence rule, any EU licence.',
      'empty',
      hireCarItems()
    ),
  ];
}

const SAMPLE_NAME = 'Taxi and private hire driver licence';
const SAMPLE_DESCRIPTION =
  'Application for the passenger transport licence (Fahrerlaubnis zur Fahrgastbeförderung) on ' +
  'serviceBW, Stuttgart road traffic authority.';

/**
 * A: the prototype's sample, published and active, answered in English: 2 documents with 12 data
 * items; Standard; Taxi based on Standard with a changed, a removed and an added rule and an
 * added group; Hire car with rules of its own; 12 distinct rules. Its version is the backend's
 * for this content (test_versions.py, `SAMPLE_VERSION`)
 */
export const SAMPLE_PUBLISHED: FormConnection = {
  status: 'published',
  id: SAMPLE_ID,
  name: SAMPLE_NAME,
  description: SAMPLE_DESCRIPTION,
  is_active: true,
  documents: documentViewsOf(SAMPLE_DOCUMENTS),
  trigger_url: `${CONNECT_BASE}/${SAMPLE_ID}/requests`,
  pull_url: `${CONNECT_BASE}/${SAMPLE_ID}/requests/{reference}`,
  branches: publishedBranches(SAMPLE_ID, sampleBranches()),
  rule_set_version: 1,
  version_fingerprint: 'FA7E-47BB-5368',
  next_rule_number: 13,
  next_group_number: 4,
  created_at: '2026-11-02T08:15:00Z',
  updated_at: '2026-11-02T08:15:00Z',
  state: 'live',
  published_at: '2026-11-02T08:15:00Z',
  activated_at: '2026-11-02T08:15:00Z',
  deactivated_at: null,
  start_date: null,
  last_activity: null,
};

// ---------------------------------------------------------------------------------------------
// C and D: the sample as a stored draft

function draftOf(
  branches: BranchInput[],
  version: number,
  versionFingerprint: string,
  updatedAt: string
): FormConnectionDraft {
  return {
    status: 'draft',
    state: 'draft',
    id: SAMPLE_ID,
    name: SAMPLE_NAME,
    description: SAMPLE_DESCRIPTION,
    documents: documentViewsOf(SAMPLE_DOCUMENTS),
    branches,
    next_rule_number: 13,
    next_group_number: 4,
    step: 'rules',
    version,
    version_fingerprint: versionFingerprint,
    created_at: '2026-11-02T08:15:00Z',
    updated_at: updatedAt,
    last_activity: null,
    example: null,
  };
}

/**
 * The sample's branches with the prototype's two gaps (`draftOf()` in prototype/data.mjs and
 * test_versions.py's `_sample_draft()`): Hire car's rule-11 has no message, and rule-12 no check
 * (and no message, which the check's problem comes before)
 */
function branchesWithGaps(): BranchInput[] {
  const branches = sampleBranches();
  const [, classB, stillValid] = branches[2].items as RuleItem[];
  classB.message = '';
  stillValid.condition = null;
  stillValid.message = '';
  return branches;
}

/**
 * C: the sample as a draft under review, save number 7, with two gaps: Hire car's rule-11 without
 * a message and rule-12 without a check. Its version is the backend's for this content
 * (test_versions.py, `SAMPLE_DRAFT_VERSION`)
 */
export const SAMPLE_DRAFT_GAPS: FormConnectionDraft = draftOf(
  branchesWithGaps(),
  7,
  '3D3C-F9EA-5FE0',
  '2026-11-09T13:10:00Z'
);

/**
 * D: the same draft once its two gaps are filled as in A (the prototype's `completed()`), save
 * number 8: nothing refuses publishing. Its content is A's, so its version is A's
 */
export const SAMPLE_DRAFT: FormConnectionDraft = draftOf(
  sampleBranches(),
  8,
  'FA7E-47BB-5368',
  '2026-11-09T15:40:00Z'
);

// ---------------------------------------------------------------------------------------------
// E: a connection at the product's limits (FR-045; prototype/spike/src/pdf/big.js's shape)

const LARGEST_ID = '7d3e5f1a-2b4c-4d6e-8f0a-1b2c3d4e5f60';
const LARGEST_VARIANTS = 20;
/** Each block: a rule, then a group of 4 rules and a sub-group of 4 rules (10 items) */
const LARGEST_BLOCKS = 18;
/** Then 2 more rules: 18 × 10 + 2 = 200 items, 164 rules, 36 groups and sub-groups */
const LARGEST_LAST_RULES = 2;
/** The limits of saving: names, descriptions and messages (rules/src/constants.ts) */
const NAME_LENGTH = 100;
const CONNECTION_NAME_LENGTH = 200;
const TEXT_LENGTH = 500;

const FILLER =
  'and the documents the authority needs to see before it can decide on the application';

/** `text` continued with words to exactly `length` characters, without a space at its end */
function ofLength(text: string, length: number): string {
  let result = text;
  while (result.length < length) {
    result = `${result} ${FILLER}`;
  }
  return result.slice(0, length).trimEnd().padEnd(length, '.');
}

function largestBranchId(variant: number): string {
  return `e0a1b2c3-d4e5-4f60-8a71-${String(variant).padStart(12, '0')}`;
}

/** Rule n's condition: the requested data in turn, some with value lists */
function largestCondition(number: number): { target: RuleTarget; condition: Condition } {
  switch (number % 8) {
    case 0:
      return { target: AGE, condition: yearsAgo(18 + (number % 10)) };
    case 1:
      return {
        target: target('pid', 'nationalities'),
        condition: {
          operator: 'includes_one_of',
          values: EU_MEMBER_STATES.slice(0, number % 11 === 1 ? 12 : 3),
        },
      };
    case 2:
      return {
        target: target('pid', 'address_locality'),
        condition: { operator: 'equal_to', value: 'Stuttgart', match_case: false },
      };
    case 3:
      return {
        target: target('pid', 'address_country'),
        condition: { operator: 'includes_one_of', values: ['DE', 'AT', 'CH'] },
      };
    case 4:
      return { target: CLASSES, condition: { operator: 'includes_one_of', values: ['B', 'BE'] } };
    case 5:
      return { target: held('B'), condition: yearsAgo(2) };
    case 6:
      return {
        target: EXPIRY,
        condition: { operator: 'at_least_from_now', amount: 6, unit: 'months' },
      };
    default:
      return {
        target: target('mdl', 'issue_date'),
        condition: { operator: 'before', date: '2026-01-01' },
      };
  }
}

/** Rule n as `variant` has it: Standard's, or changed or removed in a based variant */
function largestRule(number: number, variant: number): RuleItem {
  const plainName = `Requirement ${number} for the licence holder`;
  const name = number % 9 === 0 ? ofLength(plainName, NAME_LENGTH) : plainName;
  const message =
    number % 25 === 0
      ? ofLength(
          `You need to meet requirement ${number} before the authority can process it`,
          TEXT_LENGTH
        )
      : `You must meet requirement ${number}: please check the documents you share with the wallet before applying.`;
  const { target: ruleTarget, condition } = largestCondition(number);
  const item = rule(number, name, ruleTarget, condition, message);
  if (variant === 0) {
    return item;
  }
  if ((number + variant) % 29 === 0) {
    return { ...item, mark: 'removed' };
  }
  if ((number + variant) % 13 === 0) {
    return {
      ...item,
      mark: 'changed',
      message: `In variant ${variant}, requirement ${number} has its own message for citizens.`,
    };
  }
  return item;
}

/** The rule on nationality with all 249 countries, a 100-character name and a 500-character message */
function nationalityRule(number: number): RuleItem {
  return rule(
    number,
    ofLength('Nationality of any country of the world', NAME_LENGTH),
    target('pid', 'nationalities'),
    { operator: 'includes_one_of', values: ALL_COUNTRIES },
    ofLength(
      'You need a nationality that the passenger transport authority recognises',
      TEXT_LENGTH
    )
  );
}

function largestItems(variant: number): RuleTreeItem[] {
  let ruleNumber = 0;
  let groupNumber = 0;
  const nextRule = (): RuleItem => {
    ruleNumber += 1;
    return largestRule(ruleNumber, variant);
  };
  const rules = (count: number): RuleItem[] => Array.from({ length: count }, nextRule);
  const items: RuleTreeItem[] = [];
  for (let block = 1; block <= LARGEST_BLOCKS; block += 1) {
    items.push(nextRule());
    groupNumber += 1;
    const groupId = groupNumber;
    const members: RuleTreeItem[] = rules(4);
    groupNumber += 1;
    const subGroupId = groupNumber;
    const subMembers = block === 1 ? [nationalityRule((ruleNumber += 1)), ...rules(3)] : rules(4);
    const subGroupChanged = variant > 0 && (block + variant) % 5 === 0;
    members.push(
      group(
        subGroupId,
        `Sub-group ${subGroupId} of alternative requirements`,
        subGroupChanged ? 'or' : 'and',
        subMembers,
        subGroupChanged ? `In variant ${variant}, one of these requirements is enough.` : null,
        subGroupChanged ? 'changed' : null
      )
    );
    const groupName = `Group ${groupId} of related requirements`;
    items.push(
      group(
        groupId,
        block % 5 === 0 ? ofLength(groupName, NAME_LENGTH) : groupName,
        block % 2 ? 'or' : 'and',
        members,
        block % 3
          ? `You must meet at least one of the requirements of group ${groupId}.`
          : ofLength(`You must meet the requirements of group ${groupId}`, TEXT_LENGTH),
        variant > 0 && (block + variant) % 7 === 0 ? 'removed' : null
      )
    );
  }
  items.push(...rules(LARGEST_LAST_RULES));
  return items;
}

function largestBranches(): BranchInput[] {
  return Array.from({ length: LARGEST_VARIANTS }, (_, variant): BranchInput => {
    // Variant 5 switches its top level's AND/OR
    const switched = variant === 5;
    return {
      id: largestBranchId(variant),
      name:
        variant === 0
          ? 'Standard'
          : ofLength(`Variant ${variant} for applicants from a district of the city`, NAME_LENGTH),
      description:
        variant === 0
          ? null
          : ofLength(
              `Applies to applicants from district ${variant}, with its own local requirements`,
              TEXT_LENGTH
            ),
      origin: variant === 0 ? 'main' : 'based',
      operator: switched ? 'or' : 'and',
      operator_mark: switched ? 'changed' : null,
      items: largestItems(variant),
    };
  });
}

/**
 * E: a published connection at the product's limits (FR-045), answered in English: Standard and
 * 19 variants based on it, each with 200 rules, groups and sub-groups (removed ones included):
 * 164 rules, 18 groups and 18 sub-groups. Its name has 200 characters and its description 500;
 * the variants' names 100 and descriptions 500; every ninth rule's name and every fifth group's
 * 100, every 25th rule's message and every third group's 500. The sub-group of group-1 holds a
 * rule on nationality with all 249 countries, a 100-character name and a 500-character message.
 * A based variant changes and removes some rules, removes some groups and changes some
 * sub-groups; variant 5 switches its top-level AND/OR. Requests A's documents
 */
export function largestConnection(): FormConnection {
  return {
    status: 'published',
    id: LARGEST_ID,
    name: ofLength(
      "A connection at the product's limits: twenty variants with two hundred rules and groups each",
      CONNECTION_NAME_LENGTH
    ),
    description: ofLength(
      'A synthetic connection for measuring the PDF at the limits',
      TEXT_LENGTH
    ),
    is_active: true,
    documents: documentViewsOf(SAMPLE_DOCUMENTS),
    trigger_url: `${CONNECT_BASE}/${LARGEST_ID}/requests`,
    pull_url: `${CONNECT_BASE}/${LARGEST_ID}/requests/{reference}`,
    branches: publishedBranches(LARGEST_ID, largestBranches()),
    rule_set_version: 1,
    version_fingerprint: 'EDD5-7EDC-E4FD',
    next_rule_number: 165,
    next_group_number: 37,
    created_at: '2026-11-03T10:00:00Z',
    updated_at: '2026-11-03T10:00:00Z',
    state: 'live',
    published_at: '2026-11-03T10:00:00Z',
    activated_at: '2026-11-03T10:00:00Z',
    deactivated_at: null,
    start_date: null,
    last_activity: null,
  };
}

// ---------------------------------------------------------------------------------------------
// The seed's bodies (T028, prototype/seed.ts)

/** A body for POST /api/form-connections: published, active at once */
export interface PublishSeed {
  path: '/api/form-connections';
  body: FormConnectionCreate;
}

/** A body for POST /api/form-connections/drafts */
export interface DraftSeed {
  path: '/api/form-connections/drafts';
  body: DraftCreate;
}

function publishSeed(connection: FormConnection): PublishSeed {
  return {
    path: '/api/form-connections',
    body: {
      name: connection.name,
      description: connection.description,
      documents: requestedOf(connection.documents),
      rules: {
        branches: branchesToSend(
          connection.branches.map(({ is_main: _main, pull_url: _url, ...branch }) => branch)
        ),
        numbering_base: { rule: 1, group: 1 },
        base_version: null,
      },
    },
  };
}

function draftSeed(draft: FormConnectionDraft): DraftSeed {
  return {
    path: '/api/form-connections/drafts',
    body: {
      name: draft.name,
      description: draft.description,
      documents: requestedOf(draft.documents),
      rules: { branches: branchesToSend(draft.branches), numbering_base: { rule: 1, group: 1 } },
      step: draft.step,
    },
  };
}

/**
 * The create bodies of the test connections, which the seed posts to the running backend. The
 * variants are sent without ids, so the server gives each new ones (a variant id is never
 * reused), and the identifiers are numbered from 1, so they stay as they are. The server gives
 * each connection its own id, so a seeded connection's version differs from its fixture's.
 *
 * - **A** published and active: `A`.
 * - **B** A deactivated: `A` posted again, then `POST /api/form-connections/{id}/deactivate`.
 * - **F** A scheduled (spec 010): `A`'s body with `start_date`, a day in Germany some days after
 *   the seed runs (YYYY-MM-DD), which the seed computes; no body of its own.
 * - **C** and **D** drafts: `C`, `D`.
 * - **E** published at the limits: `E`.
 */
export const SEED_BODIES: { A: PublishSeed; C: DraftSeed; D: DraftSeed; E: PublishSeed } = {
  A: publishSeed(SAMPLE_PUBLISHED),
  C: draftSeed(SAMPLE_DRAFT_GAPS),
  D: draftSeed(SAMPLE_DRAFT),
  E: publishSeed(largestConnection()),
};
