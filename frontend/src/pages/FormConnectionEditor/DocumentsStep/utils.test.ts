import type { DocumentField, DocumentType } from '@connection-portal/api-types/document-types';
import type { RequestedDocument } from '@connection-portal/api-types/form-connections';
import { US1_RULES } from '@connection-portal/rules/testData';
import { describe, expect, it } from 'vitest';

import type { RulesBranch } from '../RulesStep/types';
import type { PendingRemoval } from '../types';
import { DOCUMENT_GLYPHS, DOCUMENTS_COPY, GENERIC_DOCUMENT_GLYPHS } from './constants';
import type {
  DragPointerType,
  DragRowBox,
  GroupedFields,
  RowDragEvent,
  RowDragState,
} from './types';
import {
  dataCountOf,
  dataCountText,
  documentGlyphOf,
  documentMenuOf,
  documentsNeedingData,
  dragOffsetOf,
  dragPointerTypeOf,
  dropLineOf,
  dropTargetOf,
  fieldsAfterGroupToggle,
  groupCheckStateOf,
  groupedFieldsOf,
  indexAfterAdding,
  indexAfterRemoval,
  inSentence,
  listedDocumentsOf,
  listIdsOf,
  listText,
  moveAnnouncementOf,
  moveTargetsOf,
  needsDataOf,
  needsDataText,
  noDataText,
  noDataTitle,
  pagerOf,
  removalDialogCopyOf,
  removalDialogOf,
  removeDocumentsLabel,
  ROW_DRAG_HOLD_MS,
  ROW_DRAG_IDLE,
  ROW_DRAG_THRESHOLD_PX,
  rowDragReducer,
  ruleListText,
  rulesCheckingDocument,
  searchCardHeight,
  searchGroupsOf,
  shownDocumentOf,
  shownIndexOf,
  touchDragArmed,
  waitsForHold,
} from './utils';

function field(key: string): DocumentField {
  return {
    key,
    label: key,
    kind: 'text',
    option_set: null,
    date_of_birth: false,
    parts: null,
    multiple_values: false,
  };
}

const PID: DocumentType = {
  key: 'pid',
  label: 'Personal ID',
  fields: ['family_name', 'given_name', 'birthdate', 'nationalities'].map(field),
};
const MDL: DocumentType = {
  key: 'mdl',
  label: 'Driving licence',
  fields: ['driving_privileges', 'issue_date', 'expiry_date'].map(field),
};
const EHIC: DocumentType = {
  key: 'ehic',
  label: 'Health insurance card',
  fields: ['card_number'].map(field),
};
const CATALOG = [PID, MDL, EHIC];

describe('listedDocumentsOf (the list, F23)', () => {
  it('keeps the editor’s order and pairs each document with its catalog entry', () => {
    const documents = [
      { document_type: 'pid', fields: [] },
      { document_type: 'mdl', fields: ['issue_date'] },
    ];
    expect(listedDocumentsOf(documents, CATALOG)).toEqual([
      { document: documents[0], documentType: PID },
      { document: documents[1], documentType: MDL },
    ]);
  });

  it('leaves out a document the catalog no longer offers, which the note lists (W6)', () => {
    const documents = [
      { document_type: 'residence_permit', fields: ['valid_until'] },
      { document_type: 'ehic', fields: [] },
    ];
    expect(listIdsOf(listedDocumentsOf(documents, CATALOG))).toEqual(['ehic']);
  });
});

describe('shownIndexOf and shownDocumentOf', () => {
  it('keeps the selection inside the list', () => {
    expect(shownIndexOf(1, 3)).toBe(1);
    expect(shownIndexOf(5, 2)).toBe(1);
    expect(shownIndexOf(-2, 2)).toBe(0);
    expect(shownIndexOf(3, 0)).toBe(0);
  });

  it('gives the shown document, or null for an empty list', () => {
    const listed = listedDocumentsOf(
      [
        { document_type: 'pid', fields: [] },
        { document_type: 'mdl', fields: [] },
      ],
      CATALOG
    );
    expect(shownDocumentOf(listed, 1)?.documentType).toBe(MDL);
    expect(shownDocumentOf(listed, 4)?.documentType).toBe(MDL);
    expect(shownDocumentOf([], 0)).toBeNull();
  });
});

describe('pagerOf ("Document n of m")', () => {
  it('reads the shown document’s place, counting from 1', () => {
    expect(pagerOf(1, 2, 'en').text).toBe('Document 2 of 2');
    expect(pagerOf(0, 1, 'en').text).toBe('Document 1 of 1');
  });

  it('disables the previous arrow on the first document and the next on the last', () => {
    expect(pagerOf(0, 1, 'en')).toEqual({
      index: 0,
      text: 'Document 1 of 1',
      previousIndex: null,
      nextIndex: null,
    });
    expect(pagerOf(1, 2, 'en')).toMatchObject({ previousIndex: 0, nextIndex: null });
    expect(pagerOf(1, 3, 'en')).toMatchObject({ previousIndex: 0, nextIndex: 2 });
  });

  it('reads a selection past the end as the last document', () => {
    expect(pagerOf(4, 2, 'en')).toMatchObject({ index: 1, text: 'Document 2 of 2' });
  });

  it('reads „Dokument n von m“ in German', () => {
    expect(pagerOf(1, 2, 'de').text).toBe('Dokument 2 von 2');
  });

  it('has no text without a document', () => {
    expect(pagerOf(0, 0, 'en')).toEqual({
      index: 0,
      text: '',
      previousIndex: null,
      nextIndex: null,
    });
  });
});

describe('indexAfterRemoval', () => {
  const LIST = ['pid', 'mdl', 'ehic'];

  it('keeps the shown document shown', () => {
    expect(indexAfterRemoval(LIST, 2, ['pid'])).toBe(1);
    expect(indexAfterRemoval(LIST, 0, ['ehic'])).toBe(0);
  });

  it('gives the shown document’s place to the next one, or to the previous at the end', () => {
    expect(indexAfterRemoval(LIST, 1, ['mdl'])).toBe(1);
    expect(indexAfterRemoval(LIST, 2, ['ehic'])).toBe(1);
    expect(indexAfterRemoval(LIST, 1, ['mdl', 'ehic'])).toBe(0);
  });

  it('is 0 once nothing is left', () => {
    expect(indexAfterRemoval(LIST, 1, LIST)).toBe(0);
    expect(indexAfterRemoval([], 0, ['pid'])).toBe(0);
  });
});

describe('indexAfterAdding (the team’s order, FR-045)', () => {
  it('places an added document at the end, not at its catalog place', () => {
    expect(indexAfterAdding([], 'mdl')).toBe(0);
    expect(indexAfterAdding(['pid'], 'mdl')).toBe(1);
    // Personal ID comes first in the catalog, but goes last
    expect(indexAfterAdding(['mdl', 'ehic'], 'pid')).toBe(2);
    expect(indexAfterAdding(['pid', 'ehic'], 'mdl')).toBe(2);
  });

  it('places a restored document at the index it had, clamped to the list', () => {
    expect(indexAfterAdding(['ehic', 'mdl'], 'pid', 1)).toBe(1);
    expect(indexAfterAdding(['ehic', 'mdl'], 'pid', 0)).toBe(0);
    expect(indexAfterAdding(['ehic'], 'pid', 2)).toBe(1);
    expect(indexAfterAdding(['ehic'], 'pid', -1)).toBe(0);
  });

  it('gives a listed document’s own index', () => {
    expect(indexAfterAdding(['pid', 'mdl'], 'mdl')).toBe(1);
    expect(indexAfterAdding(['pid', 'mdl'], 'mdl', 0)).toBe(1);
  });
});

describe('searchGroupsOf (the search card; FR-031, FR-052e)', () => {
  const pidAdded = [{ document_type: 'pid', fields: [] }];

  it('lists the documents not added as "Available" and the added ones as "Added"', () => {
    expect(searchGroupsOf(CATALOG, pidAdded, '')).toEqual({
      available: [MDL, EHIC],
      added: [PID],
      noMatches: false,
    });
    expect(searchGroupsOf(CATALOG, [], '')).toEqual({
      available: CATALOG,
      added: [],
      noMatches: false,
    });
  });

  it('filters both groups by the name, ignoring letter case and the spaces around (U20 A3)', () => {
    expect(searchGroupsOf(CATALOG, pidAdded, 'ce')).toEqual({
      available: [MDL, EHIC],
      added: [],
      noMatches: false,
    });
    expect(searchGroupsOf(CATALOG, pidAdded, '  PERSONAL ')).toEqual({
      available: [],
      added: [PID],
      noMatches: false,
    });
  });

  it('keeps catalog order whatever order the documents were added in', () => {
    const added = [
      { document_type: 'ehic', fields: [] },
      { document_type: 'pid', fields: [] },
    ];
    expect(searchGroupsOf(CATALOG, added, '').added).toEqual([PID, EHIC]);
  });

  it('has no match when a query finds nothing (U20 A4)', () => {
    expect(searchGroupsOf(CATALOG, pidAdded, 'taxi')).toEqual({
      available: [],
      added: [],
      noMatches: true,
    });
    expect(DOCUMENTS_COPY.en.noMatches('taxi')).toBe('No documents match “taxi”.');
  });

  it('counts a query of spaces as no query', () => {
    expect(searchGroupsOf(CATALOG, pidAdded, '   ').noMatches).toBe(false);
  });
});

describe('dataCountOf and dataCountText (FR-051 (37))', () => {
  it('counts the chosen data items of all the catalog offers', () => {
    const count = dataCountOf({ document_type: 'pid', fields: ['birthdate', 'given_name'] }, PID);
    expect(count).toEqual({ chosen: 2, total: 4 });
    expect(dataCountText(count, 'en')).toBe('2 of 4 data items chosen');
    expect(dataCountText({ chosen: 6, total: 25 }, 'en')).toBe('6 of 25 data items chosen');
  });

  it('reads "No data items chosen yet" while none is chosen', () => {
    const count = dataCountOf({ document_type: 'mdl', fields: [] }, MDL);
    expect(count).toEqual({ chosen: 0, total: 3 });
    expect(dataCountText(count, 'en')).toBe('No data items chosen yet');
  });

  it('counts in German', () => {
    expect(dataCountText({ chosen: 6, total: 25 }, 'de')).toBe('6 von 25 Feldern ausgewählt');
    expect(dataCountText({ chosen: 0, total: 25 }, 'de')).toBe('Noch keine Felder ausgewählt');
  });

  it('leaves out a chosen item the catalog dropped', () => {
    expect(dataCountOf({ document_type: 'pid', fields: ['eye_colour', 'birthdate'] }, PID)).toEqual(
      { chosen: 1, total: 4 }
    );
  });
});

/** A catalog document type with groups, as `GET /api/document-types` answers it (T072) */
function grouped(
  key: string,
  label: string,
  groups: [string, string][],
  fields: [string, string][]
): DocumentType {
  return {
    key,
    label,
    field_groups: groups.map(([groupKey, groupLabel]) => ({ key: groupKey, label: groupLabel })),
    fields: fields.map(([fieldKey, group]) => ({ ...field(fieldKey), group })),
  };
}

const GROUPS: [string, string][] = [
  ['name', 'Name'],
  ['birth', 'Birth'],
  ['address', 'Address'],
  ['document', 'Document'],
  ['licence', 'Licence'],
  ['appearance', 'Appearance'],
  ['other', 'Other details'],
];

/** Today's catalog, in its order (data-model §6; the nationality under Birth in both) */
const CATALOG_PID = grouped(
  'pid',
  'Personal ID',
  GROUPS.filter(([key]) => key !== 'licence' && key !== 'appearance'),
  [
    ['family_name', 'name'],
    ['given_name', 'name'],
    ['birthdate', 'birth'],
    ['place_of_birth', 'birth'],
    ['nationalities', 'birth'],
    ['address_formatted', 'address'],
    ['address_street_address', 'address'],
    ['address_house_number', 'address'],
    ['address_postal_code', 'address'],
    ['address_locality', 'address'],
    ['address_region', 'address'],
    ['address_country', 'address'],
    ['personal_administrative_number', 'other'],
    ['picture', 'other'],
    ['birth_family_name', 'name'],
    ['birth_given_name', 'name'],
    ['sex', 'birth'],
    ['email', 'other'],
    ['phone_number', 'other'],
    ['document_number', 'document'],
    ['date_of_issuance', 'document'],
    ['date_of_expiry', 'document'],
    ['issuing_authority', 'document'],
    ['issuing_country', 'document'],
    ['issuing_jurisdiction', 'document'],
  ]
);
const CATALOG_MDL = grouped('mdl', 'Driving licence', GROUPS, [
  ['family_name', 'name'],
  ['given_name', 'name'],
  ['birth_date', 'birth'],
  ['issue_date', 'document'],
  ['expiry_date', 'document'],
  ['issuing_country', 'document'],
  ['issuing_authority', 'document'],
  ['document_number', 'document'],
  ['portrait', 'appearance'],
  ['driving_privileges', 'licence'],
  ['un_distinguishing_sign', 'licence'],
  ['administrative_number', 'licence'],
  ['sex', 'birth'],
  ['height', 'appearance'],
  ['weight', 'appearance'],
  ['eye_colour', 'appearance'],
  ['hair_colour', 'appearance'],
  ['birth_place', 'birth'],
  ['resident_address', 'address'],
  ['portrait_capture_date', 'appearance'],
  ['age_in_years', 'birth'],
  ['age_birth_year', 'birth'],
  ['issuing_jurisdiction', 'document'],
  ['nationality', 'birth'],
  ['resident_city', 'address'],
  ['resident_state', 'address'],
  ['resident_postal_code', 'address'],
  ['resident_country', 'address'],
  ['family_name_national_character', 'name'],
  ['given_name_national_character', 'name'],
  ['signature_usual_mark', 'other'],
]);

describe('groupedFieldsOf (the data groups; S8, FR-077, R8)', () => {
  const counts = (documentType: DocumentType) =>
    groupedFieldsOf(documentType)?.map(({ label, fields }) => [label, fields.length]);

  it('answers the driving licence’s seven groups in the catalog’s order, with their counts', () => {
    expect(counts(CATALOG_MDL)).toEqual([
      ['Name', 4],
      ['Birth', 6],
      ['Address', 5],
      ['Document', 6],
      ['Licence', 3],
      ['Appearance', 6],
      ['Other details', 1],
    ]);
  });

  it('answers the Personal ID’s five, the nationality under Birth (Clarification 2026-11-11)', () => {
    expect(counts(CATALOG_PID)).toEqual([
      ['Name', 4],
      ['Birth', 4],
      ['Address', 7],
      ['Document', 6],
      ['Other details', 4],
    ]);
    const birth = groupedFieldsOf(CATALOG_PID)?.find((group) => group.key === 'birth');
    expect(birth?.fields.map((item) => item.key)).toEqual([
      'birthdate',
      'place_of_birth',
      'nationalities',
      'sex',
    ]);
  });

  it('keeps the catalog’s order inside a group and every data item once', () => {
    const groups = groupedFieldsOf(CATALOG_MDL) ?? [];
    expect(groups.find((group) => group.key === 'name')?.fields.map((item) => item.key)).toEqual([
      'family_name',
      'given_name',
      'family_name_national_character',
      'given_name_national_character',
    ]);
    const keys = groups.flatMap((group) => group.fields.map((item) => item.key));
    expect([...keys].sort()).toEqual(CATALOG_MDL.fields.map((item) => item.key).sort());
  });

  it('answers null for a document with 10 data items, which keeps the flat list', () => {
    const ten: DocumentType = {
      key: 'ten',
      label: 'Ten',
      field_groups: [],
      fields: Array.from({ length: 10 }, (_, index) => ({ ...field(`f${index}`), group: null })),
    };
    expect(groupedFieldsOf(ten)).toBeNull();
    // A document type without the catalog's groups at all (a connection's or an older answer)
    expect(groupedFieldsOf(PID)).toBeNull();
  });

  it('answers null when a data item lies outside the groups, so that none is hidden', () => {
    const stray: DocumentType = {
      ...CATALOG_PID,
      fields: [...CATALOG_PID.fields, { ...field('extra'), group: null }],
    };
    expect(groupedFieldsOf(stray)).toBeNull();
  });

  it('leaves out a group without data items', () => {
    const sparse: DocumentType = {
      ...CATALOG_PID,
      field_groups: GROUPS.map(([key, label]) => ({ key, label })),
    };
    expect(groupedFieldsOf(sparse)?.map((group) => group.key)).toEqual([
      'name',
      'birth',
      'address',
      'document',
      'other',
    ]);
  });
});

describe('groupCheckStateOf and fieldsAfterGroupToggle (a group’s checkbox; FR-079)', () => {
  const groupOf = (key: string): GroupedFields => {
    const found = groupedFieldsOf(CATALOG_MDL)?.find((group) => group.key === key);
    if (!found) {
      throw new Error(`no group ${key}`);
    }
    return found;
  };
  const licence = groupOf('licence');
  const other = groupOf('other');

  it('answers none, some or all', () => {
    expect(groupCheckStateOf(licence, [])).toBe('none');
    expect(groupCheckStateOf(licence, ['family_name'])).toBe('none');
    expect(groupCheckStateOf(licence, ['un_distinguishing_sign', 'family_name'])).toBe('some');
    expect(
      groupCheckStateOf(licence, [
        'administrative_number',
        'driving_privileges',
        'un_distinguishing_sign',
      ])
    ).toBe('all');
    expect(groupCheckStateOf(other, ['signature_usual_mark'])).toBe('all');
  });

  it('chooses all of a clear group, at the end in the catalog’s order', () => {
    expect(fieldsAfterGroupToggle(licence, ['family_name'])).toEqual([
      'family_name',
      'driving_privileges',
      'un_distinguishing_sign',
      'administrative_number',
    ]);
  });

  it('chooses all of a mixed group, keeping what was chosen', () => {
    expect(fieldsAfterGroupToggle(licence, ['administrative_number', 'family_name'])).toEqual([
      'administrative_number',
      'family_name',
      'driving_privileges',
      'un_distinguishing_sign',
    ]);
  });

  it('clears a ticked group and leaves the others in their order', () => {
    expect(
      fieldsAfterGroupToggle(licence, [
        'family_name',
        'un_distinguishing_sign',
        'driving_privileges',
        'height',
        'administrative_number',
      ])
    ).toEqual(['family_name', 'height']);
    expect(fieldsAfterGroupToggle(other, ['signature_usual_mark'])).toEqual([]);
  });

  it('toggles back and forth', () => {
    const chosen = fieldsAfterGroupToggle(licence, []);
    expect(groupCheckStateOf(licence, chosen)).toBe('all');
    expect(fieldsAfterGroupToggle(licence, chosen)).toEqual([]);
  });
});

describe('needsDataOf and documentsNeedingData (F67)', () => {
  const documents: RequestedDocument[] = [
    { document_type: 'pid', fields: ['birthdate'] },
    { document_type: 'mdl', fields: [] },
    { document_type: 'ehic', fields: ['shoe_size'] },
    { document_type: 'residence_permit', fields: [] },
  ];

  it('finds the listed documents without chosen data, in list order', () => {
    // EHIC's only chosen item is one the catalog dropped; the residence permit isn't listed
    expect(needsDataOf(documents, CATALOG)).toEqual(['mdl', 'ehic']);
    expect(needsDataOf([{ document_type: 'pid', fields: ['birthdate'] }], CATALOG)).toEqual([]);
    expect(needsDataOf([], CATALOG)).toEqual([]);
  });

  it('shows a flagged document as needing data only while it still has none', () => {
    expect(documentsNeedingData(['mdl', 'ehic'], documents, CATALOG)).toEqual(['mdl', 'ehic']);
    const chosen = documents.map((document) =>
      document.document_type === 'mdl' ? { ...document, fields: ['issue_date'] } : document
    );
    expect(documentsNeedingData(['mdl', 'ehic'], chosen, CATALOG)).toEqual(['ehic']);
  });

  it('leaves out documents that have gone, and those not flagged', () => {
    const gone = documents.filter((document) => document.document_type !== 'mdl');
    expect(documentsNeedingData(['mdl'], gone, CATALOG)).toEqual([]);
    expect(documentsNeedingData([], documents, CATALOG)).toEqual([]);
  });
});

describe('rulesCheckingDocument and removalDialogOf (the removal question, F72)', () => {
  const documents: RequestedDocument[] = [
    { document_type: 'pid', fields: ['birthdate'] },
    { document_type: 'mdl', fields: ['driving_privileges'] },
    { document_type: 'ehic', fields: ['card_number'] },
  ];

  function branch(key: string, name: string): RulesBranch {
    return {
      key,
      id: key,
      name,
      description: null,
      origin: key === 'main' ? 'main' : 'based',
      operator: 'and',
      operator_mark: null,
      items: US1_RULES,
    };
  }

  const named = (branches: RulesBranch[], documentType: DocumentType) =>
    rulesCheckingDocument(branches, documents, documentType).map(
      ({ ruleName, branchName }) => `${ruleName} in ${branchName}`
    );

  it('names the rules that check the document, with their variants', () => {
    expect(named([branch('main', 'Standard')], MDL)).toEqual([
      'Rule 02 in Standard',
      'Rule 03 in Standard',
    ]);
    expect(named([branch('main', 'Standard')], PID)).toEqual(['Rule 01 in Standard']);
    expect(named([branch('main', 'Standard'), branch('ambulance', 'Ambulance')], PID)).toEqual([
      'Rule 01 in Standard',
      'Rule 01 in Ambulance',
    ]);
  });

  it('names none for a document no rule checks', () => {
    expect(named([branch('main', 'Standard')], EHIC)).toEqual([]);
    expect(named([], MDL)).toEqual([]);
  });

  it('gives each named rule a key of its own in every variant', () => {
    const keys = rulesCheckingDocument(
      [branch('main', 'Standard'), branch('ambulance', 'Ambulance')],
      documents,
      PID
    ).map(({ key }) => key);
    expect(new Set(keys).size).toBe(2);
  });

  it('asks "Keep document" / "Remove document" without rules, and names them otherwise', () => {
    expect(removalDialogOf(null)).toBeNull();
    expect(removalDialogOf({ documentId: 'ehic', rules: [] })).toBe('confirm');
    const rules = rulesCheckingDocument([branch('main', 'Standard')], documents, MDL);
    expect(removalDialogOf({ documentId: 'mdl', rules })).toBe('rules');
  });
});

describe('removalDialogCopyOf (the removal question’s words; U23, U24, U26)', () => {
  const rule = (ruleName: string, branchName: string) => ({
    key: `${branchName}-${ruleName}`,
    ruleName,
    branchName,
  });
  const MDL_REMOVAL = { type: 'document', documentType: 'mdl', label: 'Driving licence' } as const;
  const BIRTH = {
    type: 'field',
    documentType: 'pid',
    field: 'birthdate',
    label: 'Date of birth',
  } as const;

  it('joins a list as a sentence does', () => {
    expect(listText([], 'en')).toBe('');
    expect(listText(['Rule 01'], 'en')).toBe('Rule 01');
    expect(listText(['Rule 01', 'Rule 02'], 'en')).toBe('Rule 01 and Rule 02');
    expect(listText(['Rule 01', 'Rule 02', 'Rule 03'], 'en')).toBe('Rule 01, Rule 02 and Rule 03');
  });

  it('names the rules grouped by variant, in their order', () => {
    expect(ruleListText([rule('Rule 02', 'Standard'), rule('Rule 03', 'Standard')], 'en')).toBe(
      'Rule 02 and Rule 03 in Standard'
    );
    expect(ruleListText([rule('Rule 01', 'Standard'), rule('Rule 05', 'Ambulance')], 'en')).toBe(
      'Rule 01 in Standard and Rule 05 in Ambulance'
    );
    expect(
      ruleListText(
        [rule('Rule 01', 'Standard'), rule('Rule 01', 'Ambulance'), rule('Rule 02', 'Standard')],
        'en'
      )
    ).toBe('Rule 01 and Rule 02 in Standard and Rule 01 in Ambulance');
  });

  it('asks before removing a document no rule checks (U23 A10)', () => {
    expect(removalDialogCopyOf(MDL_REMOVAL, [], false, 'en')).toEqual({
      title: 'Remove Driving licence?',
      text: 'Citizens won’t be asked for this document any more.',
      cancelLabel: 'Keep document',
      confirmLabel: 'Remove document',
    });
  });

  it('names the rules that check the document (U24 A11), "before you save" when editing', () => {
    const rules = [rule('Rule 02', 'Standard'), rule('Rule 03', 'Standard')];
    expect(removalDialogCopyOf(MDL_REMOVAL, rules, false, 'en').text).toBe(
      'Citizens won’t be asked for this document any more. 2 rules check its data: Rule 02 and ' +
        'Rule 03 in Standard. Edit or delete them before you publish.'
    );
    expect(removalDialogCopyOf(MDL_REMOVAL, rules.slice(0, 1), true, 'en').text).toBe(
      'Citizens won’t be asked for this document any more. 1 rule checks its data: Rule 02 in ' +
        'Standard. Edit or delete it before you save.'
    );
  });

  it('words a data item’s deselection as U26 draws it', () => {
    expect(
      removalDialogCopyOf(
        BIRTH,
        [rule('Rule 01', 'Standard'), rule('Rule 05', 'Ambulance')],
        false,
        'en'
      )
    ).toEqual({
      title: 'Stop requesting Date of birth?',
      text:
        'Citizens won’t share their date of birth any more. 2 rules check it: Rule 01 in ' +
        'Standard and Rule 05 in Ambulance. Edit or delete them before you publish.',
      cancelLabel: 'Cancel',
      confirmLabel: 'Stop requesting',
    });
  });

  it('keeps the baseline’s title for "All data items" and the note’s "Remove it"', () => {
    const rules = [rule('Rule 01', 'Standard')];
    expect(
      removalDialogCopyOf(
        { type: 'allFields', documentType: 'pid', label: 'Personal ID' },
        rules,
        false,
        'en'
      )
    ).toEqual({
      title: 'Stop requesting all data from Personal ID?',
      text: '1 rule checks this data: Rule 01 in Standard. Edit or delete it before you publish.',
      cancelLabel: 'Cancel',
      confirmLabel: 'Stop requesting',
    });
    expect(
      removalDialogCopyOf(
        { type: 'dropped', items: [], label: 'Personal ID: Sex' },
        rules,
        true,
        'en'
      ).title
    ).toBe('Stop requesting Personal ID: Sex?');
  });

  it('asks in German, naming a data item in quotes with its capital', () => {
    const rules = [rule('Rule 01', 'Standard'), rule('Rule 05', 'Ambulance')];
    expect(listText(['Rule 01', 'Rule 02', 'Rule 03'], 'de')).toBe('Rule 01, Rule 02 und Rule 03');
    expect(
      removalDialogCopyOf(
        { type: 'document', documentType: 'mdl', label: 'Führerschein' },
        rules.slice(0, 1),
        false,
        'de'
      )
    ).toEqual({
      title: 'Führerschein entfernen?',
      text:
        'Bürgerinnen und Bürger werden nicht mehr nach diesem Dokument gefragt. 1 Regel prüft ' +
        'seine Daten: Rule 01 in Standard. Bearbeiten oder löschen Sie die Regel vor dem ' +
        'Veröffentlichen.',
      cancelLabel: 'Dokument behalten',
      confirmLabel: 'Dokument entfernen',
    });
    expect(removalDialogCopyOf({ ...BIRTH, label: 'Geburtsdatum' }, rules, true, 'de')).toEqual({
      title: '„Geburtsdatum“ nicht mehr anfordern?',
      text:
        'Bürgerinnen und Bürger werden nicht mehr nach „Geburtsdatum“ gefragt. 2 Regeln prüfen ' +
        'dieses Feld: Rule 01 in Standard und Rule 05 in Ambulance. Bearbeiten oder löschen Sie ' +
        'die Regeln vor dem Speichern.',
      cancelLabel: 'Abbrechen',
      confirmLabel: 'Nicht mehr anfordern',
    });
    expect(
      removalDialogCopyOf(
        { type: 'allFields', documentType: 'pid', label: 'Personalausweis' },
        rules,
        false,
        'de'
      ).title
    ).toBe('Alle Daten aus „Personalausweis“ nicht mehr anfordern?');
  });

  it('asks about a data group with its own title and "All data items"’ words (copy.md §5)', () => {
    const group: PendingRemoval = {
      type: 'group',
      documentType: 'mdl',
      group: 'licence',
      fields: ['driving_privileges'],
      kept: [],
      label: 'Licence',
      documentLabel: 'Driving licence',
    };
    expect(removalDialogCopyOf(group, [rule('Rule 02', 'Standard')], false, 'en')).toEqual({
      title: 'Stop requesting “Licence” data from Driving licence?',
      text: '1 rule checks this data: Rule 02 in Standard. Edit or delete it before you publish.',
      cancelLabel: 'Cancel',
      confirmLabel: 'Stop requesting',
    });
    expect(
      removalDialogCopyOf(
        { ...group, label: 'Fahrerlaubnis', documentLabel: 'Führerschein' },
        [rule('Rule 02', 'Standard'), rule('Rule 03', 'Standard')],
        true,
        'de'
      )
    ).toEqual({
      title: 'Daten der Gruppe „Fahrerlaubnis“ aus „Führerschein“ nicht mehr anfordern?',
      text:
        '2 Regeln prüfen diese Daten: Rule 02 und Rule 03 in Standard. Bearbeiten oder löschen ' +
        'Sie die Regeln vor dem Speichern.',
      cancelLabel: 'Abbrechen',
      confirmLabel: 'Nicht mehr anfordern',
    });
  });

  it('is empty while nothing is asked', () => {
    expect(removalDialogCopyOf(null, [], false, 'en').title).toBe('');
  });

  it('writes a data item’s name in lower case inside the sentence, abbreviations aside', () => {
    expect(inSentence('Date of birth', 'en')).toBe('date of birth');
    expect(inSentence('City or town', 'en')).toBe('city or town');
    expect(inSentence('UN distinguishing sign', 'en')).toBe('UN distinguishing sign');
    expect(inSentence('Sex', 'en')).toBe('sex');
    expect(inSentence('A', 'en')).toBe('a');
    expect(inSentence('', 'en')).toBe('');
  });

  it('keeps a German name’s capital', () => {
    expect(inSentence('Geburtsdatum', 'de')).toBe('Geburtsdatum');
  });
});

describe('the plural texts (F67, Clarification #55)', () => {
  it('"1 document needs data" / "2 documents need data"', () => {
    expect(needsDataText(1, 'en')).toBe('1 document needs data');
    expect(needsDataText(2, 'en')).toBe('2 documents need data');
  });

  it('"No data selected in 1 document" / "… in 3 documents"', () => {
    expect(noDataTitle(1, 'en')).toBe('No data selected in 1 document');
    expect(noDataTitle(3, 'en')).toBe('No data selected in 3 documents');
  });

  it('names the documents in the dialog’s text (#55; the plural isn’t drawn)', () => {
    expect(noDataText(['Driving licence'], 'en')).toBe(
      'Driving licence has no data chosen yet. Choose data for it or remove it.'
    );
    expect(noDataText(['Personal ID', 'Driving licence'], 'en')).toBe(
      'Personal ID and Driving licence have no data chosen yet. Choose data for them or remove them.'
    );
    expect(noDataText(['A', 'B', 'C'], 'en')).toBe(
      'A, B and C have no data chosen yet. Choose data for them or remove them.'
    );
  });

  it('"Remove 1 document" / "Remove 3 documents"', () => {
    expect(removeDocumentsLabel(1, 'en')).toBe('Remove 1 document');
    expect(removeDocumentsLabel(3, 'en')).toBe('Remove 3 documents');
  });

  it('words the plurals in German', () => {
    expect(needsDataText(1, 'de')).toBe('1 Dokument braucht Daten');
    expect(needsDataText(2, 'de')).toBe('2 Dokumente brauchen Daten');
    expect(noDataTitle(1, 'de')).toBe('Keine Daten in 1 Dokument ausgewählt');
    expect(noDataTitle(3, 'de')).toBe('Keine Daten in 3 Dokumenten ausgewählt');
    expect(noDataText(['Personalausweis', 'Führerschein'], 'de')).toBe(
      'Für Personalausweis und Führerschein sind noch keine Daten ausgewählt. Wählen Sie Daten ' +
        'aus oder entfernen Sie die Dokumente.'
    );
    expect(removeDocumentsLabel(3, 'de')).toBe('3 Dokumente entfernen');
  });

  it('counts the lists and the search card’s groups', () => {
    expect(DOCUMENTS_COPY.en.addedDocuments(2)).toBe('Added documents (2)');
    expect(DOCUMENTS_COPY.en.availableGroup(1)).toBe('Available (1)');
    expect(DOCUMENTS_COPY.en.addedGroup(2)).toBe('Added (2)');
  });
});

describe('documentGlyphOf', () => {
  it('gives a document type its own glyph in each tone', () => {
    expect(documentGlyphOf('pid', 'action')).toBe(DOCUMENT_GLYPHS.pid.action);
    expect(documentGlyphOf('mdl', 'muted')).toBe(DOCUMENT_GLYPHS.mdl.muted);
    expect(documentGlyphOf('pid', 'ink')).not.toBe(documentGlyphOf('pid', 'action'));
    expect(documentGlyphOf('mdl', 'danger')).toBe(DOCUMENT_GLYPHS.mdl.danger);
  });

  it('gives a type without a glyph of its own the generic document', () => {
    expect(documentGlyphOf('birth-certificate', 'ink')).toBe(GENERIC_DOCUMENT_GLYPHS.ink);
  });
});

describe('searchCardHeight', () => {
  const pid = { key: 'pid' } as DocumentType;
  const mdl = { key: 'mdl' } as DocumentType;

  it('measures the field and each group with rows, as U20 and U21 draw the card', () => {
    // U20 7290:60525 without its hint (F3): 26 + 48 + 8 + 36 + 2 × 40
    expect(searchCardHeight({ available: [pid, mdl], added: [], noMatches: false })).toBe(198);
    // U21 7290:61989: Available (1) and Added (1)
    expect(searchCardHeight({ available: [mdl], added: [pid], noMatches: false })).toBe(234);
  });

  it('measures the no-results line (U20 7290:60990: 130 high)', () => {
    expect(searchCardHeight({ available: [], added: [], noMatches: true })).toBe(130);
  });
});

describe('moveTargetsOf (where the ⋯ menu moves a document; FR-047, W13)', () => {
  it('offers "Move up" except on the first row and "Move down" except on the last', () => {
    expect(moveTargetsOf(0, 3)).toEqual({ up: null, down: 1 });
    expect(moveTargetsOf(1, 3)).toEqual({ up: 0, down: 2 });
    expect(moveTargetsOf(2, 3)).toEqual({ up: 1, down: null });
  });

  it('offers no move with one document', () => {
    expect(moveTargetsOf(0, 1)).toEqual({ up: null, down: null });
  });
});

describe('documentMenuOf (a row’s ⋯ menu; W13, bug v5-ui-fixes B4)', () => {
  const copy = DOCUMENTS_COPY.en;
  const labelsOf = (index: number, count: number) =>
    documentMenuOf(index, count, copy, { onMove: () => {}, onRemove: () => {} }).map(
      (action) => action.label
    );

  it('lists the moves the row offers, then "Remove document"', () => {
    expect(labelsOf(0, 3)).toEqual(['Move down', 'Remove document']);
    expect(labelsOf(1, 3)).toEqual(['Move up', 'Move down', 'Remove document']);
    expect(labelsOf(2, 3)).toEqual(['Move up', 'Remove document']);
  });

  it('holds only "Remove document" for a single document, without a divider above it', () => {
    expect(labelsOf(0, 1)).toEqual(['Remove document']);
    const [remove] = documentMenuOf(0, 1, copy, { onMove: () => {}, onRemove: () => {} });
    expect(remove).toMatchObject({
      danger: true,
      separated: false,
      icon: { kern: 'kern-icon--delete' },
    });
  });

  it('draws the removal red, after the divider, with KERN’s trash; the moves plain', () => {
    const [up, down, remove] = documentMenuOf(1, 3, copy, {
      onMove: () => {},
      onRemove: () => {},
    });
    expect(remove).toMatchObject({
      danger: true,
      separated: true,
      icon: { kern: 'kern-icon--delete' },
    });
    for (const move of [up, down]) {
      expect(move.danger).toBeUndefined();
      expect(move.separated).toBeUndefined();
    }
  });

  it('moves to the row above or below, and removes the row’s document', () => {
    const moves: number[] = [];
    let removed = 0;
    const actions = documentMenuOf(1, 3, copy, {
      onMove: (toIndex) => moves.push(toIndex),
      onRemove: () => {
        removed += 1;
      },
    });
    for (const action of actions) {
      action.onSelect();
    }
    expect(moves).toEqual([0, 2]);
    expect(removed).toBe(1);
  });

  it('words the entries in German', () => {
    expect(
      documentMenuOf(1, 3, DOCUMENTS_COPY.de, { onMove: () => {}, onRemove: () => {} }).map(
        (action) => action.label
      )
    ).toEqual(['Nach oben', 'Nach unten', 'Dokument entfernen']);
  });
});

describe('moveAnnouncementOf (the announcement after a move; FR-047, copy.md §5)', () => {
  const listed = listedDocumentsOf(
    ['pid', 'mdl', 'ehic'].map((key) => ({ document_type: key, fields: [] })),
    CATALOG
  );

  it('names the document and its new position, counting from 1', () => {
    expect(moveAnnouncementOf(listed, 'mdl', 0, 'en')).toBe(
      '“Driving licence” moved to position 1 of 3.'
    );
    expect(moveAnnouncementOf(listed, 'pid', 2, 'en')).toBe(
      '“Personal ID” moved to position 3 of 3.'
    );
  });

  it('says it in German', () => {
    expect(moveAnnouncementOf(listed, 'mdl', 0, 'de')).toBe(
      '„Driving licence“ auf Position 1 von 3 verschoben.'
    );
    expect(moveAnnouncementOf(listed, 'ehic', 1, 'de')).toBe(
      '„Health insurance card“ auf Position 2 von 3 verschoben.'
    );
  });

  it('says nothing for a move the editor refuses', () => {
    expect(moveAnnouncementOf(listed, 'mdl', 1, 'en')).toBeNull();
    expect(moveAnnouncementOf(listed, 'mdl', 3, 'en')).toBeNull();
    expect(moveAnnouncementOf(listed, 'mdl', -1, 'en')).toBeNull();
    expect(moveAnnouncementOf(listed, 'mdl', 0.5, 'en')).toBeNull();
    expect(moveAnnouncementOf(listed, 'other', 0, 'en')).toBeNull();
  });
});

// Three 40px rows, 4px apart (U22 7294:61686), from 100px down: their middles are 120, 164, 208
const ROWS: readonly DragRowBox[] = Object.freeze([
  Object.freeze({ top: 100, bottom: 140 }),
  Object.freeze({ top: 144, bottom: 184 }),
  Object.freeze({ top: 188, bottom: 228 }),
]);
const LIST = Object.freeze({ left: 0, top: 90, right: 264, bottom: 240 });
const MOUSE = 1;
const TOUCH = 7;

function down(
  index: number,
  y: number,
  pointerType: DragPointerType = 'mouse',
  pointerId = pointerType === 'touch' ? TOUCH : MOUSE
): RowDragEvent {
  return {
    type: 'down',
    pointerId,
    pointerType,
    position: { x: 100, y },
    time: 1000,
    index,
    rows: ROWS,
    list: LIST,
  };
}

function move(y: number, x = 100, time = 1010, pointerId = MOUSE): RowDragEvent {
  return { type: 'move', pointerId, position: { x, y }, time };
}

function up(y: number, x = 100, pointerId = MOUSE): RowDragEvent {
  return { type: 'up', pointerId, position: { x, y } };
}

/** The state after the events, from idle */
function run(...events: RowDragEvent[]): RowDragState {
  return events.reduce(rowDragReducer, ROW_DRAG_IDLE);
}

/** A mouse drag of the row at `index`, pressed at its middle and moved to `y` */
function dragging(index: number, y: number): RowDragState {
  const middle = (ROWS[index].top + ROWS[index].bottom) / 2;
  return run(down(index, middle), move(y));
}

describe('dragPointerTypeOf (S8 "Dragging")', () => {
  it('keeps touch and pen, and drags any other pointer as a mouse', () => {
    expect(dragPointerTypeOf('touch')).toBe('touch');
    expect(dragPointerTypeOf('pen')).toBe('pen');
    expect(dragPointerTypeOf('mouse')).toBe('mouse');
    expect(dragPointerTypeOf('')).toBe('mouse');
  });
});

describe('dropTargetOf (the target index, R6)', () => {
  it('is the first index above the list and the last below it', () => {
    expect(dropTargetOf(ROWS, 2, 0)).toBe(0);
    expect(dropTargetOf(ROWS, 1, 99)).toBe(0);
    expect(dropTargetOf(ROWS, 0, 1000)).toBe(2);
    expect(dropTargetOf(ROWS, 1, 229)).toBe(2);
  });

  it('passes a neighbour once the pointer crosses its middle', () => {
    expect(dropTargetOf(ROWS, 0, 164)).toBe(0);
    expect(dropTargetOf(ROWS, 0, 165)).toBe(1);
    // A pointer on a middle counts as above it
    expect(dropTargetOf(ROWS, 2, 165)).toBe(2);
    expect(dropTargetOf(ROWS, 2, 164)).toBe(1);
    expect(dropTargetOf(ROWS, 1, 119)).toBe(0);
    expect(dropTargetOf(ROWS, 1, 209)).toBe(2);
  });

  it('places by the gap between rows', () => {
    expect(dropTargetOf(ROWS, 2, 142)).toBe(1);
    expect(dropTargetOf(ROWS, 0, 186)).toBe(1);
  });

  it('stays on the document’s own place between its neighbours’ middles', () => {
    expect(dropTargetOf(ROWS, 1, 121)).toBe(1);
    expect(dropTargetOf(ROWS, 1, 164)).toBe(1);
    expect(dropTargetOf(ROWS, 1, 208)).toBe(1);
  });

  it('has only index 0 with one row', () => {
    expect(dropTargetOf(ROWS.slice(0, 1), 0, 0)).toBe(0);
    expect(dropTargetOf(ROWS.slice(0, 1), 0, 500)).toBe(0);
  });
});

describe('dropLineOf (the drop line, S8 "Dragging")', () => {
  it('is null unless a row is dragged', () => {
    expect(dropLineOf(ROW_DRAG_IDLE)).toBeNull();
    expect(dropLineOf(run(down(0, 120)))).toBeNull();
  });

  it('marks the top of the list for the first place', () => {
    expect(dropLineOf(dragging(2, 50))).toEqual({ gap: 0, y: 100 });
  });

  it('marks the bottom of the list for the last place', () => {
    expect(dropLineOf(dragging(0, 300))).toEqual({ gap: 3, y: 228 });
  });

  it('marks the gap between two rows, above the row moving up and below it moving down', () => {
    expect(dropLineOf(dragging(2, 150))).toEqual({ gap: 1, y: 142 });
    expect(dropLineOf(dragging(0, 170))).toEqual({ gap: 2, y: 186 });
  });

  it('marks the document’s own place, above its row, while it stays', () => {
    expect(dropLineOf(dragging(1, 175))).toEqual({ gap: 1, y: 142 });
  });
});

describe('rowDragReducer: a mouse or pen (FR-046, R6)', () => {
  it('presses a row and waits for more than 4 px', () => {
    const pressed = run(down(1, 164));
    expect(pressed).toMatchObject({ phase: 'pressed', index: 1, origin: { x: 100, y: 164 } });
    expect(rowDragReducer(pressed, move(164 + ROW_DRAG_THRESHOLD_PX))).toBe(pressed);
    expect(rowDragReducer(pressed, move(164, 100 - 3))).toBe(pressed);
    expect(waitsForHold(pressed)).toBe(false);
  });

  it('drags once the pointer moved more than 4 px, in any direction', () => {
    const state = run(down(1, 164), move(167, 103));
    expect(state).toMatchObject({ phase: 'dragging', index: 1, target: 1 });
    expect(dragOffsetOf(state)).toEqual({ x: 3, y: 3 });
    expect(touchDragArmed(state)).toBe(false);
  });

  it('follows the pointer: the target and the copy’s offset', () => {
    const state = run(down(2, 208), move(200), move(150), move(40, 130));
    expect(state).toMatchObject({ phase: 'dragging', target: 0 });
    expect(dragOffsetOf(state)).toEqual({ x: 30, y: -168 });
  });

  it('answers the move on a release inside the list', () => {
    expect(run(down(2, 208), move(200), up(100))).toEqual({
      phase: 'idle',
      move: { from: 2, to: 0 },
    });
    expect(run(down(0, 120), move(140), up(235))).toEqual({
      phase: 'idle',
      move: { from: 0, to: 2 },
    });
    expect(run(down(0, 120), move(140), up(170))).toEqual({
      phase: 'idle',
      move: { from: 0, to: 1 },
    });
  });

  it('answers the move at the list’s edges, which count as inside', () => {
    expect(run(down(2, 208), move(150), up(LIST.top, LIST.left))).toEqual({
      phase: 'idle',
      move: { from: 2, to: 0 },
    });
    expect(run(down(0, 120), move(150), up(LIST.bottom, LIST.right))).toEqual({
      phase: 'idle',
      move: { from: 0, to: 2 },
    });
  });

  it('answers no move for a drop on the document’s own place', () => {
    expect(run(down(1, 164), move(180), up(170))).toEqual(ROW_DRAG_IDLE);
  });

  it('answers no move for a release outside the list', () => {
    expect(run(down(2, 208), move(150), up(100, 300))).toEqual(ROW_DRAG_IDLE);
    expect(run(down(0, 120), move(150), up(260))).toEqual(ROW_DRAG_IDLE);
    expect(run(down(2, 208), move(150), up(80))).toEqual(ROW_DRAG_IDLE);
  });

  it('answers no move for a release before the drag starts: a click', () => {
    expect(run(down(1, 164), move(166), up(166))).toEqual(ROW_DRAG_IDLE);
  });

  it('drags a pen as a mouse', () => {
    const pen = 3;
    expect(run(down(2, 208, 'pen', pen), move(150, 100, 1001, pen), up(100, 100, pen))).toEqual({
      phase: 'idle',
      move: { from: 2, to: 0 },
    });
  });

  it('ignores the hold timer', () => {
    const pressed = run(down(1, 164));
    expect(rowDragReducer(pressed, { type: 'tick', time: 1000 + ROW_DRAG_HOLD_MS })).toBe(pressed);
  });
});

describe('rowDragReducer: a touch (FR-046, R6)', () => {
  const touchMove = (y: number, time: number) => move(y, 100, time, TOUCH);

  it('waits for the hold, and drags from its end without moving', () => {
    const pressed = run(down(0, 120, 'touch'));
    expect(waitsForHold(pressed)).toBe(true);
    expect(rowDragReducer(pressed, { type: 'tick', time: 1000 + ROW_DRAG_HOLD_MS - 1 })).toBe(
      pressed
    );
    const held = rowDragReducer(pressed, { type: 'tick', time: 1000 + ROW_DRAG_HOLD_MS });
    expect(held).toMatchObject({ phase: 'dragging', index: 0, target: 0 });
    expect(dragOffsetOf(held)).toEqual({ x: 0, y: 0 });
    expect(waitsForHold(held)).toBe(false);
    expect(touchDragArmed(held)).toBe(true);
  });

  it('keeps waiting while it moves 4 px or less', () => {
    const pressed = run(down(0, 120, 'touch'));
    expect(rowDragReducer(pressed, touchMove(124, 1100))).toBe(pressed);
  });

  it('moves and drops after the hold', () => {
    const state = run(
      down(0, 120, 'touch'),
      touchMove(122, 1200),
      { type: 'tick', time: 1400 },
      touchMove(200, 1500)
    );
    expect(state).toMatchObject({ phase: 'dragging', target: 1 });
    expect(rowDragReducer(state, up(200, 100, TOUCH))).toEqual({
      phase: 'idle',
      move: { from: 0, to: 1 },
    });
  });

  it('returns to idle when it moves more than 4 px before the hold, so that the list scrolls', () => {
    const scrolled = run(down(1, 164, 'touch'), touchMove(169, 1100));
    expect(scrolled).toEqual(ROW_DRAG_IDLE);
    expect(rowDragReducer(scrolled, { type: 'tick', time: 1400 })).toBe(scrolled);
  });

  it('drags on a move at the hold’s end when the timer is late', () => {
    expect(run(down(0, 120, 'touch'), touchMove(200, 1400))).toMatchObject({
      phase: 'dragging',
      target: 1,
    });
  });

  it('ends the wait on pointercancel (the browser scrolls)', () => {
    expect(run(down(1, 164, 'touch'), { type: 'cancel', pointerId: TOUCH })).toEqual(ROW_DRAG_IDLE);
  });

  it('answers no move for a tap', () => {
    expect(run(down(1, 164, 'touch'), up(164, 100, TOUCH))).toEqual(ROW_DRAG_IDLE);
  });
});

describe('rowDragReducer: ending without a move (FR-046)', () => {
  const pressed = run(down(2, 208));
  const dragged = dragging(2, 100);

  it('ends with Escape', () => {
    expect(rowDragReducer(pressed, { type: 'escape' })).toEqual(ROW_DRAG_IDLE);
    expect(rowDragReducer(dragged, { type: 'escape' })).toEqual(ROW_DRAG_IDLE);
  });

  it('ends on a cancel of its pointer, or of whichever pointer is down', () => {
    expect(rowDragReducer(dragged, { type: 'cancel', pointerId: MOUSE })).toEqual(ROW_DRAG_IDLE);
    expect(rowDragReducer(dragged, { type: 'cancel' })).toEqual(ROW_DRAG_IDLE);
    expect(rowDragReducer(pressed, { type: 'cancel' })).toEqual(ROW_DRAG_IDLE);
  });

  it('ends on a second pointer, and the second pointer starts nothing', () => {
    const second = down(0, 120, 'touch');
    expect(rowDragReducer(dragged, second)).toEqual(ROW_DRAG_IDLE);
    expect(rowDragReducer(pressed, second)).toEqual(ROW_DRAG_IDLE);
    const after = run(down(2, 208), move(100), second, up(100));
    expect(after).toEqual(ROW_DRAG_IDLE);
  });

  it('ignores another pointer’s move, release and cancel', () => {
    expect(rowDragReducer(dragged, move(300, 100, 1020, 9))).toBe(dragged);
    expect(rowDragReducer(dragged, up(100, 100, 9))).toBe(dragged);
    expect(rowDragReducer(dragged, { type: 'cancel', pointerId: 9 })).toBe(dragged);
  });
});

describe('rowDragReducer: idle', () => {
  it('changes nothing but a press on a listed row', () => {
    for (const event of [
      move(150),
      up(150),
      { type: 'cancel' },
      { type: 'escape' },
      { type: 'tick', time: 5000 },
    ] satisfies RowDragEvent[]) {
      expect(rowDragReducer(ROW_DRAG_IDLE, event)).toBe(ROW_DRAG_IDLE);
    }
    expect(rowDragReducer(ROW_DRAG_IDLE, down(3, 150))).toBe(ROW_DRAG_IDLE);
    expect(rowDragReducer(ROW_DRAG_IDLE, down(-1, 150))).toBe(ROW_DRAG_IDLE);
  });

  it('clears the answered move on the next press', () => {
    const dropped = run(down(2, 208), move(150), up(100));
    expect(dropped).toEqual({ phase: 'idle', move: { from: 2, to: 0 } });
    expect(rowDragReducer(dropped, move(120))).toBe(dropped);
    expect(rowDragReducer(dropped, down(0, 120))).toMatchObject({ phase: 'pressed', index: 0 });
  });
});

describe('rowDragReducer: measured again', () => {
  it('takes the rows measured after the list scrolled', () => {
    const scrolled = ROWS.map(({ top, bottom }) => ({ top: top - 44, bottom: bottom - 44 }));
    const state = rowDragReducer(dragging(0, 130), {
      ...move(130, 100, 1020),
      rows: scrolled,
    } as RowDragEvent);
    expect(state).toMatchObject({ phase: 'dragging', target: 1, rows: scrolled });
    expect(dropLineOf(state)).toEqual({ gap: 2, y: 142 });
  });

  it('never changes the measured boxes it was given', () => {
    const state = run(down(2, 208), move(100), up(100));
    expect(state).toEqual({ phase: 'idle', move: { from: 2, to: 0 } });
    expect(ROWS[0]).toEqual({ top: 100, bottom: 140 });
  });
});
