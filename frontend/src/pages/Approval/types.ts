import type { ErrorNotice } from '@connection-portal/api-types/api';
import type {
  ApprovalAction,
  ApprovalPreview,
  ApprovalStatus,
} from '@connection-portal/api-types/approvals';
import type { DocumentType } from '@connection-portal/api-types/document-types';
import type {
  ConnectionUrls,
  FormConnection,
  FormConnectionDraft,
} from '@connection-portal/api-types/form-connections';

import type { DocumentTypesState } from '../../hooks/types';
import type { LinkCardLink } from '../FormConnectionDetail/types';

/** The calls the page makes on the request */
export type ApprovalCall = 'approve' | 'decline';

/** The actions on a published connection, whose body shows its URLs */
export type StatusAction = Exclude<ApprovalAction, 'publish' | 'delete_draft'>;

/** A status action's body: what becomes of the URLs, and the sentences under them */
export interface StatusBody {
  lead: string;
  /** "Requests in progress are cancelled.", or null */
  cancelsRequests: string | null;
  /** "Deleting can’t be undone.", or null */
  final: string | null;
}

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
  /**
   * A failed attempt read again with the request (`failureOfPreview()`): its sentence is the
   * page's own, worded in the language of the moment at render time (spec 009)
   */
  readAgain?: true;
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
  /** The published connection while it exists (the status actions) */
  connection: FormConnection | null;
  /** Its URLs while it exists (the status actions) */
  urls: ConnectionUrls | null;
}

export interface StatusSummaryProps {
  action: StatusAction;
  connection: FormConnection;
  urls: ConnectionUrls | null;
}

export interface PublishSummaryProps {
  draft: FormConnectionDraft;
}

export interface DescriptionLineProps {
  description: string;
}

export interface ApprovalFindingsProps {
  draft: FormConnectionDraft;
  /** The catalog in the website's language, as `PublishSummary` reads it (`useDocumentTypes()`) */
  catalog: { status: DocumentTypesState['status']; documentTypes: DocumentType[] };
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
  /** After publishing or reactivating: the connection URLs, and the connection to open */
  urls?: ConnectionUrls | null;
  formConnectionId?: string;
  /** Whether the connection is deactivated now: its copy buttons are off (FR-046, W21) */
  deactivated?: boolean;
}

export interface ApprovalLinkCardsProps {
  /** The URLs; without them, the card holds only its title and lead */
  urls: ConnectionUrls | null;
  /** The sentence under the title: what becomes of the URLs, or what to do with them */
  lead: string;
  /** While the connection is deactivated: the copy buttons are off and say why (FR-046, W21) */
  deactivated?: boolean;
}

export interface ApprovalUrlsProps {
  urls: ConnectionUrls;
  formConnectionId: string;
  deactivated?: boolean;
}
