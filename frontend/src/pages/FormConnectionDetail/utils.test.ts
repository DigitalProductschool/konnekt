import type { DocumentField } from '@connection-portal/api-types/document-types';
import type {
  Branch,
  BranchInput,
  FormConnection,
  GroupItem,
  Mark,
  RuleTreeItem,
} from '@connection-portal/api-types/form-connections';
import type { BranchCheck, ItemFinding } from '@connection-portal/rules/checks/types';
import { mainBranch, MDL, PID, rule, US1_RULES } from '@connection-portal/rules/testData';
import { describe, expect, it } from 'vitest';

import { ApiError } from '../../api/client';
import { INITIAL_DRAFT_DELETE_STATE } from './constants';
import {
  deleteDraftDialogOf,
  deleteDraftErrorOf,
  deleteDraftNoticeOf,
  dialogCopyOf,
  draftDeleteReducer,
  draftRuleDocumentsOf,
  editedLineOf,
  initialAccordionOf,
  keyedBranchesOf,
  linksCountsOf,
  reactivateSummaryOf,
  requestedDocumentsOf,
  resultLinksOf,
  rulesCountsOf,
  summaryCountsOf,
  summaryFindingsOf,
  toggleAccordion,
} from './utils';

function branch(id: string, name: string, isMain = false): Branch {
  return {
    id,
    name,
    description: isMain ? null : `About ${name}`,
    origin: isMain ? 'main' : 'based',
    operator: 'and',
    operator_mark: null,
    items: [],
    is_main: isMain,
    pull_url: isMain
      ? 'https://connect.example/api/connect/fc/requests/{reference}'
      : `https://connect.example/api/connect/fc/branches/${id}/requests/{reference}`,
  };
}

function connection(branches: Branch[]): FormConnection {
  return {
    status: 'published',
    id: 'fc',
    name: 'Passenger transport licence',
    description: 'PT-1',
    is_active: true,
    documents: [],
    trigger_url: 'https://connect.example/api/connect/fc/requests',
    pull_url: 'https://connect.example/api/connect/fc/requests/{reference}',
    branches,
    rule_set_version: 1,
    next_rule_number: 1,
    next_group_number: 1,
    created_at: '2026-10-25T10:00:00Z',
    updated_at: '2026-10-25T10:00:00Z',
  };
}

describe('resultLinksOf (FR-026; F24, W2)', () => {
  it('shows Standard’s pull URL as spec 001 does, without a label, while it is the only one', () => {
    expect(resultLinksOf(connection([branch('main', 'Standard', true)]))).toEqual([
      {
        key: 'result',
        url: 'https://connect.example/api/connect/fc/requests/{reference}',
        branch: null,
      },
    ]);
  });

  it('labels every variant’s own pull URL, Standard first, from its pull_url', () => {
    const links = resultLinksOf(
      connection([branch('main', 'Standard', true), branch('b-1', 'Ambulance')])
    );
    expect(links.map(({ key, url, branch: labelled }) => [key, url, labelled?.name])).toEqual([
      ['main', 'https://connect.example/api/connect/fc/requests/{reference}', 'Standard'],
      [
        'b-1',
        'https://connect.example/api/connect/fc/branches/b-1/requests/{reference}',
        'Ambulance',
      ],
    ]);
  });
});

function marked<T extends RuleTreeItem>(item: T, mark: Mark | null): T {
  return { ...item, mark };
}

function group(number: number, items: RuleTreeItem[]): GroupItem {
  return {
    type: 'group',
    id: `group-${number}`,
    name: `Group 0${number}`,
    mark: null,
    operator: 'or',
    message: null,
    items,
  };
}

function variant(origin: BranchInput['origin'], items: RuleTreeItem[]): BranchInput {
  return { ...mainBranch(items), name: 'Ambulance', origin };
}

describe('rulesCountsOf (Figma 10.11, B8)', () => {
  it('counts Standard as a variant, and no rules as 0 rules', () => {
    expect(rulesCountsOf([mainBranch([])], 'en')).toBe('1 variant · 0 rules');
  });

  it('uses the singular for one rule', () => {
    expect(rulesCountsOf([mainBranch([rule(1, null, null)])], 'en')).toBe('1 variant · 1 rule');
  });

  it('counts the rules in groups and sub-groups one by one, not the groups', () => {
    const items = [
      rule(1, null, null),
      group(1, [rule(2, null, null), group(2, [rule(3, null, null), rule(4, null, null)])]),
    ];
    expect(rulesCountsOf([mainBranch(items)], 'en')).toBe('1 variant · 4 rules');
  });

  it('counts a rule that variants inherit, change or remove once, and their own rules too', () => {
    const standard = [rule(1, null, null), rule(2, null, null), rule(3, null, null)];
    const ambulance = variant('based', [
      rule(1, null, null),
      marked(rule(2, null, null), 'changed'),
      marked(rule(3, null, null), 'removed'),
      marked(rule(4, null, null), 'added'),
    ]);
    const taxi = variant('empty', [rule(5, null, null), rule(6, null, null)]);
    expect(rulesCountsOf([mainBranch(standard), ambulance, taxi], 'en')).toBe(
      '3 variants · 6 rules'
    );
  });

  it('skips a rule that only a removed item holds', () => {
    const removedGroup = marked(group(1, [rule(1, null, null), rule(2, null, null)]), 'removed');
    const items = [removedGroup, marked(rule(3, null, null), 'removed'), rule(4, null, null)];
    expect(rulesCountsOf([variant('empty', items)], 'en')).toBe('1 variant · 1 rule');
  });

  it('counts in German with one and other forms (spec 009)', () => {
    expect(rulesCountsOf([mainBranch([rule(1, null, null)])], 'de')).toBe('1 Variante · 1 Regel');
    const items = [rule(1, null, null), rule(2, null, null)];
    expect(rulesCountsOf([mainBranch(items), variant('empty', [])], 'de')).toBe(
      '2 Varianten · 2 Regeln'
    );
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

describe('linksCountsOf (FR-052f)', () => {
  it('counts the request link and one result link per variant', () => {
    const withVariants = connection([
      branch('b1', 'Standard', true),
      branch('b2', 'Ambulance'),
      branch('b3', 'School transport'),
    ]);
    expect(linksCountsOf(withVariants, 'en')).toBe('1 request link · 3 result links');
  });

  it('says "1 result link" with Standard only', () => {
    expect(linksCountsOf(connection([branch('b1', 'Standard', true)]), 'en')).toBe(
      '1 request link · 1 result link'
    );
  });

  it('counts in German (spec 009)', () => {
    expect(linksCountsOf(connection([branch('b1', 'Standard', true)]), 'de')).toBe(
      '1 Anfragelink · 1 Ergebnislink'
    );
    expect(
      linksCountsOf(connection([branch('b1', 'Standard', true), branch('b2', 'Ambulance')]), 'de')
    ).toBe('1 Anfragelink · 2 Ergebnislinks');
  });
});

describe('initialAccordionOf and toggleAccordion (FR-046, F50)', () => {
  it('opens the links right after publishing and the summary otherwise', () => {
    expect(initialAccordionOf('published')).toBe('links');
    expect(initialAccordionOf('saved')).toBe('summary');
    expect(initialAccordionOf(null)).toBe('summary');
  });

  it('keeps one accordion open at a time', () => {
    expect(toggleAccordion('summary', 'links')).toBe('links');
    expect(toggleAccordion('links', 'links')).toBeNull();
    expect(toggleAccordion(null, 'summary')).toBe('summary');
    expect(toggleAccordion('links', 'summary')).toBe('summary');
  });
});

describe('editedLineOf (S16, FR-049)', () => {
  it('writes the overview’s date with the 24-hour time of the browser’s time zone', () => {
    const editedAt = new Date(2026, 9, 3, 14, 32).toISOString();
    expect(editedLineOf(editedAt, 'en')).toBe('Edited 03.10.2026, 14:32');
  });

  it('pads the day, month, hour and minutes, and writes midnight as 00', () => {
    expect(editedLineOf(new Date(2026, 0, 9, 9, 5).toISOString(), 'en')).toBe(
      'Edited 09.01.2026, 09:05'
    );
    expect(editedLineOf(new Date(2026, 0, 9, 0, 0).toISOString(), 'en')).toBe(
      'Edited 09.01.2026, 00:00'
    );
  });

  it('writes the same date and 24-hour time after the German word (spec 009, R5)', () => {
    expect(editedLineOf(new Date(2026, 9, 3, 14, 32).toISOString(), 'de')).toBe(
      'Bearbeitet 03.10.2026, 14:32'
    );
    expect(editedLineOf(new Date(2026, 0, 9, 0, 0).toISOString(), 'de')).toBe(
      'Bearbeitet 09.01.2026, 00:00'
    );
  });
});

describe('deleteDraftErrorOf (S6)', () => {
  it('says that the draft has been published meanwhile for a 409 draft_published', () => {
    const error = new ApiError(409, {
      error: 'draft_published',
      message: 'This draft has been published since you opened it.',
    });
    expect(deleteDraftErrorOf(error, 'en')).toEqual({
      kind: 'published',
      notice: { message: 'This draft has been published since you opened it.' },
    });
  });

  it('says that the draft was already deleted for a 404', () => {
    const error = new ApiError(404, { error: 'Not found', message: 'Not found' });
    expect(deleteDraftErrorOf(error, 'en')).toEqual({
      kind: 'deleted',
      notice: { message: 'This draft has already been deleted.' },
    });
  });

  it('passes another 409 and a 5xx through, with the error ID', () => {
    const conflict = new ApiError(409, { error: 'not_published', message: 'Not a draft.' });
    expect(deleteDraftErrorOf(conflict, 'en')).toEqual({
      kind: 'failed',
      notice: { message: 'Not a draft.', error_id: undefined },
    });
    const serverError = new ApiError(500, {
      error: 'Internal server error',
      message: 'Something went wrong.',
      error_id: 'abc123',
    });
    expect(deleteDraftErrorOf(serverError, 'en')).toEqual({
      kind: 'failed',
      notice: { message: 'Something went wrong.', error_id: 'abc123' },
    });
  });

  it('says that nothing changed after a network failure', () => {
    expect(deleteDraftErrorOf(new TypeError('Failed to fetch'), 'en')).toEqual({
      kind: 'failed',
      notice: { message: 'Nothing changed. Check your connection and try again.' },
    });
  });

  it('words its own messages in German, and passes the API’s through (spec 009)', () => {
    expect(
      deleteDraftErrorOf(new ApiError(409, { error: 'draft_published', message: '' }), 'de')
    ).toEqual({
      kind: 'published',
      notice: { message: 'Dieser Entwurf wurde veröffentlicht, nachdem Sie ihn geöffnet haben.' },
    });
    expect(
      deleteDraftErrorOf(new ApiError(404, { error: 'Not found', message: '' }), 'de').notice
    ).toEqual({ message: 'Dieser Entwurf wurde bereits gelöscht.' });
    expect(deleteDraftErrorOf(new TypeError('Failed to fetch'), 'de').notice).toEqual({
      message:
        'Es wurde nichts geändert. Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
    });
    const serverError = new ApiError(500, {
      error: 'Internal server error',
      message: 'Etwas ist auf unserer Seite schiefgelaufen.',
      error_id: 'abc123',
    });
    expect(deleteDraftErrorOf(serverError, 'de').notice).toEqual({
      message: 'Etwas ist auf unserer Seite schiefgelaufen.',
      error_id: 'abc123',
    });
  });
});

describe('deleteDraftNoticeOf (S6; spec 009)', () => {
  it('words a draft published or deleted meanwhile in the language of the moment', () => {
    const published = deleteDraftErrorOf(
      new ApiError(409, { error: 'draft_published', message: '' }),
      'en'
    );
    const deleted = deleteDraftErrorOf(
      new ApiError(404, { error: 'Not found', message: '' }),
      'en'
    );
    expect(deleteDraftNoticeOf(published, 'en')).toEqual(published.notice);
    expect(deleteDraftNoticeOf(published, 'de')).toEqual({
      message: 'Dieser Entwurf wurde veröffentlicht, nachdem Sie ihn geöffnet haben.',
    });
    expect(deleteDraftNoticeOf(deleted, 'de')).toEqual({
      message: 'Dieser Entwurf wurde bereits gelöscht.',
    });
  });

  it('shows another failure as it arrived, and nothing without one', () => {
    const failed = deleteDraftErrorOf(
      new ApiError(500, { error: 'Internal server error', message: 'Etwas.', error_id: 'abc' }),
      'de'
    );
    expect(deleteDraftNoticeOf(failed, 'en')).toBe(failed.notice);
    expect(deleteDraftNoticeOf(null, 'de')).toBeNull();
  });
});

describe('the delete confirmation of a draft (S6)', () => {
  const failed = deleteDraftErrorOf(new TypeError('Failed to fetch'), 'en');

  it('keeps the dialog open while deleting runs, and shows a failure until it retries', () => {
    const open = draftDeleteReducer(INITIAL_DRAFT_DELETE_STATE, { type: 'openDialog' });
    const running = draftDeleteReducer(open, { type: 'start' });
    expect(draftDeleteReducer(running, { type: 'closeDialog' })).toBe(running);
    const failure = draftDeleteReducer(running, { type: 'failed', failure: failed });
    expect(failure).toEqual({ dialogOpen: true, deleting: false, failure: failed });
    expect(draftDeleteReducer(failure, { type: 'start' }).failure).toBeNull();
    expect(draftDeleteReducer(failure, { type: 'closeDialog' })).toEqual(
      INITIAL_DRAFT_DELETE_STATE
    );
  });

  it('offers to open the connection or the overview after a conflict, and to retry otherwise', () => {
    const published = deleteDraftErrorOf(
      new ApiError(409, { error: 'draft_published', message: '' }),
      'en'
    );
    const deleted = deleteDraftErrorOf(
      new ApiError(404, { error: 'Not found', message: '' }),
      'en'
    );
    expect(deleteDraftDialogOf(published, 'en')).toMatchObject({
      retryLabel: 'Open the connection',
      danger: false,
    });
    expect(deleteDraftDialogOf(deleted, 'en')).toMatchObject({
      retryLabel: 'Go to overview',
      danger: false,
    });
    expect(deleteDraftDialogOf(failed, 'en')).toMatchObject({
      retryLabel: 'Try again',
      danger: true,
    });
    expect(deleteDraftDialogOf(null, 'en')).toMatchObject({ danger: true });
  });

  it('labels the error and the buttons in German (spec 009)', () => {
    const published = deleteDraftErrorOf(
      new ApiError(409, { error: 'draft_published', message: '' }),
      'de'
    );
    expect(deleteDraftDialogOf(published, 'de')).toEqual({
      errorTitle: 'Konnte nicht gelöscht werden',
      retryLabel: 'Anbindung öffnen',
      danger: false,
    });
    expect(deleteDraftDialogOf(null, 'de').retryLabel).toBe('Erneut versuchen');
  });
});

describe('the confirmations of a published connection (S17)', () => {
  const active = connection([branch('main', 'Standard', true)]);
  const deactivated = { ...active, is_active: false };

  it('deletes in the overview’s one dialog, its body by the state, in danger red', () => {
    expect(dialogCopyOf('delete', active, 'en')).toMatchObject({
      title: 'Delete “Passenger transport licence”?',
      text: 'This connection is active. Citizens won’t be able to use it, and its links stop working.',
      confirmLabel: 'Delete connection',
      cancelLabel: 'Keep connection',
      busyLabel: 'Deleting…',
      danger: true,
      wide: false,
    });
    expect(dialogCopyOf('delete', deactivated, 'en').text).toBe(
      'Its documents and rules will be deleted too.'
    );
  });

  it('deactivates with F13’s body and “Keep active”, and reactivates in the wide dialog', () => {
    expect(dialogCopyOf('deactivate', active, 'en')).toMatchObject({
      title: 'Deactivate this connection?',
      text: 'The connection will be deactivated and its links will stop working at once. Requests in progress are cancelled. Remember to remove the wallet connection from your service.',
      confirmLabel: 'Deactivate',
      cancelLabel: 'Keep active',
      danger: false,
    });
    expect(dialogCopyOf('activate', deactivated, 'en')).toMatchObject({
      title: 'Activate this connection again?',
      confirmLabel: 'Activate',
      cancelLabel: 'Cancel',
      busyLabel: 'Activating…',
      errorTitle: 'Couldn’t reactivate',
      wide: true,
    });
  });

  it('words every confirmation in German, with the overview’s delete dialog (spec 009)', () => {
    expect(dialogCopyOf('delete', active, 'de')).toMatchObject({
      title: '„Passenger transport licence“ löschen?',
      text: 'Diese Anbindung ist aktiv. Bürgerinnen und Bürger können sie dann nicht mehr nutzen, und ihre Links funktionieren nicht mehr.',
      confirmLabel: 'Anbindung löschen',
      cancelLabel: 'Anbindung behalten',
      busyLabel: 'Wird gelöscht …',
      errorTitle: 'Konnte nicht gelöscht werden',
      danger: true,
    });
    expect(dialogCopyOf('deactivate', active, 'de')).toEqual({
      title: 'Diese Anbindung deaktivieren?',
      text: 'Die Anbindung wird deaktiviert, und ihre Links funktionieren sofort nicht mehr. Laufende Anfragen werden abgebrochen. Denken Sie daran, die Wallet-Anbindung aus Ihrem Dienst zu entfernen.',
      confirmLabel: 'Deaktivieren',
      cancelLabel: 'Aktiv lassen',
      busyLabel: 'Wird deaktiviert …',
      errorTitle: 'Konnte nicht deaktiviert werden',
      danger: false,
      wide: false,
    });
    expect(dialogCopyOf('activate', deactivated, 'de')).toMatchObject({
      title: 'Diese Anbindung wieder aktivieren?',
      confirmLabel: 'Aktivieren',
      cancelLabel: 'Abbrechen',
      busyLabel: 'Wird aktiviert …',
      errorTitle: 'Konnte nicht reaktiviert werden',
      wide: true,
    });
  });

  it('sums up the documents and the variants’ rules for reactivating (FR-051 (40))', () => {
    const standard = { ...branch('main', 'Standard', true), items: US1_RULES };
    const ambulance = { ...branch('b1', ' Ambulance '), items: [] };
    const summary = reactivateSummaryOf(
      {
        documents: [
          {
            document_type: 'pid',
            label: 'Personal ID',
            fields: [field('birthdate', 'Date of birth'), field('given_name', 'Given name')],
          },
          { document_type: 'mdl', label: 'Driving licence', fields: [field('classes', 'Classes')] },
        ],
        branches: [standard, ambulance],
      },
      'en'
    );
    expect(summary).toEqual({
      documentLines: ['Personal ID · 2 data items', 'Driving licence · 1 data item'],
      ruleLines: [`Standard · ${US1_RULES.length} rules`, 'Ambulance · No rules'],
    });
  });

  it('sums up in German, with the publish dialog’s lines (spec 009)', () => {
    const summary = reactivateSummaryOf(
      {
        documents: [
          { document_type: 'pid', label: 'Personalausweis', fields: [field('birthdate', 'G')] },
        ],
        branches: [{ ...branch('main', 'Standard', true), items: [] }],
      },
      'de'
    );
    expect(summary).toEqual({
      documentLines: ['Personalausweis · 1 Feld'],
      ruleLines: ['Standard · Keine Regeln'],
    });
  });
});

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

describe('summaryCountsOf (FR-046 (i))', () => {
  const personalId = {
    document_type: 'pid',
    label: 'Personal ID',
    fields: Array.from({ length: 7 }, (_, index) => field(`f${index}`, `F${index}`)),
  };
  const drivingLicence = {
    document_type: 'mdl',
    label: 'Driving licence',
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
    expect(summaryCountsOf([personalId, drivingLicence], branches, 'en')).toBe(
      '2 documents · 9 data items · 3 variants · 4 rules'
    );
  });

  it('uses the singular for one of each, and counts nothing as 0', () => {
    expect(
      summaryCountsOf(
        [{ ...drivingLicence, fields: drivingLicence.fields.slice(0, 1) }],
        [mainBranch([rule(1, null, null)])],
        'en'
      )
    ).toBe('1 document · 1 data item · 1 variant · 1 rule');
    expect(summaryCountsOf([], [mainBranch([])], 'en')).toBe(
      '0 documents · 0 data items · 1 variant · 0 rules'
    );
  });

  it('counts in German, a data item as a field (spec 009; G§2 "data item")', () => {
    const main = mainBranch([rule(1, null, null), rule(2, null, null)]);
    expect(summaryCountsOf([personalId, drivingLicence], [main], 'de')).toBe(
      '2 Dokumente · 9 Felder · 1 Variante · 2 Regeln'
    );
    expect(
      summaryCountsOf(
        [{ ...drivingLicence, fields: drivingLicence.fields.slice(0, 1) }],
        [mainBranch([rule(1, null, null)])],
        'de'
      )
    ).toBe('1 Dokument · 1 Feld · 1 Variante · 1 Regel');
  });
});

describe('keyedBranchesOf and requestedDocumentsOf (research R7)', () => {
  it('keys a branch by its id, and a draft’s without one by its place', () => {
    const keyed = keyedBranchesOf([branch('b1', 'Standard', true), mainBranch([])]);
    expect(keyed.map((entry) => entry.key)).toEqual(['b1', '1']);
    expect(keyed[0].name).toBe('Standard');
  });

  it('gives the requested documents with the keys of their fields', () => {
    expect(
      requestedDocumentsOf([
        { document_type: 'pid', label: 'Personal ID', fields: [field('birthdate', 'B')] },
      ])
    ).toEqual([{ document_type: 'pid', fields: ['birthdate'] }]);
  });
});

describe('summaryFindingsOf (FR-047, CLAR #36; U85)', () => {
  const branches = keyedBranchesOf([
    { ...mainBranch(US1_RULES), id: 'main' },
    { ...mainBranch(US1_RULES), id: 'b2', name: 'Ambulance', origin: 'based' },
    { ...mainBranch(US1_RULES), id: 'b3', name: 'School transport', origin: 'based' },
  ]);
  const duplicate: ItemFinding[] = [
    { itemId: 'rule-3', kind: 'redundant', reason: { type: 'same', item: 'rule-1' }, today: false },
  ];
  const conflict: ItemFinding[] = [
    {
      itemId: 'rule-1',
      kind: 'conflicting',
      reason: { type: 'with', items: ['rule-2'] },
      today: false,
    },
    {
      itemId: 'rule-2',
      kind: 'conflicting',
      reason: { type: 'with', items: ['rule-1'] },
      today: false,
    },
  ];

  function check(branchKey: string, findings: ItemFinding[]): BranchCheck {
    return {
      branchKey,
      fingerprint: 'f',
      complete: true,
      notice: findings === conflict ? { kind: 'none_can_meet', today: false } : null,
      findings: [...findings, ...(findings === conflict ? duplicate : [])],
      checkedRules: US1_RULES.length,
    };
  }

  it('lists the publish dialog’s line of each variant with findings, warnings first', () => {
    const items = summaryFindingsOf(
      branches,
      {
        main: check('main', duplicate),
        b2: check('b2', conflict),
        b3: check('b3', []),
      },
      'en'
    );
    expect(items).toEqual([
      {
        key: 'b2',
        tone: 'warning',
        kindText: null,
        parts: [
          'Ambulance: no citizen can meet these rules. 2 rules contradict each other, and 1 rule is a duplicate.',
        ],
      },
      { key: 'main', tone: 'info', kindText: null, parts: ['Standard: 1 rule is a duplicate.'] },
    ]);
  });

  it('shows nothing for a variant not checked yet, and nothing as a link', () => {
    const items = summaryFindingsOf(branches, { main: check('main', duplicate), b2: null }, 'en');
    expect(items.map((item) => item.key)).toEqual(['main']);
    expect(items.every((item) => item.parts.every((part) => typeof part === 'string'))).toBe(true);
    expect(summaryFindingsOf(branches, {}, 'en')).toEqual([]);
  });

  it('words the lines in German, warnings first (spec 009)', () => {
    const items = summaryFindingsOf(
      branches,
      { main: check('main', duplicate), b2: check('b2', conflict) },
      'de'
    );
    expect(items.map((item) => [item.key, item.tone])).toEqual([
      ['b2', 'warning'],
      ['main', 'info'],
    ]);
    expect(items[1].parts).toEqual(['Standard: 1 Regel ist ein Duplikat.']);
  });
});
