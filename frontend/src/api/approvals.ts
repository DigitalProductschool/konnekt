import type { ApprovalPreview } from '@connection-portal/api-types/approvals';

import { apiFetch } from './client';

// The approval page's endpoints (specs/007-agent-mcp-server/contracts/management-api.md
// "Approval requests"). Another account's request answers `403 not_yours`, an unknown one `404`

/** The request, with its status as it reads now, and what it acts on */
export function getApprovalRequest(id: string): Promise<ApprovalPreview> {
  return apiFetch<ApprovalPreview>(`/approval-requests/${encodeURIComponent(id)}`);
}

/**
 * Runs the requested action. A request that isn't waiting any more answers `409
 * approval_<status>` with the page's reason; an EUDIPLO failure answers `502` or `503` with an
 * error ID, and the request stays waiting
 */
export function approveRequest(id: string): Promise<ApprovalPreview> {
  return apiFetch<ApprovalPreview>(`/approval-requests/${encodeURIComponent(id)}/approve`, {
    method: 'POST',
  });
}

/** Declines the request; nothing changes. The same `409 approval_<status>` as approving */
export function declineRequest(id: string): Promise<ApprovalPreview> {
  return apiFetch<ApprovalPreview>(`/approval-requests/${encodeURIComponent(id)}/decline`, {
    method: 'POST',
  });
}
