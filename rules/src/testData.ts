// Test data of the rules modules' tests: a part of backend/app/catalog.py and option_sets.py,
// with the same keys, labels and kinds
import type { DocumentField } from '@connection-portal/api-types/document-types';
import type {
  BranchInput,
  Condition,
  RuleItem,
  RuleTarget,
} from '@connection-portal/api-types/form-connections';
import type { OptionSet } from '@connection-portal/api-types/option-sets';

import type { RuleContext, RuleDocument } from './types';

function field(
  key: string,
  label: string,
  kind: DocumentField['kind'],
  extra: Partial<DocumentField> = {}
): DocumentField {
  return {
    key,
    label,
    kind,
    option_set: null,
    date_of_birth: false,
    parts: null,
    multiple_values: false,
    ...extra,
  };
}

export const PID: RuleDocument = {
  key: 'pid',
  label: 'Personal ID',
  fields: [
    field('family_name', 'Family name', 'text'),
    field('birthdate', 'Date of birth', 'date', { date_of_birth: true }),
    field('place_of_birth', 'Place of birth', 'parts', {
      parts: [
        {
          key: 'country',
          label: 'Country',
          kind: 'enum',
          option_set: 'countries',
          per_licence_class: false,
          multiple_values: false,
        },
        {
          key: 'region',
          label: 'Region',
          kind: 'text',
          option_set: null,
          per_licence_class: false,
          multiple_values: false,
        },
        {
          key: 'locality',
          label: 'City or town',
          kind: 'text',
          option_set: null,
          per_licence_class: false,
          multiple_values: false,
        },
      ],
    }),
    field('nationalities', 'Nationality', 'enum', {
      option_set: 'countries',
      multiple_values: true,
    }),
    field('address_locality', 'City or town', 'text'),
    field('address_country', 'Country of residence', 'enum', { option_set: 'countries' }),
    field('picture', 'Photo', 'image'),
    field('sex', 'Sex', 'enum', { option_set: 'sex' }),
    field('date_of_issuance', 'Issue date', 'date'),
    field('date_of_expiry', 'Expiry date', 'date'),
    field('issuing_country', 'Issuing country', 'enum', { option_set: 'countries' }),
  ],
};

export const MDL: RuleDocument = {
  key: 'mdl',
  label: 'Driving licence',
  fields: [
    field('birth_date', 'Date of birth', 'date', { date_of_birth: true }),
    field('issue_date', 'Issue date', 'date'),
    field('expiry_date', 'Expiry date', 'date'),
    field('portrait', 'Portrait', 'image'),
    field('driving_privileges', 'Licence classes', 'parts', {
      parts: [
        {
          key: 'classes',
          label: 'Licence classes',
          kind: 'enum',
          option_set: 'licence_classes',
          per_licence_class: false,
          multiple_values: true,
        },
        {
          key: 'issue_date',
          label: 'Issue date',
          kind: 'date',
          option_set: null,
          per_licence_class: true,
          multiple_values: false,
        },
        {
          key: 'expiry_date',
          label: 'Expiry date',
          kind: 'date',
          option_set: null,
          per_licence_class: true,
          multiple_values: false,
        },
      ],
    }),
    field('un_distinguishing_sign', 'UN distinguishing sign', 'text'),
    field('height', 'Height (cm)', 'number'),
    field('eye_colour', 'Eye colour', 'enum', { option_set: 'eye_colours' }),
    field('resident_city', 'Resident city', 'text'),
    field('nationality', 'Nationality', 'enum', { option_set: 'countries' }),
  ],
};

export const OPTION_SETS: OptionSet[] = [
  {
    key: 'countries',
    options: [
      { value: 'DE', label: 'Germany', description: null },
      { value: 'AT', label: 'Austria', description: null },
      { value: 'FR', label: 'France', description: null },
    ],
  },
  {
    key: 'sex',
    options: [
      { value: 0, label: 'Not known', description: null },
      { value: 1, label: 'Male', description: null },
      { value: 2, label: 'Female', description: null },
    ],
  },
  {
    key: 'licence_classes',
    options: [
      { value: 'A', label: 'A', description: 'All motorcycles' },
      { value: 'B', label: 'B', description: 'Cars up to 3.5 t' },
      { value: 'BE', label: 'BE', description: 'Car with a heavy trailer' },
      { value: 'C', label: 'C', description: 'Trucks over 3.5 t' },
    ],
  },
  {
    key: 'eye_colours',
    options: [
      { value: 'blue', label: 'Blue', description: null },
      { value: 'green', label: 'Green', description: null },
    ],
  },
];

/** Both documents with every field above requested. */
export const CONTEXT: RuleContext = { documents: [PID, MDL], optionSets: OPTION_SETS };

export function target(
  documentType: string,
  fieldKey: string,
  part: string | null = null,
  licenceClass: string | null = null
): RuleTarget {
  return { document_type: documentType, field: fieldKey, part, licence_class: licenceClass };
}

export function rule(
  number: number,
  ruleTarget: RuleTarget | null,
  condition: Condition | null,
  message = 'You must meet this rule.',
  name = `Rule ${String(number).padStart(2, '0')}`
): RuleItem {
  return {
    type: 'rule',
    id: `rule-${number}`,
    name,
    mark: null,
    target: ruleTarget,
    condition,
    message,
  };
}

/** US1's three rules (tasks.md, Phase 3). */
export const US1_RULES: RuleItem[] = [
  rule(1, target('pid', 'birthdate'), { operator: 'at_least_years_ago', years: 21 }),
  rule(2, target('mdl', 'driving_privileges', 'classes'), {
    operator: 'includes_one_of',
    values: ['B'],
  }),
  rule(3, target('mdl', 'driving_privileges', 'issue_date', 'B'), {
    operator: 'at_least_years_ago',
    years: 2,
  }),
];

export function mainBranch(items: BranchInput['items'] = US1_RULES): BranchInput {
  return {
    id: null,
    name: 'Standard',
    description: null,
    origin: 'main',
    operator: 'and',
    operator_mark: null,
    items,
  };
}
