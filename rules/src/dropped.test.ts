import type { DocumentField, DocumentType } from '@connection-portal/api-types/document-types';
import { describe, expect, it } from 'vitest';

import { type DroppedData, droppedDataOf, droppedFieldLabel } from './dropped';

function catalogField(key: string, label: string): DocumentField {
  return {
    key,
    label,
    kind: 'text',
    option_set: null,
    date_of_birth: false,
    parts: null,
    multiple_values: false,
  };
}

const CATALOG: DocumentType[] = [
  {
    key: 'pid',
    label: 'Personal ID',
    fields: [
      catalogField('birthdate', 'Date of birth'),
      catalogField('nationalities', 'Nationalities'),
    ],
  },
  {
    key: 'mdl',
    label: 'Driving licence',
    fields: [catalogField('driving_privileges', 'Driving privileges')],
  },
];

const DOCUMENTS = [
  { document_type: 'pid', fields: ['eye_colour', 'birthdate', 'shoe_size'] },
  { document_type: 'residence_permit', fields: ['valid_until'] },
  { document_type: 'mdl', fields: ['driving_privileges'] },
];

const EYE_COLOUR: DroppedData = {
  documentType: 'pid',
  field: 'eye_colour',
  label: 'Personal ID – eye_colour',
};
const SHOE_SIZE: DroppedData = {
  documentType: 'pid',
  field: 'shoe_size',
  label: 'Personal ID – shoe_size',
};
const PERMIT: DroppedData = {
  documentType: 'residence_permit',
  field: null,
  label: 'residence_permit',
};

describe('droppedDataOf', () => {
  it('lists a dropped field with its document’s label, and a dropped document by its key', () => {
    expect(droppedDataOf(DOCUMENTS, CATALOG)).toEqual([EYE_COLOUR, SHOE_SIZE, PERMIT]);
  });

  it('lists nothing while the catalog offers everything', () => {
    expect(droppedDataOf([{ document_type: 'pid', fields: ['birthdate'] }], CATALOG)).toEqual([]);
    expect(droppedDataOf([], CATALOG)).toEqual([]);
  });

  it('lists a dropped document once, even without fields', () => {
    expect(droppedDataOf([{ document_type: 'gone', fields: [] }], CATALOG)).toEqual([
      { documentType: 'gone', field: null, label: 'gone' },
    ]);
  });

  it('labels a dropped field with its document’s label and its key', () => {
    expect(droppedFieldLabel('Personal ID', 'eye_colour')).toBe('Personal ID – eye_colour');
  });
});
