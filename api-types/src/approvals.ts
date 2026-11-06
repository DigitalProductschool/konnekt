// Mirrors the approval request schemas in backend/app/schemas.py
// (specs/007-agent-mcp-server/contracts/management-api.md "Schemas")
import type { ConnectionUrls, FormConnection, FormConnectionDraft } from './form-connections';

/** Mirrors ApprovalAction */
export type ApprovalAction = 'publish' | 'delete_draft' | 'deactivate' | 'reactivate' | 'delete';

/** Mirrors ApprovalStatus */
export type ApprovalStatus = 'waiting' | 'done' | 'declined' | 'expired' | 'replaced' | 'cancelled';

/** The status, or 'failed' while waiting after an approve attempt failed (FR-027) */
export type ApprovalOutcome = ApprovalStatus | 'failed';

/** An agent's request that a team member approve an action */
export interface ApprovalCreate {
  form_connection_id: string;
  action: ApprovalAction;
}

/** An approval request, with its status as the row reads now (FR-024) */
export interface ApprovalRequest {
  id: string;
  action: ApprovalAction;
  form_connection_id: string;
  connection_name: string;
  /** The agent's name when it asked, kept after its access is gone */
  requested_by: string;
  status: ApprovalStatus;
  outcome: ApprovalOutcome;
  /**
   * revoked, access_changed, access_ended, draft_changed, draft_published, draft_deleted,
   * connection_changed or connection_deleted
   */
  cancel_reason: string | null;
  /** The approval page's link */
  link: string;
  expires_at: string;
  created_at: string;
  decided_at: string | null;
  failed_at: string | null;
  error_id: string | null;
  /** Whether the request is the signed-in account's */
  mine: boolean;
}

/** An approval request with what it acts on, for the approval page */
export interface ApprovalPreview {
  request: ApprovalRequest;
  /** publish and delete_draft, while the draft exists */
  draft: FormConnectionDraft | null;
  /** The other actions, while the connection exists */
  connection: FormConnection | null;
  /** After a done publish or reactivate, and for the status actions */
  urls: ConnectionUrls | null;
}
