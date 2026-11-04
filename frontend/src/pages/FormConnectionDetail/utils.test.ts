import { describe, expect, it } from 'vitest';

import { ApiError } from '../../api/client';
import type {
  Branch,
  BranchInput,
  FormConnection,
  GroupItem,
  Mark,
  RuleTreeItem,
} from '../../types/form-connections';
import { mainBranch, MDL, PID, rule } from '../../utils/rules/testData';
import { INITIAL_DRAFT_DELETE_STATE } from './constants';
import {
  deleteDraftDialogOf,
  deleteDraftErrorOf,
  draftDeleteReducer,
  draftRuleDocumentsOf,
  reachedStepsOf,
  resultLinksOf,
  rulesCountsOf,
  savedLineOf,
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
    servicebw_form: 'PT-1',
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
    expect(rulesCountsOf([mainBranch([])])).toBe('1 variant · 0 rules');
  });

  it('uses the singular for one rule', () => {
    expect(rulesCountsOf([mainBranch([rule(1, null, null)])])).toBe('1 variant · 1 rule');
  });

  it('counts the rules in groups and sub-groups one by one, not the groups', () => {
    const items = [
      rule(1, null, null),
      group(1, [rule(2, null, null), group(2, [rule(3, null, null), rule(4, null, null)])]),
    ];
    expect(rulesCountsOf([mainBranch(items)])).toBe('1 variant · 4 rules');
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
    expect(rulesCountsOf([mainBranch(standard), ambulance, taxi])).toBe('3 variants · 6 rules');
  });

  it('skips a rule that only a removed item holds', () => {
    const removedGroup = marked(group(1, [rule(1, null, null), rule(2, null, null)]), 'removed');
    const items = [removedGroup, marked(rule(3, null, null), 'removed'), rule(4, null, null)];
    expect(rulesCountsOf([variant('empty', items)])).toBe('1 variant · 1 rule');
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

describe('reachedStepsOf (S6)', () => {
  it('reaches every step up to and including the one the draft was saved in', () => {
    expect(reachedStepsOf('connection')).toBe(1);
    expect(reachedStepsOf('documents')).toBe(2);
    expect(reachedStepsOf('rules')).toBe(3);
    expect(reachedStepsOf('test')).toBe(4);
  });
});

describe('savedLineOf (S6, Copy)', () => {
  it('writes the overview’s date with the 24-hour time of the browser’s time zone', () => {
    const savedAt = new Date(2026, 10, 4, 14, 32).toISOString();
    expect(savedLineOf(savedAt)).toBe(
      'Saved 4 Nov 2026, 14:32. Continue to finish and publish it.'
    );
  });

  it('pads the hour and minutes, and writes midnight as 00', () => {
    expect(savedLineOf(new Date(2026, 0, 9, 9, 5).toISOString())).toBe(
      'Saved 9 Jan 2026, 09:05. Continue to finish and publish it.'
    );
    expect(savedLineOf(new Date(2026, 0, 9, 0, 0).toISOString())).toBe(
      'Saved 9 Jan 2026, 00:00. Continue to finish and publish it.'
    );
  });
});

describe('deleteDraftErrorOf (S6)', () => {
  it('says that the draft has been published meanwhile for a 409 draft_published', () => {
    const error = new ApiError(409, {
      error: 'draft_published',
      message: 'This draft has been published since you opened it.',
    });
    expect(deleteDraftErrorOf(error)).toEqual({
      kind: 'published',
      notice: { message: 'This draft has been published since you opened it.' },
    });
  });

  it('says that the draft was already deleted for a 404', () => {
    const error = new ApiError(404, { error: 'Not found', message: 'Not found' });
    expect(deleteDraftErrorOf(error)).toEqual({
      kind: 'deleted',
      notice: { message: 'This draft has already been deleted.' },
    });
  });

  it('passes another 409 and a 5xx through, with the error ID', () => {
    const conflict = new ApiError(409, { error: 'not_published', message: 'Not a draft.' });
    expect(deleteDraftErrorOf(conflict)).toEqual({
      kind: 'failed',
      notice: { message: 'Not a draft.', error_id: undefined },
    });
    const serverError = new ApiError(500, {
      error: 'Internal server error',
      message: 'Something went wrong.',
      error_id: 'abc123',
    });
    expect(deleteDraftErrorOf(serverError)).toEqual({
      kind: 'failed',
      notice: { message: 'Something went wrong.', error_id: 'abc123' },
    });
  });

  it('says that nothing changed after a network failure', () => {
    expect(deleteDraftErrorOf(new TypeError('Failed to fetch'))).toEqual({
      kind: 'failed',
      notice: { message: 'Nothing changed. Check your connection and try again.' },
    });
  });
});

describe('the delete confirmation of a draft (S6)', () => {
  const failed = deleteDraftErrorOf(new TypeError('Failed to fetch'));

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
      new ApiError(409, { error: 'draft_published', message: '' })
    );
    const deleted = deleteDraftErrorOf(new ApiError(404, { error: 'Not found', message: '' }));
    expect(deleteDraftDialogOf(published)).toMatchObject({
      retryLabel: 'Open the connection',
      danger: false,
    });
    expect(deleteDraftDialogOf(deleted)).toMatchObject({
      retryLabel: 'Go to overview',
      danger: false,
    });
    expect(deleteDraftDialogOf(failed)).toMatchObject({ retryLabel: 'Try again', danger: true });
    expect(deleteDraftDialogOf(null)).toMatchObject({ danger: true });
  });
});
