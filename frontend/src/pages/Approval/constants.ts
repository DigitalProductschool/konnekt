import type { ApprovalAction } from '@connection-portal/api-types/approvals';

import type { ApprovalPageState, FinalStatus } from './types';

// The approval page's copy (specs/007-agent-mcp-server/contracts/ui-screens.md S3)
export const APPROVAL_COPY = {
  /** The heading and tab title while the request isn't there */
  fallbackTitle: 'Approval request',
  subtitle: (requestedBy: string, time: string) =>
    `Requested by ${requestedBy} · expires at ${time}`,
  notYours: 'This request was made for another team member. Only they can approve it.',
  loadFailedTitle: 'Couldn’t load this request',
  loadFailed: 'Check your connection and reload the page.',

  // The body (S3 "Body")
  lastSaved: (date: string) => `Last saved ${date}`,
  goneForGood: 'Its content will be gone for good.',
  checksTitle: 'Rule checks',
  checking: 'Checking the rules…',
  noFindings: 'No findings.',
  checksFailed: 'The rules couldn’t be checked.',

  // The actions (S3 "Actions")
  approve: 'Approve',
  decline: 'Decline',
  retry: 'Try again',
  publishing: 'Publishing…',
  working: 'Working…',

  // A call that failed and left the request waiting (S3 "failed")
  approveFailedTitle: (action: ApprovalAction) =>
    action === 'publish'
      ? 'Couldn’t publish'
      : action === 'delete_draft'
        ? 'Couldn’t delete the draft'
        : 'Couldn’t approve',
  declineFailedTitle: 'Couldn’t decline',
  /** A failed attempt read again, whose message the request doesn't keep */
  failedBefore: 'The last attempt didn’t work. Nothing has changed.',
  callFailed: 'Nothing has changed. Check your connection and try again.',

  // The outcome states (S3 "Outcome states")
  openConnection: 'Open the connection',
  declined: 'You declined this request. Nothing has changed.',
  expired: (time: string) =>
    `This request expired at ${time}. Nothing has changed. The agent can ask again.`,
  replaced: 'The agent made a newer request for this action.',
  cancelled: 'This request was cancelled.',
};

/** The title by action, with the connection's name or, once a deleted draft's row is gone, without */
export const TITLES: Record<ApprovalAction, { named: (name: string) => string; unnamed: string }> =
  {
    publish: { named: (name) => `Publish ‘${name}’?`, unnamed: 'Publish the draft?' },
    delete_draft: { named: (name) => `Delete the draft ‘${name}’?`, unnamed: 'Delete the draft?' },
    deactivate: { named: (name) => `Deactivate ‘${name}’?`, unnamed: 'Deactivate the connection?' },
    reactivate: { named: (name) => `Reactivate ‘${name}’?`, unnamed: 'Reactivate the connection?' },
    delete: { named: (name) => `Delete ‘${name}’?`, unnamed: 'Delete the connection?' },
  };

/** `done`: the success alert by action, as the approve answer's message words it */
export const DONE_TEXTS: Record<ApprovalAction, string> = {
  publish: 'Published.',
  delete_draft: 'Draft deleted.',
  deactivate: 'Connection deactivated.',
  reactivate: 'Connection reactivated.',
  delete: 'Connection deleted.',
};

/** `cancelled`, by `cancel_reason`; the reasons of the other actions come with them (T082) */
export const CANCELLED_TEXTS: Record<string, string> = {
  draft_changed:
    'The draft has changed since the agent asked. Nothing has changed; the agent has to ask again.',
  draft_published: 'The draft has been published since the agent asked.',
  draft_deleted: 'The draft has been deleted since the agent asked.',
  access_changed: 'The agent’s access has changed, so this request was cancelled.',
  revoked: 'The agent’s access was revoked, so this request was cancelled.',
  access_ended: 'The agent’s access has ended, so this request was cancelled.',
};

/** The statuses a request ends in, which a `409 approval_<status>` names */
export const FINAL_STATUSES: readonly FinalStatus[] = [
  'done',
  'declined',
  'expired',
  'replaced',
  'cancelled',
];

/** The outcome alert's style: success when done, info when declined, warning otherwise */
export const OUTCOME_VARIANTS: Record<FinalStatus, 'success' | 'info' | 'warning'> = {
  done: 'success',
  declined: 'info',
  expired: 'warning',
  replaced: 'warning',
  cancelled: 'warning',
};

export const INITIAL_APPROVAL_STATE: ApprovalPageState = { status: 'loading' };
