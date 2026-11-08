import type { ApprovalPreview, ApprovalRequest } from '@connection-portal/api-types/approvals';
import type { DocumentField } from '@connection-portal/api-types/document-types';
import type {
  FormConnection,
  FormConnectionDraft,
} from '@connection-portal/api-types/form-connections';
import { describe, expect, it } from 'vitest';

import { ApiError } from '../../api/client';
import { SAVED_TIME_FORMAT } from '../FormConnectionDetail/constants';
import { formatEditedDate } from '../FormConnectionList/utils';
import { APPROVAL_COPY, INITIAL_APPROVAL_STATE } from './constants';
import type { ApprovalPageState, LoadedApprovalState } from './types';
import {
  approvalReducer,
  busyTextOf,
  callFailureOf,
  cancelledTextOf,
  checkedBranchesOf,
  doneShowsUrls,
  failureOfPreview,
  finalOutcomeOf,
  isStatusAction,
  lastSavedLineOf,
  loadFailureActionOf,
  outcomeOfError,
  outcomeTextOf,
  outcomeViewOf,
  requestedDocumentsOf,
  subtitleOf,
  titleOf,
  urlsLinksOf,
} from './utils';

const EXPIRES_AT = '2026-11-06T13:32:00Z';
const TIME = SAVED_TIME_FORMAT.format(new Date(EXPIRES_AT));

const REQUEST: ApprovalRequest = {
  id: 'req-1',
  action: 'publish',
  form_connection_id: 'fc-1',
  connection_name: 'Parking permit',
  requested_by: 'Claude Code',
  status: 'waiting',
  outcome: 'waiting',
  cancel_reason: null,
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
    expect(titleOf('publish', 'Parking permit')).toBe('Publish ‘Parking permit’?');
    expect(titleOf('delete_draft', 'Parking permit')).toBe('Delete the draft ‘Parking permit’?');
  });

  it('names the connection for the actions on a published one', () => {
    expect(titleOf('deactivate', 'Parking permit')).toBe('Deactivate ‘Parking permit’?');
    expect(titleOf('reactivate', 'Parking permit')).toBe('Reactivate ‘Parking permit’?');
    expect(titleOf('delete', 'Parking permit')).toBe('Delete ‘Parking permit’?');
    expect(titleOf('deactivate', '')).toBe('Deactivate the connection?');
    expect(titleOf('reactivate', '')).toBe('Reactivate the connection?');
    expect(titleOf('delete', '')).toBe('Delete the connection?');
  });

  it('leaves the name out once a deleted draft’s row is gone', () => {
    expect(titleOf('publish', '')).toBe('Publish the draft?');
    expect(titleOf('delete_draft', '')).toBe('Delete the draft?');
    expect(titleOf('delete_draft', '  ')).toBe('Delete the draft?');
  });
});

describe('subtitleOf', () => {
  it('names the agent and the expiry time', () => {
    expect(subtitleOf(REQUEST)).toBe(`Requested by Claude Code · expires at ${TIME}`);
  });
});

describe('lastSavedLineOf', () => {
  it('writes the date and the time as the draft card does', () => {
    const updatedAt = DRAFT.updated_at;
    expect(lastSavedLineOf(updatedAt)).toBe(
      `Last saved ${formatEditedDate(updatedAt)}, ${SAVED_TIME_FORMAT.format(new Date(updatedAt))}`
    );
  });
});

describe('outcomeTextOf', () => {
  it('has no sentence while the request waits, failed or not', () => {
    expect(outcomeTextOf(REQUEST)).toBeNull();
    expect(outcomeTextOf({ ...REQUEST, outcome: 'failed', error_id: 'e1' })).toBeNull();
  });

  it('words a done request by its action', () => {
    expect(outcomeTextOf({ ...REQUEST, status: 'done', outcome: 'done' })).toBe('Published.');
    expect(
      outcomeTextOf({ ...REQUEST, action: 'delete_draft', status: 'done', outcome: 'done' })
    ).toBe('Draft deleted.');
    const done = (action: ApprovalRequest['action']) =>
      outcomeTextOf({ ...REQUEST, action, status: 'done', outcome: 'done' });
    expect(done('deactivate')).toBe('Connection deactivated.');
    expect(done('reactivate')).toBe('Connection reactivated.');
    expect(done('delete')).toBe('Connection deleted.');
  });

  it('words declined, expired and replaced', () => {
    expect(outcomeTextOf({ ...REQUEST, status: 'declined' })).toBe(
      'You declined this request. Nothing has changed.'
    );
    expect(outcomeTextOf({ ...REQUEST, status: 'expired' })).toBe(
      `This request expired at ${TIME}. Nothing has changed. The agent can ask again.`
    );
    expect(outcomeTextOf({ ...REQUEST, status: 'replaced' })).toBe(
      'The agent made a newer request for this action.'
    );
  });

  it('words a cancellation by its reason', () => {
    const cancelled = (reason: string | null) =>
      outcomeTextOf({ ...REQUEST, status: 'cancelled', cancel_reason: reason });
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
      outcomeTextOf({ ...changed, cancel_reason: 'connection_changed' }, connectionOf(false))
    ).toBe('The connection was deactivated in the meantime.');
    expect(
      outcomeTextOf(
        { ...changed, action: 'reactivate', cancel_reason: 'connection_changed' },
        connectionOf(true)
      )
    ).toBe('The connection was reactivated in the meantime.');
  });
});

describe('cancelledTextOf', () => {
  it('falls back to the general sentence without the connection', () => {
    expect(cancelledTextOf('connection_changed', null)).toBe('This request was cancelled.');
    expect(cancelledTextOf('connection_deleted', null)).toBe(
      'The connection has been deleted in the meantime.'
    );
  });
});

describe('isStatusAction and doneShowsUrls', () => {
  it('tells the actions on a published connection', () => {
    expect(isStatusAction('deactivate')).toBe(true);
    expect(isStatusAction('reactivate')).toBe(true);
    expect(isStatusAction('delete')).toBe(true);
    expect(isStatusAction('publish')).toBe(false);
    expect(isStatusAction('delete_draft')).toBe(false);
  });

  it('shows the URLs after publishing and reactivating only', () => {
    expect(doneShowsUrls('publish')).toBe(true);
    expect(doneShowsUrls('reactivate')).toBe(true);
    expect(doneShowsUrls('deactivate')).toBe(false);
    expect(doneShowsUrls('delete')).toBe(false);
    expect(doneShowsUrls('delete_draft')).toBe(false);
  });
});

describe('finalOutcomeOf', () => {
  it('pairs a final status with its sentence', () => {
    expect(finalOutcomeOf({ ...REQUEST, status: 'replaced' })).toEqual({
      status: 'replaced',
      text: 'The agent made a newer request for this action.',
    });
    expect(finalOutcomeOf(REQUEST)).toBeNull();
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
        })
      )
    ).toEqual({ type: 'notYours' });
    expect(
      loadFailureActionOf(new ApiError(404, { error: 'Not found', message: 'Not found' }))
    ).toEqual({ type: 'notFound' });
  });

  it('keeps the message and the error ID of any other failure', () => {
    expect(
      loadFailureActionOf(
        new ApiError(500, { error: 'Internal', message: 'Something went wrong', error_id: 'e7' })
      )
    ).toEqual({ type: 'loadFailed', notice: { message: 'Something went wrong', error_id: 'e7' } });
    expect(loadFailureActionOf(new TypeError('Failed to fetch'))).toEqual({
      type: 'loadFailed',
      notice: { message: APPROVAL_COPY.loadFailed },
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
    expect(failureOfPreview(previewOf({ outcome: 'failed', error_id: 'e9' }))).toEqual({
      call: 'approve',
      notice: { message: APPROVAL_COPY.failedBefore, error_id: 'e9' },
    });
    expect(failureOfPreview(previewOf())).toBeNull();
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
    expect(outcomeViewOf(waiting)).toBeNull();
  });

  it('shows the final state, the one a 409 answered first', () => {
    expect(
      outcomeViewOf({ ...waiting, preview: previewOf({ status: 'declined', outcome: 'declined' }) })
    ).toEqual({
      kind: 'final',
      outcome: { status: 'declined', text: 'You declined this request. Nothing has changed.' },
    });
    const conflict = { status: 'replaced' as const, text: 'Replaced.' };
    expect(outcomeViewOf({ ...waiting, conflict })).toEqual({ kind: 'final', outcome: conflict });
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
    expect(outcomeViewOf({ ...waiting, preview })).toEqual({
      kind: 'final',
      outcome: { status: 'cancelled', text: 'The connection was deactivated in the meantime.' },
    });
  });

  it('titles a failed call by what failed', () => {
    const notice = { message: 'Nothing has changed.', error_id: 'e2' };
    expect(outcomeViewOf({ ...waiting, failure: { call: 'approve', notice } })).toEqual({
      kind: 'failed',
      title: 'Couldn’t publish',
      notice,
    });
    expect(outcomeViewOf({ ...waiting, failure: { call: 'decline', notice } })).toEqual({
      kind: 'failed',
      title: 'Couldn’t decline',
      notice,
    });
  });
});

describe('busyTextOf and callFailureOf', () => {
  it('says what runs', () => {
    expect(busyTextOf('publish', null)).toBe('');
    expect(busyTextOf('publish', 'approve')).toBe('Publishing…');
    expect(busyTextOf('publish', 'decline')).toBe('Working…');
    expect(busyTextOf('delete_draft', 'approve')).toBe('Working…');
    expect(busyTextOf('deactivate', 'approve')).toBe('Working…');
    expect(busyTextOf('reactivate', 'approve')).toBe('Working…');
    expect(busyTextOf('delete', 'approve')).toBe('Working…');
  });

  it('keeps a 5xx answer’s message and error ID, and words any other failure', () => {
    expect(
      callFailureOf(
        'approve',
        new ApiError(503, { error: 'unavailable', message: 'Try later.', error_id: 'e3' })
      )
    ).toEqual({ call: 'approve', notice: { message: 'Try later.', error_id: 'e3' } });
    expect(callFailureOf('decline', new TypeError('Failed to fetch'))).toEqual({
      call: 'decline',
      notice: { message: APPROVAL_COPY.callFailed },
    });
  });
});
