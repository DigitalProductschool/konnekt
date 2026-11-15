import type { DocumentField } from '@connection-portal/api-types/document-types';
import type { GroupItem, Mark } from '@connection-portal/api-types/form-connections';
import { mainBranch, MDL, PID, rule } from '@connection-portal/rules/testData';
import { describe, expect, it } from 'vitest';

import { draftRuleDocumentsOf, summaryNumbersOf } from './connectionSummary';

/** A requested field of a document, as the API gives it */
function field(key: string, label: string): DocumentField {
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

describe('summaryNumbersOf (FR-046 (i); spec 011, FR-008)', () => {
  const personalId = {
    fields: Array.from({ length: 7 }, (_, index) => field(`f${index}`, `F${index}`)),
  };
  const drivingLicence = {
    fields: [field('driving_privileges', 'Licence classes'), field('issue_date', 'Issue date')],
  };

  it('counts the documents, their data items, the variants and the distinct rules', () => {
    const main = mainBranch([rule(1, null, null), rule(2, null, null), rule(3, null, null)]);
    const changed = { ...rule(1, null, null), mark: 'changed' as Mark };
    const added = { ...rule(4, null, null), mark: 'added' as Mark };
    const branches = [
      main,
      { ...main, name: 'Ambulance', origin: 'based' as const, items: [changed] },
      { ...main, name: 'School transport', origin: 'based' as const, items: [added] },
    ];
    expect(summaryNumbersOf([personalId, drivingLicence], branches)).toEqual({
      documents: 2,
      dataItems: 9,
      variants: 3,
      rules: 4,
    });
  });

  it('counts nothing as 0, and Standard alone as one variant', () => {
    expect(summaryNumbersOf([], [mainBranch([])])).toEqual({
      documents: 0,
      dataItems: 0,
      variants: 1,
      rules: 0,
    });
  });

  it('counts grouped rules one by one and groups not at all', () => {
    const group: GroupItem = {
      type: 'group',
      id: 'group-1',
      name: 'Group',
      mark: null,
      operator: 'or',
      message: null,
      items: [
        rule(2, null, null),
        {
          type: 'group',
          id: 'group-2',
          name: 'Sub-group',
          mark: null,
          operator: 'and',
          message: null,
          items: [rule(3, null, null)],
        },
      ],
    };
    expect(summaryNumbersOf([], [mainBranch([rule(1, null, null), group])]).rules).toBe(3);
  });

  it('leaves out what a variant removes, which still counts in Standard', () => {
    const main = mainBranch([rule(1, null, null), rule(2, null, null)]);
    const removed = { ...rule(2, null, null), mark: 'removed' as Mark };
    const onlyThere = { ...rule(5, null, null), mark: 'removed' as Mark };
    const based = { ...main, name: 'Taxi', origin: 'based' as const, items: [removed, onlyThere] };
    expect(summaryNumbersOf([], [main, based])).toEqual({
      documents: 0,
      dataItems: 0,
      variants: 2,
      rules: 2,
    });
  });
});

describe('draftRuleDocumentsOf (S6; FR-004)', () => {
  const [familyName, birthdate] = PID.fields;
  const dropped = { ...familyName, key: 'eye_colour_old', label: 'eye_colour_old' };

  it('names data that rules check but the draft doesn’t request, from the catalog', () => {
    const documents = draftRuleDocumentsOf(
      [{ document_type: 'pid', label: 'Personal ID', fields: [birthdate] }],
      [PID, MDL]
    );

    expect(documents.map((document) => document.key)).toEqual(['pid', 'mdl']);
    expect(documents[0].fields[0]).toBe(birthdate);
    expect(documents[0].fields.map((field) => field.key).sort()).toEqual(
      PID.fields.map((field) => field.key).sort()
    );
    expect(documents[1]).toBe(MDL);
  });

  it('keeps what the catalog dropped, with its key as its label', () => {
    const documents = draftRuleDocumentsOf(
      [
        { document_type: 'pid', label: 'Personal ID', fields: [dropped] },
        { document_type: 'old_permit', label: 'old_permit', fields: [] },
      ],
      [PID]
    );

    expect(documents.map((document) => document.key)).toEqual(['pid', 'old_permit']);
    expect(documents[0].fields[0]).toBe(dropped);
    expect(documents[0].fields).toHaveLength(PID.fields.length + 1);
  });

  it('names only the requested documents without the catalog', () => {
    expect(
      draftRuleDocumentsOf(
        [{ document_type: 'pid', label: 'Personal ID', fields: [birthdate] }],
        []
      )
    ).toEqual([{ key: 'pid', label: 'Personal ID', fields: [birthdate] }]);
  });
});
