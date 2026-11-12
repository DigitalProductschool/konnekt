import type { ApprovalPreview, ApprovalRequest } from '@connection-portal/api-types/approvals';
import type { DocumentField, DocumentType } from '@connection-portal/api-types/document-types';
import type {
  FormConnection,
  FormConnectionDraft,
} from '@connection-portal/api-types/form-connections';
import { describe, expect, it } from 'vitest';

import { ApiError } from '../../api/client';
import { SAVED_TIME_FORMATS } from '../FormConnectionDetail/constants';
import { formatRowDate } from '../FormConnectionList/utils';
import { APPROVAL_COPY, INITIAL_APPROVAL_STATE } from './constants';
import type { ApprovalPageState, LoadedApprovalState } from './types';
import {
  approvalReducer,
  busyTextOf,
  callFailureOf,
  cancelledTextOf,
  checkedBranchesOf,
  connectionChangedTextOf,
  documentsInLanguageOf,
  doneShowsUrls,
  doneTextOf,
  exampleLineOf,
  failureOfPreview,
  finalOutcomeOf,
  isStatusAction,
  lastSavedLineOf,
  loadFailureActionOf,
  outcomeOfError,
  outcomeTextOf,
  outcomeViewOf,
  requestedDocumentsOf,
  startLineOf,
  statusLinesOf,
  subtitleOf,
  titleOf,
  urlsLinksOf,
} from './utils';

const EXPIRES_AT = '2026-11-06T13:32:00Z';
const TIME = SAVED_TIME_FORMATS.en.format(new Date(EXPIRES_AT));

const REQUEST: ApprovalRequest = {
  id: 'req-1',
  action: 'publish',
  form_connection_id: 'fc-1',
  connection_name: 'Parking permit',
  requested_by: 'Claude Code',
  status: 'waiting',
  outcome: 'waiting',
  cancel_reason: null,
  start_date: null,
  link: 'https://portal.example/approvals/req-1',
  expires_at: EXPIRES_AT,
  created_at: '2026-11-06T13:17:00Z',
  decided_at: null,
  failed_at: null,
  error_id: null,
  mine: true,
};

const TEXT_FIELD: DocumentField = {
  key: '',
  label: '',
  kind: 'text',
  option_set: null,
  date_of_birth: false,
  parts: null,
  multiple_values: false,
};

const DRAFT: FormConnectionDraft = {
  status: 'draft',
  state: 'draft',
  id: 'fc-1',
  name: 'Parking permit',
  description: 'Residents’ parking',
  documents: [
    {
      document_type: 'pid',
      label: 'Personal ID',
      fields: [
        { ...TEXT_FIELD, key: 'given_name', label: 'Given name' },
        { ...TEXT_FIELD, key: 'birth_date', label: 'Date of birth', kind: 'date' },
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
      items: [],
    },
    {
      id: 'b-2',
      name: 'Ambulance',
      description: null,
      origin: 'based',
      operator: 'and',
      operator_mark: null,
      items: [],
    },
  ],
  next_rule_number: 1,
  next_group_number: 1,
  step: 'rules',
  version: 3,
  created_at: '2026-11-04T09:00:00Z',
  updated_at: '2026-11-05T12:30:00Z',
  last_activity: null,
  example: null,
};

/** A published connection as the preview holds it, live or deactivated */
function connectionOf(isActive: boolean): FormConnection {
  return {
    status: 'published',
    id: 'fc-1',
    name: 'Parking permit',
    description: '',
    is_active: isActive,
    documents: [],
    trigger_url: 'https://portal.example/api/connect/fc-1',
    pull_url: 'https://portal.example/api/connect/fc-1/result/{reference}',
    branches: [],
    rule_set_version: 2,
    next_rule_number: 1,
    next_group_number: 1,
    created_at: '2026-11-04T09:00:00Z',
    updated_at: '2026-11-05T12:30:00Z',
    state: isActive ? 'live' : 'deactivated',
    published_at: '2026-11-04T09:00:00Z',
    activated_at: '2026-11-04T09:00:00Z',
    deactivated_at: isActive ? null : '2026-11-05T12:30:00Z',
    start_date: null,
    last_activity: null,
  };
}

/** A scheduled connection as the preview holds it */
function scheduledOf(startDate: string): FormConnection {
  return {
    ...connectionOf(false),
    state: 'scheduled',
    activated_at: null,
    deactivated_at: null,
    start_date: startDate,
  };
}

function previewOf(request: Partial<ApprovalRequest> = {}): ApprovalPreview {
  return {
    request: { ...REQUEST, ...request },
    draft: DRAFT,
    connection: null,
    urls: null,
  };
}

function loaded(state: ApprovalPageState): LoadedApprovalState {
  if (state.status !== 'loaded') {
    throw new Error('not loaded');
  }
  return state;
}

describe('titleOf', () => {
  it('names the connection by action', () => {
    expect(titleOf('publish', 'Parking permit', 'en')).toBe('Publish ‘Parking permit’?');
    expect(titleOf('delete_draft', 'Parking permit', 'en')).toBe(
      'Delete the draft ‘Parking permit’?'
    );
  });

  it('names the connection for the actions on a published one', () => {
    expect(titleOf('deactivate', 'Parking permit', 'en')).toBe('Deactivate ‘Parking permit’?');
    expect(titleOf('reactivate', 'Parking permit', 'en')).toBe('Reactivate ‘Parking permit’?');
    expect(titleOf('delete', 'Parking permit', 'en')).toBe('Delete ‘Parking permit’?');
    expect(titleOf('deactivate', '', 'en')).toBe('Deactivate the connection?');
    expect(titleOf('reactivate', '', 'en')).toBe('Reactivate the connection?');
    expect(titleOf('delete', '', 'en')).toBe('Delete the connection?');
  });

  it('asks to change the start date (spec 010, copy.md §7)', () => {
    expect(titleOf('set_start_date', 'Parking permit', 'en')).toBe(
      'Change the start date of ‘Parking permit’?'
    );
    expect(titleOf('set_start_date', '', 'en')).toBe('Change the start date?');
  });

  it('leaves the name out once a deleted draft’s row is gone', () => {
    expect(titleOf('publish', '', 'en')).toBe('Publish the draft?');
    expect(titleOf('delete_draft', '', 'en')).toBe('Delete the draft?');
    expect(titleOf('delete_draft', '  ', 'en')).toBe('Delete the draft?');
  });
});

describe('subtitleOf', () => {
  it('names the agent and the expiry time', () => {
    expect(subtitleOf(REQUEST, 'en')).toBe(`Requested by Claude Code · expires at ${TIME}`);
  });
});

describe('lastSavedLineOf', () => {
  it('writes the date as dd.mm.yyyy and the 24-hour time (cosmetic 3)', () => {
    const updatedAt = DRAFT.updated_at;
    expect(lastSavedLineOf(updatedAt, 'en')).toBe(
      `Last saved ${formatRowDate(updatedAt)}, ${SAVED_TIME_FORMATS.en.format(new Date(updatedAt))}`
    );
  });
});

describe('outcomeTextOf', () => {
  it('has no sentence while the request waits, failed or not', () => {
    expect(outcomeTextOf(REQUEST, null, 'en')).toBeNull();
    expect(outcomeTextOf({ ...REQUEST, outcome: 'failed', error_id: 'e1' }, null, 'en')).toBeNull();
  });

  it('words a done request by its action', () => {
    expect(outcomeTextOf({ ...REQUEST, status: 'done', outcome: 'done' }, null, 'en')).toBe(
      'Published.'
    );
    expect(
      outcomeTextOf(
        { ...REQUEST, action: 'delete_draft', status: 'done', outcome: 'done' },
        null,
        'en'
      )
    ).toBe('Draft deleted.');
    const done = (action: ApprovalRequest['action']) =>
      outcomeTextOf({ ...REQUEST, action, status: 'done', outcome: 'done' }, null, 'en');
    expect(done('deactivate')).toBe('Connection deactivated.');
    expect(done('reactivate')).toBe('Connection reactivated.');
    expect(done('delete')).toBe('Connection deleted.');
  });

  it('words declined, expired and replaced', () => {
    expect(outcomeTextOf({ ...REQUEST, status: 'declined' }, null, 'en')).toBe(
      'You declined this request. Nothing has changed.'
    );
    expect(outcomeTextOf({ ...REQUEST, status: 'expired' }, null, 'en')).toBe(
      `This request expired at ${TIME}. Nothing has changed. The agent can ask again.`
    );
    expect(outcomeTextOf({ ...REQUEST, status: 'replaced' }, null, 'en')).toBe(
      'The agent made a newer request for this action.'
    );
  });

  it('words a cancellation by its reason', () => {
    const cancelled = (reason: string | null) =>
      outcomeTextOf({ ...REQUEST, status: 'cancelled', cancel_reason: reason }, null, 'en');
    expect(cancelled('draft_changed')).toBe(
      'The draft has changed since the agent asked. Nothing has changed; the agent has to ask again.'
    );
    expect(cancelled('draft_published')).toBe(
      'The draft has been published since the agent asked.'
    );
    expect(cancelled('draft_deleted')).toBe('The draft has been deleted since the agent asked.');
    expect(cancelled('access_changed')).toBe(
      'The agent’s access has changed, so this request was cancelled.'
    );
    expect(cancelled('revoked')).toBe(
      'The agent’s access was revoked, so this request was cancelled.'
    );
    expect(cancelled('access_ended')).toBe(
      'The agent’s access has ended, so this request was cancelled.'
    );
    expect(cancelled('connection_deleted')).toBe(
      'The connection has been deleted in the meantime.'
    );
    expect(cancelled(null)).toBe('This request was cancelled.');
  });

  it('words a changed connection by whether it is live now', () => {
    const changed = { ...REQUEST, action: 'deactivate' as const, status: 'cancelled' as const };
    expect(
      outcomeTextOf({ ...changed, cancel_reason: 'connection_changed' }, connectionOf(false), 'en')
    ).toBe('The connection was deactivated in the meantime.');
    expect(
      outcomeTextOf(
        { ...changed, action: 'reactivate', cancel_reason: 'connection_changed' },
        connectionOf(true),
        'en'
      )
    ).toBe('The connection was reactivated in the meantime.');
  });
});

describe('cancelledTextOf', () => {
  const reasonOf = (
    cancel_reason: string | null,
    action: ApprovalRequest['action'] = 'delete'
  ) => ({
    cancel_reason,
    action,
  });

  it('falls back to the general sentence without the connection', () => {
    expect(cancelledTextOf(reasonOf('connection_changed'), null, 'en')).toBe(
      'This request was cancelled.'
    );
    expect(cancelledTextOf(reasonOf('connection_deleted'), null, 'en')).toBe(
      'The connection has been deleted in the meantime.'
    );
  });

  it('says that the start date passed (spec 010, FR-065)', () => {
    expect(cancelledTextOf(reasonOf('start_date_passed', 'publish'), null, 'en')).toBe(
      'The start date is no longer after today. The agent can ask again with a new date.'
    );
    expect(cancelledTextOf(reasonOf('start_date_passed', 'set_start_date'), null, 'de')).toBe(
      'Das Startdatum liegt nicht mehr nach dem heutigen Tag. Der Agent kann mit einem neuen Datum erneut fragen.'
    );
  });

  it('words a changed connection from its state now and the action (spec 010, FR-066)', () => {
    expect(
      cancelledTextOf(reasonOf('connection_changed', 'deactivate'), scheduledOf('2026-12-20'), 'en')
    ).toBe('The connection’s start date changed in the meantime.');
    expect(
      cancelledTextOf(reasonOf('connection_changed', 'delete'), connectionOf(true), 'en')
    ).toBe('The connection became active in the meantime.');
  });
});

describe('connectionChangedTextOf', () => {
  it('words each state and action as the server does, in both languages', () => {
    expect(connectionChangedTextOf('scheduled', 'set_start_date', 'en')).toBe(
      'The connection’s start date changed in the meantime.'
    );
    expect(connectionChangedTextOf('scheduled', 'reactivate', 'de')).toBe(
      'Das Startdatum der Anbindung wurde inzwischen geändert.'
    );
    expect(connectionChangedTextOf('deactivated', 'delete', 'en')).toBe(
      'The connection was deactivated in the meantime.'
    );
    expect(connectionChangedTextOf('deactivated', 'set_start_date', 'de')).toBe(
      'Die Anbindung wurde in der Zwischenzeit deaktiviert.'
    );
    expect(connectionChangedTextOf('live', 'reactivate', 'en')).toBe(
      'The connection was reactivated in the meantime.'
    );
    expect(connectionChangedTextOf('live', 'reactivate', 'de')).toBe(
      'Die Anbindung wurde in der Zwischenzeit reaktiviert.'
    );
    for (const action of ['deactivate', 'delete', 'set_start_date'] as const) {
      expect(connectionChangedTextOf('live', action, 'en')).toBe(
        'The connection became active in the meantime.'
      );
      expect(connectionChangedTextOf('live', action, 'de')).toBe(
        'Die Anbindung ist inzwischen aktiv geworden.'
      );
    }
  });
});

describe('doneTextOf', () => {
  const doneOf = (action: ApprovalRequest['action'], start_date: string | null) => ({
    action,
    start_date,
  });

  it('words a publish and a reactivation on a date with the date asked for', () => {
    expect(doneTextOf(doneOf('publish', '2026-12-01'), 'en')).toBe(
      'Published and scheduled for 01.12.2026.'
    );
    expect(doneTextOf(doneOf('publish', '2026-12-01'), 'de')).toBe(
      'Veröffentlicht und für den 01.12.2026 geplant.'
    );
    expect(doneTextOf(doneOf('reactivate', '2026-12-01'), 'en')).toBe(
      'Connection scheduled for 01.12.2026.'
    );
    expect(doneTextOf(doneOf('reactivate', '2026-12-01'), 'de')).toBe(
      'Anbindung für den 01.12.2026 geplant.'
    );
  });

  it('keeps the action’s sentence without a date, and for a new start date', () => {
    expect(doneTextOf(doneOf('publish', null), 'en')).toBe('Published.');
    expect(doneTextOf(doneOf('reactivate', null), 'de')).toBe('Anbindung reaktiviert.');
    expect(doneTextOf(doneOf('set_start_date', '2026-12-15'), 'en')).toBe('Start date saved.');
    expect(doneTextOf(doneOf('set_start_date', null), 'en')).toBe('Start date saved.');
    expect(doneTextOf(doneOf('set_start_date', '2026-12-15'), 'de')).toBe(
      'Startdatum gespeichert.'
    );
  });

  it('is the done outcome’s sentence', () => {
    expect(
      outcomeTextOf(
        { ...REQUEST, status: 'done', outcome: 'done', start_date: '2026-12-01' },
        scheduledOf('2026-12-01'),
        'en'
      )
    ).toBe('Published and scheduled for 01.12.2026.');
  });
});

describe('startLineOf', () => {
  it('says when the connection goes live, in both languages (copy.md §7)', () => {
    expect(startLineOf('2026-12-01', 'en')).toBe('Active from 01.12.2026');
    expect(startLineOf('2026-12-01', 'de')).toBe('Aktiv ab 01.12.2026');
    expect(startLineOf(null, 'en')).toBe('The connection goes live at once.');
    expect(startLineOf(null, 'de')).toBe('Die Anbindung wird sofort aktiv.');
  });
});

describe('statusLinesOf', () => {
  const texts = (...args: Parameters<typeof statusLinesOf>) =>
    statusLinesOf(...args).map((line) => (line.strong ? `**${line.text}**` : line.text));

  it('says that deactivating cancels requests, or that a scheduled one won’t become active', () => {
    expect(texts('deactivate', connectionOf(true), null, 'en')).toEqual([
      'Requests in progress are cancelled.',
    ]);
    expect(texts('deactivate', scheduledOf('2026-12-01'), null, 'en')).toEqual([
      'This connection will be active from 01.12.2026. If you deactivate it, it won’t become active and its links won’t work. You can activate it again later.',
    ]);
    expect(texts('deactivate', connectionOf(true), null, 'de')).toEqual([
      'Laufende Anfragen werden abgebrochen.',
    ]);
    expect(texts('deactivate', scheduledOf('2026-12-01'), null, 'de')).toEqual([
      'Diese Anbindung ist ab 01.12.2026 aktiv. Wenn Sie sie deaktivieren, wird sie nicht aktiv und ihre Links funktionieren nicht. Sie können sie später wieder aktivieren.',
    ]);
  });

  it('keeps “Deleting can’t be undone.” after deleting, a scheduled one with FR-010’s sentence', () => {
    expect(texts('delete', connectionOf(true), null, 'en')).toEqual([
      'Requests in progress are cancelled.',
      '**Deleting can’t be undone.**',
    ]);
    expect(texts('delete', connectionOf(false), null, 'en')).toEqual([
      'Requests in progress are cancelled.',
      '**Deleting can’t be undone.**',
    ]);
    expect(texts('delete', scheduledOf('2026-12-01'), null, 'en')).toEqual([
      'This connection will be active from 01.12.2026. If you delete it, it won’t become active and its links won’t work.',
      '**Deleting can’t be undone.**',
    ]);
    expect(texts('delete', scheduledOf('2026-12-01'), null, 'de')).toEqual([
      'Diese Anbindung ist ab 01.12.2026 aktiv. Wenn Sie sie löschen, wird sie nicht aktiv und ihre Links funktionieren nicht.',
      '**Das Löschen kann nicht rückgängig gemacht werden.**',
    ]);
  });

  it('says when a reactivated connection goes live', () => {
    expect(texts('reactivate', connectionOf(false), '2026-12-01', 'en')).toEqual([
      'Active from 01.12.2026',
    ]);
    expect(texts('reactivate', connectionOf(false), null, 'en')).toEqual([
      'The connection goes live at once.',
    ]);
    expect(texts('reactivate', connectionOf(false), '2026-12-01', 'de')).toEqual([
      'Aktiv ab 01.12.2026',
    ]);
    expect(texts('reactivate', connectionOf(false), null, 'de')).toEqual([
      'Die Anbindung wird sofort aktiv.',
    ]);
  });

  it('says what a new start date does to a scheduled and to an active connection', () => {
    expect(texts('set_start_date', scheduledOf('2026-12-01'), '2026-12-15', 'en')).toEqual([
      'Active from 15.12.2026',
    ]);
    expect(texts('set_start_date', scheduledOf('2026-12-01'), null, 'en')).toEqual([
      'The connection goes live at once.',
    ]);
    expect(texts('set_start_date', connectionOf(true), '2026-12-01', 'en')).toEqual([
      'Active from 01.12.2026',
      'Until then its links stop working, and requests in progress are cancelled.',
    ]);
    expect(texts('set_start_date', scheduledOf('2026-12-01'), '2026-12-15', 'de')).toEqual([
      'Aktiv ab 15.12.2026',
    ]);
    expect(texts('set_start_date', scheduledOf('2026-12-01'), null, 'de')).toEqual([
      'Die Anbindung wird sofort aktiv.',
    ]);
    expect(texts('set_start_date', connectionOf(true), '2026-12-01', 'de')).toEqual([
      'Aktiv ab 01.12.2026',
      'Bis dahin funktionieren die Links nicht, und laufende Anfragen werden abgebrochen.',
    ]);
  });
});

describe('exampleLineOf', () => {
  it('shows the example’s line for the unchanged example only (FR-060)', () => {
    expect(exampleLineOf({ example: 'unchanged' }, 'en')).toBe(
      'This is still the example. Check that the name, documents and rules fit your service.'
    );
    expect(exampleLineOf({ example: 'unchanged' }, 'de')).toBe(
      'Dies ist noch das Beispiel. Prüfen Sie, ob Name, Dokumente und Regeln zu Ihrem Dienst passen.'
    );
    expect(exampleLineOf({ example: 'changed' }, 'en')).toBeNull();
    expect(exampleLineOf({ example: null }, 'en')).toBeNull();
  });
});

describe('isStatusAction and doneShowsUrls', () => {
  it('tells the actions on a published connection', () => {
    expect(isStatusAction('deactivate')).toBe(true);
    expect(isStatusAction('reactivate')).toBe(true);
    expect(isStatusAction('delete')).toBe(true);
    expect(isStatusAction('set_start_date')).toBe(true);
    expect(isStatusAction('publish')).toBe(false);
    expect(isStatusAction('delete_draft')).toBe(false);
  });

  it('shows the URLs after publishing and reactivating only', () => {
    expect(doneShowsUrls('publish')).toBe(true);
    expect(doneShowsUrls('reactivate')).toBe(true);
    expect(doneShowsUrls('deactivate')).toBe(false);
    expect(doneShowsUrls('delete')).toBe(false);
    expect(doneShowsUrls('delete_draft')).toBe(false);
    expect(doneShowsUrls('set_start_date')).toBe(false);
  });
});

describe('finalOutcomeOf', () => {
  it('pairs a final status with its sentence', () => {
    expect(finalOutcomeOf({ ...REQUEST, status: 'replaced' }, null, 'en')).toEqual({
      status: 'replaced',
      text: 'The agent made a newer request for this action.',
    });
    expect(finalOutcomeOf(REQUEST, null, 'en')).toBeNull();
  });
});

describe('outcomeOfError', () => {
  it('takes the state and the sentence from a 409 approval_<status>', () => {
    const error = new ApiError(409, {
      error: 'approval_expired',
      message: 'This request expired at 14:32. Nothing has changed. The agent can ask again.',
    });
    expect(outcomeOfError(error)).toEqual({
      status: 'expired',
      text: 'This request expired at 14:32. Nothing has changed. The agent can ask again.',
    });
    expect(
      outcomeOfError(new ApiError(409, { error: 'approval_cancelled', message: 'Cancelled.' }))
    ).toEqual({ status: 'cancelled', text: 'Cancelled.' });
  });

  it('keeps the server’s sentence for a status action cancelled in the meantime', () => {
    const changed = 'The connection was reactivated in the meantime.';
    expect(
      outcomeOfError(new ApiError(409, { error: 'approval_cancelled', message: changed }))
    ).toEqual({ status: 'cancelled', text: changed });
    const deleted = 'The connection has been deleted in the meantime.';
    expect(
      outcomeOfError(new ApiError(409, { error: 'approval_cancelled', message: deleted }))
    ).toEqual({ status: 'cancelled', text: deleted });
  });

  it('ignores every other failure', () => {
    expect(outcomeOfError(new ApiError(409, { error: 'approval_waiting', message: 'x' }))).toBe(
      null
    );
    expect(outcomeOfError(new ApiError(409, { error: 'not_allowed', message: 'x' }))).toBeNull();
    expect(
      outcomeOfError(new ApiError(502, { error: 'approval_done', message: 'x', error_id: 'e' }))
    ).toBeNull();
    expect(outcomeOfError(new TypeError('Failed to fetch'))).toBeNull();
  });
});

describe('loadFailureActionOf', () => {
  it('tells another team member’s request from a missing one', () => {
    expect(
      loadFailureActionOf(
        new ApiError(403, {
          error: 'not_yours',
          message: 'This request was made for another team member.',
        }),
        'en'
      )
    ).toEqual({ type: 'notYours' });
    expect(
      loadFailureActionOf(new ApiError(404, { error: 'Not found', message: 'Not found' }), 'en')
    ).toEqual({ type: 'notFound' });
  });

  it('keeps the message and the error ID of any other failure', () => {
    expect(
      loadFailureActionOf(
        new ApiError(500, { error: 'Internal', message: 'Something went wrong', error_id: 'e7' }),
        'en'
      )
    ).toEqual({ type: 'loadFailed', notice: { message: 'Something went wrong', error_id: 'e7' } });
    expect(loadFailureActionOf(new TypeError('Failed to fetch'), 'en')).toEqual({
      type: 'loadFailed',
      notice: { message: APPROVAL_COPY.en.loadFailed },
    });
  });
});

describe('urlsLinksOf', () => {
  it('shows Standard’s pull URL unlabelled when it is the only variant', () => {
    expect(
      urlsLinksOf({
        trigger_url: 'https://portal.example/api/connect/fc-1',
        variants: [{ id: 'b-main', name: 'Standard', pull_url: 'https://p/x/{reference}' }],
      })
    ).toEqual({
      trigger: [{ key: 'trigger', url: 'https://portal.example/api/connect/fc-1', branch: null }],
      result: [{ key: 'result', url: 'https://p/x/{reference}', branch: null }],
    });
  });

  it('labels every variant’s pull URL with its name', () => {
    const links = urlsLinksOf({
      trigger_url: 'https://t',
      variants: [
        { id: 'b-main', name: 'Standard', pull_url: 'https://p/standard' },
        { id: 'b-2', name: 'Ambulance', pull_url: 'https://p/ambulance' },
      ],
    });
    expect(links.result).toEqual([
      {
        key: 'b-main',
        url: 'https://p/standard',
        branch: { name: 'Standard', description: null },
      },
      {
        key: 'b-2',
        url: 'https://p/ambulance',
        branch: { name: 'Ambulance', description: null },
      },
    ]);
  });
});

describe('requestedDocumentsOf and checkedBranchesOf', () => {
  it('reads the draft as the editor holds it', () => {
    expect(requestedDocumentsOf(DRAFT.documents)).toEqual([
      { document_type: 'pid', fields: ['given_name', 'birth_date'] },
    ]);
    expect(checkedBranchesOf(DRAFT).map((branch) => [branch.key, branch.name])).toEqual([
      ['b-main', 'Standard'],
      ['b-2', 'Ambulance'],
    ]);
  });
});

describe('failureOfPreview', () => {
  it('shows a failed approve with the error ID the request keeps', () => {
    expect(failureOfPreview(previewOf({ outcome: 'failed', error_id: 'e9' }), 'en')).toEqual({
      call: 'approve',
      notice: { message: APPROVAL_COPY.en.failedBefore, error_id: 'e9' },
      readAgain: true,
    });
    expect(failureOfPreview(previewOf(), 'en')).toBeNull();
  });
});

describe('approvalReducer', () => {
  it('loads the request, with "Try again" after a failed approve', () => {
    const state = loaded(
      approvalReducer(INITIAL_APPROVAL_STATE, {
        type: 'loaded',
        preview: previewOf({ outcome: 'failed', error_id: 'e9' }),
      })
    );
    expect(state.retry).toBe(true);
    expect(state.failure?.notice.error_id).toBe('e9');
  });

  it('ends a load without the request', () => {
    expect(approvalReducer(INITIAL_APPROVAL_STATE, { type: 'notYours' })).toEqual({
      status: 'notYours',
    });
    expect(approvalReducer(INITIAL_APPROVAL_STATE, { type: 'notFound' })).toEqual({
      status: 'notFound',
    });
  });

  it('runs one call at a time and takes the old failure away, keeping "Try again"', () => {
    const failed = approvalReducer(INITIAL_APPROVAL_STATE, {
      type: 'loaded',
      preview: previewOf({ outcome: 'failed', error_id: 'e9' }),
    });
    const running = loaded(approvalReducer(failed, { type: 'started', call: 'approve' }));
    expect(running.running).toBe('approve');
    expect(running.failure).toBeNull();
    expect(running.retry).toBe(true);
    expect(approvalReducer(running, { type: 'started', call: 'decline' })).toBe(running);
  });

  it('offers "Try again" after a failed approve, not after a failed decline', () => {
    const waiting = approvalReducer(INITIAL_APPROVAL_STATE, {
      type: 'loaded',
      preview: previewOf(),
    });
    const notice = { message: 'The wallet service isn’t reachable.', error_id: 'e1' };
    const declineFailed = loaded(
      approvalReducer(approvalReducer(waiting, { type: 'started', call: 'decline' }), {
        type: 'callFailed',
        failure: { call: 'decline', notice },
      })
    );
    expect(declineFailed.running).toBeNull();
    expect(declineFailed.retry).toBe(false);
    const approveFailed = loaded(
      approvalReducer(approvalReducer(waiting, { type: 'started', call: 'approve' }), {
        type: 'callFailed',
        failure: { call: 'approve', notice },
      })
    );
    expect(approveFailed.retry).toBe(true);
    expect(approveFailed.failure).toEqual({ call: 'approve', notice });
  });

  it('switches to the outcome a 409 answered, and takes the answer of a call', () => {
    const waiting = approvalReducer(INITIAL_APPROVAL_STATE, {
      type: 'loaded',
      preview: previewOf(),
    });
    const outcome = { status: 'expired' as const, text: 'Expired.' };
    const conflicted = loaded(
      approvalReducer(approvalReducer(waiting, { type: 'started', call: 'approve' }), {
        type: 'conflicted',
        outcome,
      })
    );
    expect(conflicted.conflict).toEqual(outcome);
    expect(conflicted.running).toBeNull();
    expect(approvalReducer(conflicted, { type: 'started', call: 'approve' })).toBe(conflicted);

    const done = loaded(
      approvalReducer(waiting, {
        type: 'succeeded',
        preview: { ...previewOf({ status: 'done', outcome: 'done' }), draft: null },
      })
    );
    expect(done.preview.request.status).toBe('done');
    expect(done.running).toBeNull();
  });
});

describe('outcomeViewOf', () => {
  const waiting = loaded(
    approvalReducer(INITIAL_APPROVAL_STATE, { type: 'loaded', preview: previewOf() })
  );

  it('shows nothing while the request simply waits', () => {
    expect(outcomeViewOf(waiting, 'en')).toBeNull();
  });

  it('shows the final state, the one a 409 answered first', () => {
    expect(
      outcomeViewOf(
        { ...waiting, preview: previewOf({ status: 'declined', outcome: 'declined' }) },
        'en'
      )
    ).toEqual({
      kind: 'final',
      outcome: { status: 'declined', text: 'You declined this request. Nothing has changed.' },
    });
    const conflict = { status: 'replaced' as const, text: 'Replaced.' };
    expect(outcomeViewOf({ ...waiting, conflict }, 'en')).toEqual({
      kind: 'final',
      outcome: conflict,
    });
  });

  it('words a changed connection from the preview’s connection', () => {
    const preview = {
      ...previewOf({
        action: 'deactivate',
        status: 'cancelled',
        outcome: 'cancelled',
        cancel_reason: 'connection_changed',
      }),
      draft: null,
      connection: connectionOf(false),
    };
    expect(outcomeViewOf({ ...waiting, preview }, 'en')).toEqual({
      kind: 'final',
      outcome: { status: 'cancelled', text: 'The connection was deactivated in the meantime.' },
    });
  });

  it('titles a failed call by what failed', () => {
    const notice = { message: 'Nothing has changed.', error_id: 'e2' };
    expect(outcomeViewOf({ ...waiting, failure: { call: 'approve', notice } }, 'en')).toEqual({
      kind: 'failed',
      title: 'Couldn’t publish',
      notice,
    });
    expect(outcomeViewOf({ ...waiting, failure: { call: 'decline', notice } }, 'en')).toEqual({
      kind: 'failed',
      title: 'Couldn’t decline',
      notice,
    });
  });
});

describe('busyTextOf and callFailureOf', () => {
  it('says what runs', () => {
    expect(busyTextOf('publish', null, 'en')).toBe('');
    expect(busyTextOf('publish', 'approve', 'en')).toBe('Publishing…');
    expect(busyTextOf('publish', 'decline', 'en')).toBe('Working…');
    expect(busyTextOf('delete_draft', 'approve', 'en')).toBe('Working…');
    expect(busyTextOf('deactivate', 'approve', 'en')).toBe('Working…');
    expect(busyTextOf('reactivate', 'approve', 'en')).toBe('Working…');
    expect(busyTextOf('delete', 'approve', 'en')).toBe('Working…');
  });

  it('keeps a 5xx answer’s message and error ID, and words any other failure', () => {
    expect(
      callFailureOf(
        'approve',
        new ApiError(503, { error: 'unavailable', message: 'Try later.', error_id: 'e3' }),
        'en'
      )
    ).toEqual({ call: 'approve', notice: { message: 'Try later.', error_id: 'e3' } });
    expect(callFailureOf('decline', new TypeError('Failed to fetch'), 'en')).toEqual({
      call: 'decline',
      notice: { message: APPROVAL_COPY.en.callFailed },
    });
  });
});

// Spec 009: the page's own sentences in German, from the glossary (G§2 "approval request"); the
// outcome sentences word for word as the server's (`services/approvals.py`, T018)
describe('in German', () => {
  const TIME_DE = SAVED_TIME_FORMATS.de.format(new Date(EXPIRES_AT));

  it('titles the request by action, the name in German quotes', () => {
    expect(titleOf('publish', 'Parking permit', 'de')).toBe('„Parking permit“ veröffentlichen?');
    expect(titleOf('delete_draft', 'Parking permit', 'de')).toBe(
      'Entwurf „Parking permit“ löschen?'
    );
    expect(titleOf('deactivate', 'Parking permit', 'de')).toBe('„Parking permit“ deaktivieren?');
    expect(titleOf('reactivate', 'Parking permit', 'de')).toBe('„Parking permit“ reaktivieren?');
    expect(titleOf('delete', 'Parking permit', 'de')).toBe('„Parking permit“ löschen?');
    expect(titleOf('publish', '', 'de')).toBe('Entwurf veröffentlichen?');
    expect(titleOf('delete_draft', ' ', 'de')).toBe('Entwurf löschen?');
    expect(titleOf('delete', '', 'de')).toBe('Anbindung löschen?');
    expect(titleOf('set_start_date', 'Parking permit', 'de')).toBe(
      'Startdatum von „Parking permit“ ändern?'
    );
    expect(titleOf('set_start_date', '', 'de')).toBe('Startdatum ändern?');
  });

  it('names the agent as it registered and the expiry time', () => {
    expect(TIME_DE).toBe(TIME);
    expect(subtitleOf(REQUEST, 'de')).toBe(
      `Angefordert von Claude Code · läuft um ${TIME_DE} Uhr ab`
    );
    const updatedAt = DRAFT.updated_at;
    expect(lastSavedLineOf(updatedAt, 'de')).toBe(
      `Zuletzt gespeichert am ${formatRowDate(updatedAt)}, ${SAVED_TIME_FORMATS.de.format(new Date(updatedAt))}`
    );
  });

  it('words the outcomes as the server does', () => {
    const done = (action: ApprovalRequest['action']) =>
      outcomeTextOf({ ...REQUEST, action, status: 'done', outcome: 'done' }, null, 'de');
    expect(done('publish')).toBe('Veröffentlicht.');
    expect(done('delete_draft')).toBe('Entwurf gelöscht.');
    expect(done('deactivate')).toBe('Anbindung deaktiviert.');
    expect(done('reactivate')).toBe('Anbindung reaktiviert.');
    expect(done('delete')).toBe('Anbindung gelöscht.');
    expect(outcomeTextOf({ ...REQUEST, status: 'declined' }, null, 'de')).toBe(
      'Sie haben diese Anfrage abgelehnt. Es wurde nichts geändert.'
    );
    expect(outcomeTextOf({ ...REQUEST, status: 'expired' }, null, 'de')).toBe(
      `Diese Anfrage ist um ${TIME_DE} Uhr abgelaufen. Es wurde nichts geändert. Der Agent kann erneut fragen.`
    );
    expect(outcomeTextOf({ ...REQUEST, status: 'replaced' }, null, 'de')).toBe(
      'Der Agent hat für diese Aktion eine neuere Anfrage gestellt.'
    );
  });

  it('words a cancellation by its reason', () => {
    const reasonOf = (cancel_reason: string, action: ApprovalRequest['action'] = 'deactivate') => ({
      cancel_reason,
      action,
    });
    expect(cancelledTextOf(reasonOf('draft_changed', 'publish'), null, 'de')).toBe(
      'Der Entwurf wurde geändert, seit der Agent gefragt hat. Es wurde nichts geändert; der Agent muss erneut fragen.'
    );
    expect(cancelledTextOf(reasonOf('revoked'), null, 'de')).toBe(
      'Der Zugriff des Agenten wurde widerrufen, daher wurde diese Anfrage abgebrochen.'
    );
    expect(cancelledTextOf(reasonOf('connection_changed'), connectionOf(false), 'de')).toBe(
      'Die Anbindung wurde in der Zwischenzeit deaktiviert.'
    );
    expect(
      cancelledTextOf(reasonOf('connection_changed', 'reactivate'), connectionOf(true), 'de')
    ).toBe('Die Anbindung wurde in der Zwischenzeit reaktiviert.');
    expect(cancelledTextOf(reasonOf('connection_changed'), null, 'de')).toBe(
      'Diese Anfrage wurde abgebrochen.'
    );
    expect(cancelledTextOf(reasonOf('unknown'), null, 'de')).toBe(
      'Diese Anfrage wurde abgebrochen.'
    );
  });

  it('words a failed attempt read again in the language of the moment', () => {
    const state = loaded(
      approvalReducer(INITIAL_APPROVAL_STATE, {
        type: 'loaded',
        preview: previewOf({ outcome: 'failed', error_id: 'e9' }),
      })
    );
    expect(outcomeViewOf(state, 'de')).toEqual({
      kind: 'failed',
      title: 'Der Entwurf konnte nicht veröffentlicht werden',
      notice: {
        message: 'Der letzte Versuch hat nicht funktioniert. Es wurde nichts geändert.',
        error_id: 'e9',
      },
    });
    expect(outcomeViewOf(state, 'en')).toEqual({
      kind: 'failed',
      title: 'Couldn’t publish',
      notice: { message: 'The last attempt didn’t work. Nothing has changed.', error_id: 'e9' },
    });
  });

  it('keeps the server’s message of a failed call, and titles it in the language', () => {
    const notice = { message: 'Der Wallet-Dienst ist nicht erreichbar.', error_id: 'e1' };
    const waiting = loaded(
      approvalReducer(INITIAL_APPROVAL_STATE, {
        type: 'loaded',
        preview: previewOf({ action: 'deactivate' }),
      })
    );
    expect(outcomeViewOf({ ...waiting, failure: { call: 'approve', notice } }, 'de')).toEqual({
      kind: 'failed',
      title: 'Die Anfrage konnte nicht freigegeben werden',
      notice,
    });
    expect(outcomeViewOf({ ...waiting, failure: { call: 'decline', notice } }, 'de')).toEqual({
      kind: 'failed',
      title: 'Die Anfrage konnte nicht abgelehnt werden',
      notice,
    });
    const conflict = { status: 'expired' as const, text: 'This request expired at 14:32.' };
    expect(outcomeViewOf({ ...waiting, conflict }, 'de')).toEqual({
      kind: 'final',
      outcome: conflict,
    });
  });

  it('says what runs, and words a failure without an answer', () => {
    expect(busyTextOf('publish', 'approve', 'de')).toBe('Wird veröffentlicht …');
    expect(busyTextOf('delete', 'approve', 'de')).toBe('Wird ausgeführt …');
    expect(busyTextOf('publish', null, 'de')).toBe('');
    expect(callFailureOf('approve', new TypeError('Failed to fetch'), 'de')).toEqual({
      call: 'approve',
      notice: {
        message:
          'Es wurde nichts geändert. Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
      },
    });
    expect(loadFailureActionOf(new TypeError('Failed to fetch'), 'de')).toEqual({
      type: 'loadFailed',
      notice: { message: 'Prüfen Sie Ihre Internetverbindung und laden Sie die Seite neu.' },
    });
  });
});

describe('documentsInLanguageOf', () => {
  const CATALOG_DE: DocumentType[] = [
    {
      key: 'pid',
      label: 'Personalausweis',
      fields: [
        { ...TEXT_FIELD, key: 'given_name', label: 'Vorname' },
        { ...TEXT_FIELD, key: 'birth_date', label: 'Geburtsdatum', kind: 'date' },
      ],
    },
  ];

  it('labels the documents and their data items from the catalog, keys and order kept', () => {
    expect(documentsInLanguageOf(DRAFT.documents, CATALOG_DE)).toEqual([
      {
        document_type: 'pid',
        label: 'Personalausweis',
        fields: [
          { ...TEXT_FIELD, key: 'given_name', label: 'Vorname' },
          { ...TEXT_FIELD, key: 'birth_date', label: 'Geburtsdatum', kind: 'date' },
        ],
      },
    ]);
  });

  it('keeps what the catalog doesn’t know, and everything while it isn’t there', () => {
    const unknown = { document_type: 'old', label: 'old', fields: [] };
    const gone = { ...TEXT_FIELD, key: 'gone', label: 'gone', kind: 'image' as const };
    const documents = [unknown, { ...DRAFT.documents[0], fields: [gone] }];
    expect(documentsInLanguageOf(documents, CATALOG_DE)).toEqual([
      unknown,
      { document_type: 'pid', label: 'Personalausweis', fields: [gone] },
    ]);
    expect(documentsInLanguageOf(DRAFT.documents, [])).toEqual(DRAFT.documents);
  });
});
