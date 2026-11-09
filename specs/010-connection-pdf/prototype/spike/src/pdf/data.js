// A sample published connection, shaped like api-types' FormConnection, with the statements
// already composed (in the app they come from rules/src/statements.ts in the UI's language).
const BASE = 'https://connect.stuttgart.example/api/connect/3f9a1c2e-7b4d-4c1a-9e2f-5d8b6a0c4e71';

const rule = (id, name, subject, predicate, message, mark = null) => ({
  type: 'rule', id, name, mark, subject, predicate, message,
});
const group = (id, name, operator, items, message, mark = null) => ({
  type: 'group', id, name, operator, items, message, mark,
});

export const connection = {
  id: '3f9a1c2e-7b4d-4c1a-9e2f-5d8b6a0c4e71',
  name: 'Taxi and private hire driver licence',
  description:
    'Application for the passenger transport licence (Fahrerlaubnis zur Fahrgastbeförderung) on serviceBW, Stuttgart road traffic authority.',
  is_active: true,
  trigger_url: `${BASE}/requests`,
  documents: [
    {
      document_type: 'pid',
      label: 'Personal ID',
      fields: [
        ['family_name', 'Family name'],
        ['given_name', 'Given names'],
        ['birth_date', 'Date of birth'],
        ['place_of_birth', 'Place of birth'],
        ['nationality', 'Nationality'],
        ['address', 'Address'],
        ['resident_city', 'City or town of residence'],
      ],
    },
    {
      document_type: 'mdl',
      label: 'Driving licence',
      fields: [
        ['document_number', 'Licence number'],
        ['driving_privileges', 'Licence classes'],
        ['issue_date', 'Issue date'],
        ['expiry_date', 'Expiry date'],
        ['issuing_authority', 'Issuing authority'],
      ],
    },
  ],
  branches: [
    {
      id: 'b-main',
      name: 'Standard',
      description: null,
      origin: 'main',
      operator: 'and',
      operator_mark: null,
      pull_url: `${BASE}/requests/{reference}`,
      items: [
        rule('rule-1', 'Minimum age', 'Personal ID · Date of birth (Age)', 'is at least 21 years old',
          'You must be at least 21 years old to apply.'),
        rule('rule-2', 'Licence class B', 'Driving licence · Licence classes', 'include B',
          'You need a driving licence of class B.'),
        group('group-1', 'Licence held long enough', 'or', [
          rule('rule-3', 'Class B for two years', 'Driving licence · Licence class B – Issue date',
            'is at least 2 years ago', 'You must have held class B for at least two years.'),
          rule('rule-4', 'Class BE for two years', 'Driving licence · Licence class BE – Issue date',
            'is at least 2 years ago', 'You must have held class BE for at least two years.'),
        ], 'You must have held your driving licence for at least two years.'),
        rule('rule-5', 'Licence still valid', 'Driving licence · Expiry date',
          'is at least 6 months from now',
          'Your driving licence must be valid for at least six more months.'),
      ],
    },
    {
      id: '0c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
      name: 'Taxi',
      description: 'For taxi drivers licensed in Stuttgart: local residence and a higher minimum age.',
      origin: 'based',
      operator: 'and',
      operator_mark: null,
      pull_url: `${BASE}/branches/0c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f/requests/{reference}`,
      items: [
        rule('rule-1', 'Minimum age', 'Personal ID · Date of birth (Age)', 'is at least 23 years old',
          'You must be at least 23 years old to drive a taxi.', 'changed'),
        rule('rule-2', 'Licence class B', 'Driving licence · Licence classes', 'include B',
          'You need a driving licence of class B.'),
        group('group-1', 'Licence held long enough', 'or', [
          rule('rule-3', 'Class B for two years', 'Driving licence · Licence class B – Issue date',
            'is at least 2 years ago', 'You must have held class B for at least two years.'),
          rule('rule-4', 'Class BE for two years', 'Driving licence · Licence class BE – Issue date',
            'is at least 2 years ago', 'You must have held class BE for at least two years.'),
        ], 'You must have held your driving licence for at least two years.'),
        rule('rule-5', 'Licence still valid', 'Driving licence · Expiry date',
          'is at least 6 months from now',
          'Your driving licence must be valid for at least six more months.', 'removed'),
        rule('rule-6', 'Lives in the region', 'Personal ID · City or town of residence',
          'is one of “Stuttgart”, “Esslingen am Neckar”, “Ludwigsburg”, “Böblingen”, “Waiblingen”, “Leonberg”',
          'Taxi licences are only issued to residents of the Stuttgart region.', 'added'),
        group('group-2', 'Nationality or residence', 'or', [
          rule('rule-7', 'German nationality', 'Personal ID · Nationality', 'is “Germany”', 'You need German nationality.'),
          group('group-3', 'EU citizen living here', 'and', [
            rule('rule-8', 'EU nationality', 'Personal ID · Nationality',
              'is one of the 27 EU member states', 'You need the nationality of an EU member state.'),
            rule('rule-9', 'Lives in Germany', 'Personal ID · Address – Country', 'is “Germany”', 'You need an address in Germany.'),
          ], null),
        ], 'You need German nationality, or an EU nationality and an address in Germany.', 'added'),
      ],
    },
    {
      id: '9e8d7c6b-5a49-4382-a716-05f4e3d2c1b0',
      name: 'Hire car',
      description: 'Private hire vehicles (Mietwagen): no residence rule, any EU licence.',
      origin: 'empty',
      operator: 'and',
      operator_mark: null,
      pull_url: `${BASE}/branches/9e8d7c6b-5a49-4382-a716-05f4e3d2c1b0/requests/{reference}`,
      items: [
        rule('rule-10', 'Minimum age', 'Personal ID · Date of birth (Age)', 'is at least 21 years old',
          'You must be at least 21 years old to apply.'),
        rule('rule-11', 'Licence class B', 'Driving licence · Licence classes', 'include B',
          'You need a driving licence of class B.'),
        rule('rule-12', 'Licence still valid', 'Driving licence · Expiry date', 'is after today',
          'Your driving licence has expired.'),
      ],
    },
  ],
};

/**
 * The same connection as a stored draft under review (spec 005): no URLs, no status, its save
 * counter and last save; rule-11 has no message yet and rule-12 no check
 */
export function draftOf(published) {
  const copy = structuredClone(published);
  delete copy.trigger_url;
  delete copy.is_active;
  copy.branches.forEach((branch) => delete branch.pull_url);
  const hire = copy.branches[2];
  hire.items[1].message = '';
  hire.items[2].predicate = null;
  hire.items[2].message = '';
  return { ...copy, status: 'draft', version: 7, updated_at: '2026-11-09T13:10:00Z' };
}

/** The draft once its two gaps are filled as in the published sample */
export function completed(draft, published) {
  const copy = structuredClone(draft);
  copy.branches[2].items = structuredClone(published.branches[2].items);
  return copy;
}
