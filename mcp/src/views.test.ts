import type { DocumentField, DocumentType } from '@konnekt/api-types/document-types';
import type {
  ActivityEntry,
  ActivityKind,
  BranchInput,
  FormConnection,
  FormConnectionDraft,
  FormConnectionSummary,
  GroupItem,
  RequestedDocumentView,
  RuleItem,
} from '@konnekt/api-types/form-connections';
import { MDL, OPTION_SETS, PID, rule, target } from '@konnekt/rules/testData';
import { describe, expect, it } from 'vitest';

import { connectionLink, itemLink, variantLink } from './links';
import {
  ACTIVITY_EVENTS,
  activityEntryViewOf,
  activityEventOf,
  activityLineOf,
  activityPersonOf,
  applicantFieldsOf,
  connectionDatesLineOf,
  connectionFactsOf,
  connectionLineOf,
  connectionRefOf,
  connectionStateOf,
  connectionUrlsOf,
  droppedDataOf,
  droppedTextOf,
  EXAMPLE_LINE,
  fieldKeyOf,
  itemCountsOf,
  itemLineOf,
  itemRefOf,
  itemViewLinesOf,
  itemViewOf,
  ruleContextOf,
  stepLineOf,
  stepOf,
  summaryFactsLineOf,
  summaryFactsOf,
  summaryTextOf,
  unrequestedRulesOf,
  urlsNoteOf,
  urlsTextOf,
  variantLineOf,
  variantRefOf,
  versionLineOf,
} from './views';

// A fixture draft with Standard, a variant based on it and an empty variant. Standard checks the
// age, a licence group (class B, and class B held for two years) and the sex, which the draft
// doesn't request; Ambulance changes the age, adds a nationality rule and inherits the rest;
// Night shift started empty

const CONNECTION = '3f2b8c1e-5a4d-4e6f-9a7b-1c2d3e4f5a6b';
const STANDARD = '11111111-1111-4111-8111-111111111111';
const AMBULANCE = '22222222-2222-4222-8222-222222222222';
const NIGHT_SHIFT = '33333333-3333-4333-8333-333333333333';

const CATALOG: DocumentType[] = [PID, MDL];

/** The fixtures' version: publishing a draft unchanged keeps it (spec 011, research R12) */
const VERSION = '62D0-715F-01D1';

function fieldOf(documentType: DocumentType, key: string): DocumentField {
  const field = documentType.fields.find((entry) => entry.key === key);
  if (!field) {
    throw new Error(`No field ${key}`);
  }
  return field;
}

/** A field the catalog dropped, as the API shows it: its key as its label, unreadable */
function droppedField(key: string): DocumentField {
  return {
    key,
    label: key,
    kind: 'image',
    option_set: null,
    date_of_birth: false,
    parts: null,
    multiple_values: false,
  };
}

const DOCUMENTS: RequestedDocumentView[] = [
  {
    document_type: 'pid',
    label: 'Personal ID',
    fields: [fieldOf(PID, 'birthdate'), fieldOf(PID, 'nationalities'), droppedField('shoe_size')],
  },
  {
    document_type: 'mdl',
    label: 'Driving licence',
    fields: [fieldOf(MDL, 'driving_privileges')],
  },
  {
    document_type: 'residence_permit',
    label: 'residence_permit',
    fields: [droppedField('valid_until')],
  },
];

const AGE = rule(
  1,
  target('pid', 'birthdate'),
  { operator: 'at_least_years_ago', years: 21 },
  'You must be 21 or older.',
  'Age'
);
const CLASS_B = rule(2, target('mdl', 'driving_privileges', 'classes'), {
  operator: 'includes_one_of',
  values: ['B'],
});
const CLASS_B_SINCE = rule(3, target('mdl', 'driving_privileges', 'issue_date', 'B'), {
  operator: 'at_least_years_ago',
  years: 2,
});
const LICENCE: GroupItem = {
  type: 'group',
  id: 'group-1',
  name: 'Licence',
  mark: null,
  operator: 'or',
  message: 'You need a car licence.',
  items: [CLASS_B, CLASS_B_SINCE],
};
const SEX = rule(5, target('pid', 'sex'), { operator: 'includes_one_of', values: [2] });

function branch(
  id: string,
  name: string,
  origin: BranchInput['origin'],
  items: BranchInput['items']
): BranchInput {
  return { id, name, description: null, origin, operator: 'and', operator_mark: null, items };
}

const STANDARD_BRANCH = branch(STANDARD, 'Standard', 'main', [AGE, LICENCE, SEX]);
const CHANGED_AGE: RuleItem = {
  ...AGE,
  mark: 'changed',
  condition: { operator: 'at_least_years_ago', years: 18 },
};
const NATIONALITY: RuleItem = {
  ...rule(4, target('pid', 'nationalities'), { operator: 'includes_one_of', values: ['DE'] }),
  mark: 'added',
};
const AMBULANCE_BRANCH = branch(AMBULANCE, 'Ambulance', 'based', [
  CHANGED_AGE,
  LICENCE,
  SEX,
  NATIONALITY,
]);
const NIGHT_SHIFT_BRANCH = branch(NIGHT_SHIFT, 'Night shift', 'empty', []);

const DRAFT: FormConnectionDraft = {
  status: 'draft',
  state: 'draft',
  id: CONNECTION,
  name: 'Parking permit',
  description: '',
  documents: DOCUMENTS,
  branches: [STANDARD_BRANCH, AMBULANCE_BRANCH, NIGHT_SHIFT_BRANCH],
  next_rule_number: 6,
  next_group_number: 2,
  step: 'rules',
  version: 3,
  version_fingerprint: VERSION,
  created_at: '2026-11-01T10:00:00Z',
  updated_at: '2026-11-02T10:00:00Z',
  last_activity: null,
  example: null,
};

const TRIGGER_URL = `https://connect.example.org/api/connect/${CONNECTION}/requests`;
const pullUrl = (variant: string) =>
  `https://connect.example.org/api/connect/${CONNECTION}/requests/{reference}?variant=${variant}`;

const PUBLISHED: FormConnection = {
  status: 'published',
  id: CONNECTION,
  name: 'Parking permit',
  description: '',
  is_active: true,
  documents: DOCUMENTS,
  trigger_url: TRIGGER_URL,
  pull_url: pullUrl(STANDARD),
  branches: DRAFT.branches.map((entry) => ({
    ...entry,
    id: entry.id ?? '',
    is_main: entry.origin === 'main',
    pull_url: pullUrl(entry.id ?? ''),
  })),
  rule_set_version: 1,
  version_fingerprint: VERSION,
  next_rule_number: 6,
  next_group_number: 2,
  created_at: '2026-11-01T10:00:00Z',
  updated_at: '2026-11-02T10:00:00Z',
  state: 'live',
  published_at: '2026-11-01T10:00:00Z',
  activated_at: '2026-11-01T10:00:00Z',
  deactivated_at: null,
  start_date: null,
  last_activity: null,
};

/** The published connection, deactivated as the API answers it */
const DEACTIVATED: FormConnection = {
  ...PUBLISHED,
  is_active: false,
  state: 'deactivated',
  deactivated_at: '2026-11-03T10:00:00Z',
};

/** The published connection, scheduled as the API answers it (spec 010, research R1) */
const SCHEDULED: FormConnection = {
  ...PUBLISHED,
  is_active: false,
  state: 'scheduled',
  activated_at: null,
  start_date: '2026-12-01',
};

const CONTEXT = ruleContextOf(DOCUMENTS, CATALOG, OPTION_SETS);
const VIEW_CONTEXT = { connectionId: CONNECTION, rules: CONTEXT };

describe('refs', () => {
  it('gives a draft, a scheduled, a live and a deactivated connection their status and link', () => {
    const link = connectionLink(CONNECTION);
    expect(connectionRefOf(DRAFT)).toEqual({
      id: CONNECTION,
      name: 'Parking permit',
      status: 'draft',
      link,
    });
    expect(connectionRefOf(PUBLISHED).status).toBe('live');
    expect(connectionRefOf(DEACTIVATED).status).toBe('deactivated');
    expect(connectionRefOf(SCHEDULED).status).toBe('scheduled');
    const summary: FormConnectionSummary = {
      id: CONNECTION,
      name: 'Parking permit',
      description: '',
      is_active: true,
      status: 'draft',
      updated_at: '2026-11-02T10:00:00Z',
      state: 'draft',
      published_at: null,
      deactivated_at: null,
      start_date: null,
      step: 'rules',
      example: null,
    };
    // A draft's is_active means nothing
    expect(connectionRefOf(summary).status).toBe('draft');
  });

  it('reads the state the API derived, never is_active', () => {
    // A scheduled connection is inactive, as a deactivated one is: only `state` tells them apart
    const summary: FormConnectionSummary = {
      id: CONNECTION,
      name: 'Parking permit',
      description: '',
      is_active: false,
      status: 'published',
      updated_at: '2026-11-02T10:00:00Z',
      state: 'scheduled',
      published_at: '2026-11-01T10:00:00Z',
      deactivated_at: null,
      start_date: '2026-12-01',
      step: null,
      example: null,
    };
    expect(connectionStateOf(summary)).toBe('scheduled');
    expect(connectionStateOf({ ...summary, state: 'deactivated' })).toBe('deactivated');
    expect(connectionStateOf({ ...summary, state: 'live' })).toBe('live');
  });

  it('gives a variant and an item their links', () => {
    expect(variantRefOf(AMBULANCE_BRANCH, CONNECTION)).toEqual({
      id: AMBULANCE,
      name: 'Ambulance',
      link: variantLink(CONNECTION, AMBULANCE),
    });
    expect(itemRefOf(LICENCE, AMBULANCE_BRANCH, CONNECTION)).toEqual({
      id: 'group-1',
      type: 'group',
      name: 'Licence',
      link: itemLink(CONNECTION, AMBULANCE, 'group-1'),
    });
  });

  it('refuses a variant without an id, which a stored draft never has', () => {
    expect(() => variantRefOf({ ...STANDARD_BRANCH, id: null }, CONNECTION)).toThrow();
  });
});

describe('ruleContextOf', () => {
  it('builds the rules step’s catalog: the requested fields, the whole catalog, the sets', () => {
    expect(CONTEXT.documents.map((document) => document.key)).toEqual([
      'pid',
      'mdl',
      'residence_permit',
    ]);
    expect(CONTEXT.documents[0].fields.map((field) => field.key)).toEqual([
      'birthdate',
      'nationalities',
      'shoe_size',
    ]);
    expect(CONTEXT.allDocuments).toBe(CATALOG);
    expect(CONTEXT.optionSets).toBe(OPTION_SETS);
  });
});

describe('itemViewOf', () => {
  it('shows a rule with its statement, data, condition, message and link', () => {
    expect(itemViewOf(AGE, STANDARD_BRANCH, VIEW_CONTEXT)).toEqual({
      id: 'rule-1',
      type: 'rule',
      name: 'Age',
      statement: 'Personal ID · Date of birth (Age) is at least 21 years old',
      mark: null,
      link: itemLink(CONNECTION, STANDARD, 'rule-1'),
      target: { document_type: 'pid', field: 'birthdate' },
      condition: { operator: 'at_least_years_ago', years: 21 },
      message: 'You must be 21 or older.',
    });
  });

  it('shows a group with its AND/OR, message and members, linked to the variant', () => {
    const view = itemViewOf(LICENCE, AMBULANCE_BRANCH, VIEW_CONTEXT);
    expect(view).toMatchObject({
      id: 'group-1',
      type: 'group',
      name: 'Licence',
      statement: null,
      mark: null,
      link: itemLink(CONNECTION, AMBULANCE, 'group-1'),
      operator: 'or',
      message: 'You need a car licence.',
    });
    expect(view.items?.map((item) => [item.id, item.link, item.target?.field])).toEqual([
      ['rule-2', itemLink(CONNECTION, AMBULANCE, 'rule-2'), 'driving_privileges.classes'],
      ['rule-3', itemLink(CONNECTION, AMBULANCE, 'rule-3'), 'driving_privileges.issue_date#B'],
    ]);
    expect(view.items?.[1].statement).toBe(
      'Driving licence · Licence class B – Issue date is at least 2 years ago'
    );
  });

  it('shows a based variant’s marks', () => {
    expect(itemViewOf(CHANGED_AGE, AMBULANCE_BRANCH, VIEW_CONTEXT)).toMatchObject({
      mark: 'changed',
      statement: 'Personal ID · Date of birth (Age) is at least 18 years old',
    });
    expect(itemViewOf(NATIONALITY, AMBULANCE_BRANCH, VIEW_CONTEXT).mark).toBe('added');
  });

  it('reads a rule on data no longer requested from the whole catalog', () => {
    expect(itemViewOf(SEX, STANDARD_BRANCH, VIEW_CONTEXT).statement).toBe(
      'Personal ID · Sex includes one of Female'
    );
  });

  it('leaves out what an incomplete rule and a group without a message lack', () => {
    const empty = rule(6, null, null, '');
    expect(itemViewOf(empty, STANDARD_BRANCH, VIEW_CONTEXT)).toEqual({
      id: 'rule-6',
      type: 'rule',
      name: 'Rule 06',
      statement: null,
      mark: null,
      link: itemLink(CONNECTION, STANDARD, 'rule-6'),
      message: '',
    });
    const view = itemViewOf({ ...LICENCE, message: null }, STANDARD_BRANCH, VIEW_CONTEXT);
    expect(view).not.toHaveProperty('message');
  });

  it('names a field, a part and a licence class’s date as tools take them', () => {
    expect(fieldKeyOf(target('pid', 'birthdate'))).toBe('birthdate');
    expect(fieldKeyOf(target('pid', 'place_of_birth', 'country'))).toBe('place_of_birth.country');
    expect(fieldKeyOf(target('mdl', 'driving_privileges', 'issue_date', 'B'))).toBe(
      'driving_privileges.issue_date#B'
    );
  });
});

describe('unrequestedRulesOf', () => {
  it('names Standard’s rule on data no longer requested', () => {
    expect(unrequestedRulesOf(STANDARD_BRANCH, CONTEXT.documents, CONNECTION)).toEqual([
      {
        id: 'rule-5',
        type: 'rule',
        name: 'Rule 05',
        link: itemLink(CONNECTION, STANDARD, 'rule-5'),
      },
    ]);
  });

  it('names it once, for Standard, while a based variant inherits it unchanged', () => {
    expect(unrequestedRulesOf(AMBULANCE_BRANCH, CONTEXT.documents, CONNECTION)).toEqual([]);
    const changed = branch(AMBULANCE, 'Ambulance', 'based', [{ ...SEX, mark: 'changed' }]);
    expect(
      unrequestedRulesOf(changed, CONTEXT.documents, CONNECTION).map((ref) => ref.link)
    ).toEqual([itemLink(CONNECTION, AMBULANCE, 'rule-5')]);
  });

  it('names a rule on a field the catalog dropped', () => {
    const shoeSize = rule(7, target('pid', 'shoe_size'), null);
    const items = [shoeSize];
    expect(
      unrequestedRulesOf(
        branch(NIGHT_SHIFT, 'Night shift', 'empty', items),
        CONTEXT.documents,
        CONNECTION
      ).map((ref) => ref.id)
    ).toEqual(['rule-7']);
  });

  it('names nothing in an empty variant', () => {
    expect(unrequestedRulesOf(NIGHT_SHIFT_BRANCH, CONTEXT.documents, CONNECTION)).toEqual([]);
  });
});

describe('applicantFieldsOf', () => {
  it('lists the fields Standard’s rules check, in catalog order, with their kinds', () => {
    // The sex isn't requested: no citizen gives it, and the rule on it isn't checked
    expect(applicantFieldsOf(STANDARD_BRANCH, CONTEXT)).toEqual([
      {
        key: 'pid.birthdate',
        label: 'Personal ID · Date of birth (Age)',
        kind: 'date',
        multiple: false,
      },
      {
        key: 'mdl.driving_privileges.classes',
        label: 'Driving licence · Licence classes',
        kind: 'enum',
        option_set: 'licence_classes',
        multiple: true,
      },
      {
        key: 'mdl.driving_privileges.issue_date#B',
        label: 'Driving licence · Licence class B – Issue date',
        kind: 'date',
        multiple: false,
        licence_class: 'B',
      },
    ]);
  });

  it('adds the based variant’s own rule', () => {
    expect(applicantFieldsOf(AMBULANCE_BRANCH, CONTEXT).map((field) => field.key)).toEqual([
      'pid.birthdate',
      'pid.nationalities',
      'mdl.driving_privileges.classes',
      'mdl.driving_privileges.issue_date#B',
    ]);
    expect(applicantFieldsOf(AMBULANCE_BRANCH, CONTEXT)[1]).toEqual({
      key: 'pid.nationalities',
      label: 'Personal ID · Nationality',
      kind: 'enum',
      option_set: 'countries',
      multiple: true,
    });
  });

  it('lists nothing for an empty variant', () => {
    expect(applicantFieldsOf(NIGHT_SHIFT_BRANCH, CONTEXT)).toEqual([]);
  });
});

describe('droppedDataOf', () => {
  it('lists a dropped field with its document’s label, and a dropped document by its key', () => {
    expect(droppedDataOf(DOCUMENTS, CATALOG)).toEqual([
      { document_type: 'pid', field: 'shoe_size', label: 'Personal ID – shoe_size' },
      { document_type: 'residence_permit', field: null, label: 'residence_permit' },
    ]);
  });

  it('takes requested documents with field keys too', () => {
    expect(droppedDataOf([{ document_type: 'mdl', fields: ['height', 'wings'] }], CATALOG)).toEqual(
      [{ document_type: 'mdl', field: 'wings', label: 'Driving licence – wings' }]
    );
  });

  it('lists nothing while the catalog offers everything', () => {
    expect(droppedDataOf(DOCUMENTS.slice(1, 2), CATALOG)).toEqual([]);
  });
});

describe('stepOf', () => {
  it('is the rules step once any variant has a rule', () => {
    expect(stepOf(DRAFT)).toBe('rules');
    const basedOnly = [
      branch(STANDARD, 'Standard', 'main', []),
      NIGHT_SHIFT_BRANCH,
      AMBULANCE_BRANCH,
    ];
    expect(stepOf({ documents: [], branches: basedOnly })).toBe('rules');
  });

  it('is the documents step once a document is requested, without rules', () => {
    expect(stepOf({ documents: DOCUMENTS, branches: [NIGHT_SHIFT_BRANCH] })).toBe('documents');
  });

  it('is the connection step otherwise', () => {
    expect(stepOf({ documents: [], branches: [branch(STANDARD, 'Standard', 'main', [])] })).toBe(
      'connection'
    );
  });
});

describe('the dates and the step (spec 010, FR-062)', () => {
  const SUMMARY: Pick<
    FormConnectionSummary,
    'start_date' | 'published_at' | 'deactivated_at' | 'step' | 'example'
  > = {
    start_date: null,
    published_at: null,
    deactivated_at: null,
    step: null,
    example: null,
  };

  it("gives a search item a draft's step and nothing else", () => {
    const facts = summaryFactsOf({ ...SUMMARY, step: 'documents' });
    expect(facts).toEqual({ step: 'documents' });
    expect(summaryFactsLineOf(facts)).toBe('Draft at the documents step.');
  });

  it('gives a search item its published_at, and its deactivated_at while deactivated', () => {
    const live = summaryFactsOf({ ...SUMMARY, published_at: '2026-11-01T10:00:00Z' });
    expect(live).toEqual({ published_at: '2026-11-01T10:00:00Z' });
    expect(summaryFactsLineOf(live)).toBe('Published 2026-11-01T10:00:00Z.');
    const deactivated = summaryFactsOf({
      ...SUMMARY,
      published_at: '2026-11-01T10:00:00Z',
      deactivated_at: '2026-11-03T10:00:00Z',
    });
    expect(deactivated).toEqual({
      published_at: '2026-11-01T10:00:00Z',
      deactivated_at: '2026-11-03T10:00:00Z',
    });
    expect(summaryFactsLineOf(deactivated)).toBe(
      'Published 2026-11-01T10:00:00Z; deactivated 2026-11-03T10:00:00Z.'
    );
  });

  it('gives a scheduled search item its start_date, which the ref line names', () => {
    const facts = summaryFactsOf({
      ...SUMMARY,
      start_date: '2026-12-01',
      published_at: '2026-11-01T10:00:00Z',
    });
    expect(facts).toEqual({ start_date: '2026-12-01', published_at: '2026-11-01T10:00:00Z' });
    expect(summaryFactsLineOf(facts)).toBe('Published 2026-11-01T10:00:00Z.');
  });

  it('leaves a search item without a date or step without facts or a line', () => {
    expect(summaryFactsOf(SUMMARY)).toEqual({});
    expect(summaryFactsLineOf({})).toBeNull();
  });

  it("gives get_connection a draft's step and no dates", () => {
    const facts = connectionFactsOf(DRAFT);
    expect(facts).toEqual({ version_fingerprint: VERSION, step: 'rules' });
    expect(stepLineOf('rules')).toBe('Draft at the rules step.');
    expect(connectionDatesLineOf(facts)).toBeNull();
  });

  it('gives a live connection published_at and active_since, which reactivating moves', () => {
    const reactivated = { ...PUBLISHED, activated_at: '2026-11-05T10:00:00Z' };
    const facts = connectionFactsOf(reactivated);
    expect(facts).toEqual({
      version_fingerprint: VERSION,
      published_at: '2026-11-01T10:00:00Z',
      active_since: '2026-11-05T10:00:00Z',
    });
    expect(connectionDatesLineOf(facts)).toBe(
      'Published 2026-11-01T10:00:00Z; active since 2026-11-05T10:00:00Z.'
    );
  });

  it('gives a deactivated connection deactivated_since', () => {
    const facts = connectionFactsOf(DEACTIVATED);
    expect(facts).toEqual({
      version_fingerprint: VERSION,
      published_at: '2026-11-01T10:00:00Z',
      active_since: '2026-11-01T10:00:00Z',
      deactivated_since: '2026-11-03T10:00:00Z',
    });
    expect(connectionDatesLineOf(facts)).toContain('deactivated since 2026-11-03T10:00:00Z');
  });

  it('gives a scheduled connection its start_date, and no active_since while never active', () => {
    const facts = connectionFactsOf(SCHEDULED);
    expect(facts).toEqual({
      version_fingerprint: VERSION,
      start_date: '2026-12-01',
      published_at: '2026-11-01T10:00:00Z',
    });
    expect(connectionDatesLineOf(facts)).toBe('Published 2026-11-01T10:00:00Z.');
  });

  it('leaves start_date out for a live, a deactivated connection and a draft', () => {
    expect(connectionFactsOf(PUBLISHED)).not.toHaveProperty('start_date');
    expect(connectionFactsOf(DEACTIVATED)).not.toHaveProperty('start_date');
    expect(connectionFactsOf(DRAFT)).not.toHaveProperty('start_date');
  });
});

describe('the version (spec 011, research R12)', () => {
  it('gives get_connection the version of a published connection and of a draft', () => {
    expect(connectionFactsOf(PUBLISHED).version_fingerprint).toBe(VERSION);
    expect(connectionFactsOf(SCHEDULED).version_fingerprint).toBe(VERSION);
    expect(connectionFactsOf(DRAFT).version_fingerprint).toBe(VERSION);
  });

  it("copies the field as the API answers it, never the draft's save number", () => {
    const other = '0A1B-2C3D-4E5F';
    const facts = connectionFactsOf({ ...DRAFT, version: 7, version_fingerprint: other });
    expect(facts.version_fingerprint).toBe(other);
    expect(Object.values(facts)).not.toContain(7);
    expect(connectionFactsOf({ ...PUBLISHED, version_fingerprint: other })).toMatchObject({
      version_fingerprint: other,
    });
  });

  it('names it in the text block as the details page and the PDF show it', () => {
    expect(versionLineOf(VERSION)).toBe(
      'Version 62D0-715F-01D1, as the details page and the PDF show it.'
    );
  });
});

describe("the example's mark (spec 010, FR-062; research R7)", () => {
  it('marks a search item example: true while the mark is set, changed or not', () => {
    for (const example of ['unchanged', 'changed'] as const) {
      const facts = summaryFactsOf({
        start_date: null,
        published_at: null,
        deactivated_at: null,
        step: 'connection',
        example,
      });
      expect(facts).toEqual({ step: 'connection', example: true });
      expect(summaryFactsLineOf(facts)).toBe(
        'Draft at the connection step. This draft is the example.'
      );
    }
  });

  it('leaves example out of a search item that is not the example', () => {
    const facts = summaryFactsOf({
      start_date: null,
      published_at: null,
      deactivated_at: null,
      step: 'rules',
      example: null,
    });
    expect(facts).not.toHaveProperty('example');
    expect(summaryFactsLineOf(facts)).toBe('Draft at the rules step.');
  });

  it('gives get_connection the mark as stored, unchanged or changed', () => {
    expect(connectionFactsOf({ ...DRAFT, example: 'unchanged' })).toEqual({
      version_fingerprint: VERSION,
      step: 'rules',
      example: 'unchanged',
    });
    expect(connectionFactsOf({ ...DRAFT, example: 'changed' })).toEqual({
      version_fingerprint: VERSION,
      step: 'rules',
      example: 'changed',
    });
    expect(EXAMPLE_LINE).toBe('This draft is the example.');
  });

  it('leaves example out of a draft that is not the example and of a published connection', () => {
    expect(connectionFactsOf(DRAFT)).not.toHaveProperty('example');
    expect(connectionFactsOf(PUBLISHED)).not.toHaveProperty('example');
    expect(connectionFactsOf(SCHEDULED)).not.toHaveProperty('example');
  });
});

describe('connection URLs', () => {
  it('has none for a draft, and says when they exist', () => {
    expect(connectionUrlsOf(DRAFT)).toBeNull();
    expect(urlsNoteOf(DRAFT)).toBe('The connection URLs exist once the draft is published.');
  });

  it('lists the trigger URL and each variant’s pull URL, {reference} kept literally', () => {
    const urls = connectionUrlsOf(PUBLISHED);
    expect(urls).toEqual({
      trigger_url: TRIGGER_URL,
      variants: [
        {
          id: STANDARD,
          name: 'Standard',
          link: variantLink(CONNECTION, STANDARD),
          pull_url: pullUrl(STANDARD),
        },
        {
          id: AMBULANCE,
          name: 'Ambulance',
          link: variantLink(CONNECTION, AMBULANCE),
          pull_url: pullUrl(AMBULANCE),
        },
        {
          id: NIGHT_SHIFT,
          name: 'Night shift',
          link: variantLink(CONNECTION, NIGHT_SHIFT),
          pull_url: pullUrl(NIGHT_SHIFT),
        },
      ],
    });
    expect(urls?.variants[0].pull_url).toContain('{reference}');
    expect(urlsNoteOf(PUBLISHED)).toBe('This connection is live: serviceBW calls these URLs.');
  });

  it('keeps a deactivated connection’s URLs, which answer "unavailable"', () => {
    expect(connectionUrlsOf(DEACTIVATED)?.trigger_url).toBe(TRIGGER_URL);
    expect(urlsNoteOf(DEACTIVATED)).toBe(
      'This connection is deactivated: its URLs answer "unavailable" until it is reactivated.'
    );
  });

  it('keeps a scheduled connection’s URLs, which answer "unavailable" until its start', () => {
    expect(connectionUrlsOf(SCHEDULED)?.trigger_url).toBe(TRIGGER_URL);
    expect(urlsNoteOf(SCHEDULED)).toBe(
      'This connection is scheduled: its URLs answer "unavailable" until it becomes active on ' +
        '2026-12-01, 00:00 in Germany.'
    );
  });
});

describe('text blocks', () => {
  it('joins the lines given, without the empty ones', () => {
    expect(summaryTextOf('a', null, '', undefined, false, 'b')).toBe('a\nb');
  });

  it('names a connection, a variant and an item with their links', () => {
    expect(connectionLineOf(connectionRefOf(DRAFT))).toBe(
      `Connection 'Parking permit' (draft): ${connectionLink(CONNECTION)}`
    );
    expect(connectionLineOf(connectionRefOf(PUBLISHED), null)).toBe(
      `Connection 'Parking permit' (live): ${connectionLink(CONNECTION)}`
    );
    expect(variantLineOf(variantRefOf(AMBULANCE_BRANCH, CONNECTION))).toBe(
      `Variant 'Ambulance': ${variantLink(CONNECTION, AMBULANCE)}`
    );
    expect(itemLineOf(itemRefOf(LICENCE, STANDARD_BRANCH, CONNECTION))).toBe(
      `Group 'Licence' (group-1): ${itemLink(CONNECTION, STANDARD, 'group-1')}`
    );
  });

  it('names a scheduled connection with the day it becomes active', () => {
    expect(connectionLineOf(connectionRefOf(SCHEDULED), SCHEDULED.start_date)).toBe(
      `Connection 'Parking permit' (scheduled from 2026-12-01): ${connectionLink(CONNECTION)}`
    );
    // Without the day, the status alone
    expect(connectionLineOf(connectionRefOf(SCHEDULED))).toBe(
      `Connection 'Parking permit' (scheduled): ${connectionLink(CONNECTION)}`
    );
  });

  it('lists a variant’s items as an indented tree with their statements and marks', () => {
    const views = AMBULANCE_BRANCH.items.map((item) =>
      itemViewOf(item, AMBULANCE_BRANCH, VIEW_CONTEXT)
    );
    const link = (id: string) => itemLink(CONNECTION, AMBULANCE, id);
    expect(itemViewLinesOf(views)).toEqual([
      `- Age (rule-1, changed): Personal ID · Date of birth (Age) is at least 18 years old. ${link('rule-1')}`,
      `- Licence (group-1; one must be met): ${link('group-1')}`,
      `  - Rule 02 (rule-2): Driving licence · Licence classes includes one of B. ${link('rule-2')}`,
      `  - Rule 03 (rule-3): Driving licence · Licence class B – Issue date is at least 2 years ago. ${link('rule-3')}`,
      `- Rule 05 (rule-5): Personal ID · Sex includes one of Female. ${link('rule-5')}`,
      `- Rule 04 (rule-4, added): Personal ID · Nationality includes one of Germany. ${link('rule-4')}`,
    ]);
  });

  it('says what the catalog dropped, and what to do about it', () => {
    expect(droppedTextOf([])).toBeNull();
    expect(droppedTextOf(droppedDataOf(DOCUMENTS, CATALOG))).toBe(
      'The wallet no longer offers some data of this draft: Personal ID – shoe_size, ' +
        'residence_permit. Remove it with set_document before publishing.'
    );
  });

  it('lists the URLs after their note, or the note alone', () => {
    expect(urlsTextOf(null, urlsNoteOf(DRAFT))).toBe(urlsNoteOf(DRAFT));
    const text = urlsTextOf(connectionUrlsOf(PUBLISHED), urlsNoteOf(PUBLISHED));
    expect(text.split('\n')).toEqual([
      'This connection is live: serviceBW calls these URLs.',
      `Trigger URL: ${TRIGGER_URL}`,
      `Pull URL of 'Standard': ${pullUrl(STANDARD)}`,
      `Pull URL of 'Ambulance': ${pullUrl(AMBULANCE)}`,
      `Pull URL of 'Night shift': ${pullUrl(NIGHT_SHIFT)}`,
    ]);
  });
});

describe('itemCountsOf', () => {
  it('counts the rules and groups at every level', () => {
    expect(itemCountsOf(STANDARD_BRANCH.items)).toEqual({ rules: 4, groups: 1 });
    expect(itemCountsOf([])).toEqual({ rules: 0, groups: 0 });
  });
});

describe('the activity (spec 010, contracts/copy.md §3)', () => {
  const entry = (
    kind: ActivityKind,
    detail: Partial<Pick<ActivityEntry, 'variant' | 'start_date' | 'actor'>> = {}
  ): ActivityEntry => ({
    id: '44444444-4444-4444-8444-444444444444',
    kind,
    at: '2026-11-05T09:30:00Z',
    variant: null,
    start_date: null,
    actor: null,
    ...detail,
  });

  // copy.md §3's English column, word for word
  it.each<[string, ActivityEntry, string]>([
    ['created', entry('created'), 'Created'],
    ['renamed', entry('renamed'), 'Name changed'],
    ['description_changed', entry('description_changed'), 'Description changed'],
    ['documents_changed', entry('documents_changed'), 'Documents changed'],
    ['variant_added', entry('variant_added', { variant: 'Ambulance' }), 'Variant added: Ambulance'],
    [
      'variant_removed',
      entry('variant_removed', { variant: 'Ambulance' }),
      'Variant removed: Ambulance',
    ],
    [
      'variant_renamed',
      entry('variant_renamed', { variant: 'Night shift' }),
      'Variant renamed: Night shift',
    ],
    [
      'rules_changed',
      entry('rules_changed', { variant: 'Ambulance' }),
      'Rules changed in Ambulance',
    ],
    ['published', entry('published'), 'Published'],
    ['scheduled', entry('scheduled', { start_date: '2026-12-01' }), 'Scheduled for 2026-12-01'],
    [
      'start_date_changed to a date',
      entry('start_date_changed', { start_date: '2026-12-15' }),
      'Start date changed to 2026-12-15',
    ],
    ['start_date_changed to now', entry('start_date_changed'), 'Start date changed to now'],
    ['became_active', entry('became_active'), 'Became active'],
    ['deactivated', entry('deactivated'), 'Deactivated'],
    ['reactivated', entry('reactivated'), 'Activated again'],
    ['deleted', entry('deleted'), 'Deleted'],
    ['restored', entry('restored'), 'Restored'],
  ])('words %s as the card does', (_name, given, event) => {
    expect(activityEventOf(given)).toBe(event);
  });

  it('has an event for every kind, without a placeholder left', () => {
    for (const kind of Object.keys(ACTIVITY_EVENTS) as ActivityKind[]) {
      const event = activityEventOf(entry(kind, { variant: 'Standard', start_date: '2026-12-01' }));
      expect(event).not.toMatch(/[{}]/);
    }
  });

  it('answers a team member’s entry with by, and no agent', () => {
    const view = activityEntryViewOf(
      entry('rules_changed', {
        variant: 'Ambulance',
        actor: { name: 'anna', agent: null, approved: false },
      })
    );
    expect(view).toEqual({
      at: '2026-11-05T09:30:00Z',
      event: 'Rules changed in Ambulance',
      kind: 'rules_changed',
      variant: 'Ambulance',
      by: 'anna',
    });
    expect(activityPersonOf(view)).toBe('anna');
    expect(activityLineOf(view)).toBe('- 2026-11-05T09:30:00Z · Rules changed in Ambulance · anna');
  });

  it('answers an agent’s change with by and agent', () => {
    const view = activityEntryViewOf(
      entry('created', { actor: { name: 'anna', agent: 'Claude Code', approved: false } })
    );
    expect(view).toMatchObject({ by: 'anna', agent: 'Claude Code' });
    expect(view).not.toHaveProperty('approved');
    expect(activityPersonOf(view)).toBe('anna with Claude Code');
  });

  it('answers an approved request with by, agent and approved', () => {
    const view = activityEntryViewOf(
      entry('published', { actor: { name: 'ben', agent: 'Claude Code', approved: true } })
    );
    expect(view).toMatchObject({ by: 'ben', agent: 'Claude Code', approved: true });
    expect(activityPersonOf(view)).toBe('ben, asked by Claude Code');
    expect(activityLineOf(view)).toBe(
      '- 2026-11-05T09:30:00Z · Published · ben, asked by Claude Code'
    );
  });

  it('answers an entry without a person without by, agent or approved', () => {
    const view = activityEntryViewOf(entry('scheduled', { start_date: '2026-12-01' }));
    expect(view).toEqual({
      at: '2026-11-05T09:30:00Z',
      event: 'Scheduled for 2026-12-01',
      kind: 'scheduled',
      start_date: '2026-12-01',
    });
    expect(activityPersonOf(view)).toBeNull();
    expect(activityLineOf(view)).toBe('- 2026-11-05T09:30:00Z · Scheduled for 2026-12-01');
  });
});
