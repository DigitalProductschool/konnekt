import type { ErrorNotice } from '@connection-portal/api-types/api';
import type {
  ApprovalAction,
  ApprovalPreview,
  ApprovalStatus,
} from '@connection-portal/api-types/approvals';
import type {
  ConnectionUrls,
  FormConnectionDraft,
} from '@connection-portal/api-types/form-connections';

import type { LinkCardLink } from '../FormConnectionDetail/types';

/** The calls the page makes on the request */
export type ApprovalCall = 'approve' | 'decline';

/** The statuses a request ends in */
export type FinalStatus = Exclude<ApprovalStatus, 'waiting'>;

/** A final state, shown in place of the actions, with its sentence */
export interface FinalOutcome {
  status: FinalStatus;
  text: string;
}

/** A call that failed and left the request waiting: a failed approve offers "Try again" */
export interface CallFailure {
  call: ApprovalCall;
  notice: ErrorNotice;
}

export interface LoadedApprovalState {
  status: 'loaded';
  preview: ApprovalPreview;
  /** The call that runs */
  running: ApprovalCall | null;
  /** Why the last call failed, or the failed approve the request was read with */
  failure: CallFailure | null;
  /** An approve failed before: "Try again" in place of "Approve", also while it runs again */
  retry: boolean;
  /** The final state a `409 approval_<status>` answered, which the preview doesn't know yet */
  conflict: FinalOutcome | null;
}

export type ApprovalPageState =
  | { status: 'loading' }
  | { status: 'notFound' }
  | { status: 'notYours' }
  | { status: 'failed'; notice: ErrorNotice }
  | LoadedApprovalState;

export type ApprovalPageAction =
  | { type: 'loaded'; preview: ApprovalPreview }
  | { type: 'notFound' }
  | { type: 'notYours' }
  | { type: 'loadFailed'; notice: ErrorNotice }
  | { type: 'started'; call: ApprovalCall }
  | { type: 'succeeded'; preview: ApprovalPreview }
  | { type: 'conflicted'; outcome: FinalOutcome }
  | { type: 'callFailed'; failure: CallFailure };

/** The link cards' URLs: the trigger URL, and each variant's pull URL */
export interface UrlsLinks {
  trigger: LinkCardLink[];
  result: LinkCardLink[];
}

export interface ApprovalScreenProps {
  /** The request's id, from the route */
  id: string;
}

export interface ApprovalSummaryProps {
  action: ApprovalAction;
  /** The draft while it exists */
  draft: FormConnectionDraft | null;
}

export interface PublishSummaryProps {
  draft: FormConnectionDraft;
}

export interface DescriptionLineProps {
  description: string;
}

export interface ApprovalFindingsProps {
  draft: FormConnectionDraft;
}

export interface ApprovalActionsProps {
  action: ApprovalAction;
  running: ApprovalCall | null;
  /** After a failed approve: "Try again" in place of "Approve" */
  retry: boolean;
  onApprove: () => void;
  onDecline: () => void;
}

/** What the outcome alert shows: a final state, or a failed call with the body kept */
export type OutcomeView =
  { kind: 'final'; outcome: FinalOutcome } | { kind: 'failed'; title: string; notice: ErrorNotice };

export interface ApprovalOutcomeProps {
  view: OutcomeView;
  /** After publishing: the connection URLs, and the connection to open */
  urls?: ConnectionUrls | null;
  formConnectionId?: string;
}

export interface ApprovalUrlsProps {
  urls: ConnectionUrls;
  formConnectionId: string;
}
