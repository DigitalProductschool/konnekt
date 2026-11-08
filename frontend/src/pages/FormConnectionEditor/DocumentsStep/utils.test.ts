import type { DocumentField, DocumentType } from '@connection-portal/api-types/document-types';
import type { RequestedDocument } from '@connection-portal/api-types/form-connections';
import { US1_RULES } from '@connection-portal/rules/testData';
import { describe, expect, it } from 'vitest';

import type { RulesBranch } from '../RulesStep/types';
import { DOCUMENT_GLYPHS, DOCUMENTS_STEP_COPY, GENERIC_DOCUMENT_GLYPHS } from './constants';
import {
  dataCountOf,
  dataCountText,
  documentGlyphOf,
  documentsNeedingData,
  indexAfterAdding,
  indexAfterRemoval,
  inSentence,
  listedDocumentsOf,
  listIdsOf,
  listText,
  needsDataOf,
  needsDataText,
  noDataText,
  noDataTitle,
  pagerOf,
  removalDialogCopyOf,
  removalDialogOf,
  removeDocumentsLabel,
  ruleListText,
  rulesCheckingDocument,
  searchCardHeight,
  searchGroupsOf,
  shownDocumentOf,
  shownIndexOf,
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
const CATALOG_ORDER = CATALOG.map((type) => type.key);

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
    expect(pagerOf(1, 2).text).toBe('Document 2 of 2');
    expect(pagerOf(0, 1).text).toBe('Document 1 of 1');
  });

  it('disables the previous arrow on the first document and the next on the last', () => {
    expect(pagerOf(0, 1)).toEqual({
      index: 0,
      text: 'Document 1 of 1',
      previousIndex: null,
      nextIndex: null,
    });
    expect(pagerOf(1, 2)).toMatchObject({ previousIndex: 0, nextIndex: null });
    expect(pagerOf(1, 3)).toMatchObject({ previousIndex: 0, nextIndex: 2 });
  });

  it('reads a selection past the end as the last document', () => {
    expect(pagerOf(4, 2)).toMatchObject({ index: 1, text: 'Document 2 of 2' });
  });

  it('has no text without a document', () => {
    expect(pagerOf(0, 0)).toEqual({ index: 0, text: '', previousIndex: null, nextIndex: null });
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

describe('indexAfterAdding (catalog order, F23)', () => {
  it('places the document after those before it in the catalog', () => {
    expect(indexAfterAdding([], 'mdl', CATALOG_ORDER)).toBe(0);
    expect(indexAfterAdding(['pid'], 'mdl', CATALOG_ORDER)).toBe(1);
    expect(indexAfterAdding(['mdl', 'ehic'], 'pid', CATALOG_ORDER)).toBe(0);
    expect(indexAfterAdding(['pid', 'ehic'], 'mdl', CATALOG_ORDER)).toBe(1);
  });

  it('gives a listed document’s own index', () => {
    expect(indexAfterAdding(['pid', 'mdl'], 'mdl', CATALOG_ORDER)).toBe(1);
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
    expect(DOCUMENTS_STEP_COPY.noMatches('taxi')).toBe('No documents match “taxi”.');
  });

  it('counts a query of spaces as no query', () => {
    expect(searchGroupsOf(CATALOG, pidAdded, '   ').noMatches).toBe(false);
  });
});

describe('dataCountOf and dataCountText (FR-051 (37))', () => {
  it('counts the chosen data items of all the catalog offers', () => {
    const count = dataCountOf({ document_type: 'pid', fields: ['birthdate', 'given_name'] }, PID);
    expect(count).toEqual({ chosen: 2, total: 4 });
    expect(dataCountText(count)).toBe('2 of 4 data items chosen');
    expect(dataCountText({ chosen: 6, total: 25 })).toBe('6 of 25 data items chosen');
  });

  it('reads "No data items chosen yet" while none is chosen', () => {
    const count = dataCountOf({ document_type: 'mdl', fields: [] }, MDL);
    expect(count).toEqual({ chosen: 0, total: 3 });
    expect(dataCountText(count)).toBe('No data items chosen yet');
  });

  it('leaves out a chosen item the catalog dropped', () => {
    expect(dataCountOf({ document_type: 'pid', fields: ['eye_colour', 'birthdate'] }, PID)).toEqual(
      { chosen: 1, total: 4 }
    );
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
    expect(listText([])).toBe('');
    expect(listText(['Rule 01'])).toBe('Rule 01');
    expect(listText(['Rule 01', 'Rule 02'])).toBe('Rule 01 and Rule 02');
    expect(listText(['Rule 01', 'Rule 02', 'Rule 03'])).toBe('Rule 01, Rule 02 and Rule 03');
  });

  it('names the rules grouped by variant, in their order', () => {
    expect(ruleListText([rule('Rule 02', 'Standard'), rule('Rule 03', 'Standard')])).toBe(
      'Rule 02 and Rule 03 in Standard'
    );
    expect(ruleListText([rule('Rule 01', 'Standard'), rule('Rule 05', 'Ambulance')])).toBe(
      'Rule 01 in Standard and Rule 05 in Ambulance'
    );
    expect(
      ruleListText([
        rule('Rule 01', 'Standard'),
        rule('Rule 01', 'Ambulance'),
        rule('Rule 02', 'Standard'),
      ])
    ).toBe('Rule 01 and Rule 02 in Standard and Rule 01 in Ambulance');
  });

  it('asks before removing a document no rule checks (U23 A10)', () => {
    expect(removalDialogCopyOf(MDL_REMOVAL, [], false)).toEqual({
      title: 'Remove Driving licence?',
      text: 'Citizens won’t be asked for this document any more.',
      cancelLabel: 'Keep document',
      confirmLabel: 'Remove document',
    });
  });

  it('names the rules that check the document (U24 A11), "before you save" when editing', () => {
    const rules = [rule('Rule 02', 'Standard'), rule('Rule 03', 'Standard')];
    expect(removalDialogCopyOf(MDL_REMOVAL, rules, false).text).toBe(
      'Citizens won’t be asked for this document any more. 2 rules check its data: Rule 02 and ' +
        'Rule 03 in Standard. Edit or delete them before you publish.'
    );
    expect(removalDialogCopyOf(MDL_REMOVAL, rules.slice(0, 1), true).text).toBe(
      'Citizens won’t be asked for this document any more. 1 rule checks its data: Rule 02 in ' +
        'Standard. Edit or delete it before you save.'
    );
  });

  it('words a data item’s deselection as U26 draws it', () => {
    expect(
      removalDialogCopyOf(BIRTH, [rule('Rule 01', 'Standard'), rule('Rule 05', 'Ambulance')], false)
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
        false
      )
    ).toEqual({
      title: 'Stop requesting all data from Personal ID?',
      text: '1 rule checks this data: Rule 01 in Standard. Edit or delete it before you publish.',
      cancelLabel: 'Cancel',
      confirmLabel: 'Stop requesting',
    });
    expect(
      removalDialogCopyOf({ type: 'dropped', items: [], label: 'Personal ID: Sex' }, rules, true)
        .title
    ).toBe('Stop requesting Personal ID: Sex?');
  });

  it('is empty while nothing is asked', () => {
    expect(removalDialogCopyOf(null, [], false).title).toBe('');
  });

  it('writes a data item’s name in lower case inside the sentence, abbreviations aside', () => {
    expect(inSentence('Date of birth')).toBe('date of birth');
    expect(inSentence('City or town')).toBe('city or town');
    expect(inSentence('UN distinguishing sign')).toBe('UN distinguishing sign');
    expect(inSentence('Sex')).toBe('sex');
    expect(inSentence('A')).toBe('a');
    expect(inSentence('')).toBe('');
  });
});

describe('the plural texts (F67, Clarification #55)', () => {
  it('"1 document needs data" / "2 documents need data"', () => {
    expect(needsDataText(1)).toBe('1 document needs data');
    expect(needsDataText(2)).toBe('2 documents need data');
  });

  it('"No data selected in 1 document" / "… in 3 documents"', () => {
    expect(noDataTitle(1)).toBe('No data selected in 1 document');
    expect(noDataTitle(3)).toBe('No data selected in 3 documents');
  });

  it('names the documents in the dialog’s text (#55; the plural isn’t drawn)', () => {
    expect(noDataText(['Driving licence'])).toBe(
      'Driving licence has no data chosen yet. Choose data for it or remove it.'
    );
    expect(noDataText(['Personal ID', 'Driving licence'])).toBe(
      'Personal ID and Driving licence have no data chosen yet. Choose data for them or remove them.'
    );
    expect(noDataText(['A', 'B', 'C'])).toBe(
      'A, B and C have no data chosen yet. Choose data for them or remove them.'
    );
  });

  it('"Remove 1 document" / "Remove 3 documents"', () => {
    expect(removeDocumentsLabel(1)).toBe('Remove 1 document');
    expect(removeDocumentsLabel(3)).toBe('Remove 3 documents');
  });

  it('counts the lists and the search card’s groups', () => {
    expect(DOCUMENTS_STEP_COPY.addedDocuments(2)).toBe('Added documents (2)');
    expect(DOCUMENTS_STEP_COPY.availableGroup(1)).toBe('Available (1)');
    expect(DOCUMENTS_STEP_COPY.addedGroup(2)).toBe('Added (2)');
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
