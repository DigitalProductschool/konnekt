import type {
  ActivateRequest,
  ActivityPage,
  Deletion,
  DeletionCreate,
  DeletionItem,
  DraftCreate,
  DraftPublish,
  DraftUpdate,
  FormConnection,
  FormConnectionCreate,
  FormConnectionDraft,
  FormConnectionOrDraft,
  FormConnectionSummary,
  FormConnectionUpdate,
  RestoredConnections,
  StartDateUpdate,
} from '@connection-portal/api-types/form-connections';

import { apiFetch } from './client';

export function listFormConnections(): Promise<FormConnectionSummary[]> {
  return apiFetch<FormConnectionSummary[]>('/form-connections');
}

/**
 * Creates a published connection; with `data.start_date` (YYYY-MM-DD) it is scheduled for that day
 * (spec 010, contracts/management-api.md "Scheduling")
 */
export function createFormConnection(data: FormConnectionCreate): Promise<FormConnection> {
  return apiFetch<FormConnection>('/form-connections', { method: 'POST', body: data });
}

/** A published connection or a draft, told apart by `status` */
export function getFormConnection(id: string): Promise<FormConnectionOrDraft> {
  return apiFetch<FormConnectionOrDraft>(`/form-connections/${encodeURIComponent(id)}`);
}

/**
 * A page of a connection's activity, newest first, 50 entries at a time; pass the previous page's
 * `next_cursor` for the next one (spec 010, contracts/management-api.md "Activity")
 */
export function getActivity(id: string, cursor?: string): Promise<ActivityPage> {
  const query = cursor === undefined ? '' : `?${new URLSearchParams({ cursor }).toString()}`;
  return apiFetch<ActivityPage>(`/form-connections/${encodeURIComponent(id)}/activity${query}`);
}

export function updateFormConnection(
  id: string,
  data: FormConnectionUpdate
): Promise<FormConnection> {
  return apiFetch<FormConnection>(`/form-connections/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: data,
  });
}

export function deactivateFormConnection(id: string): Promise<FormConnection> {
  return apiFetch<FormConnection>(`/form-connections/${encodeURIComponent(id)}/deactivate`, {
    method: 'POST',
  });
}

/**
 * Activates a deactivated connection again: at once without `startDate` (or with `null`), or
 * scheduled for that day with it (YYYY-MM-DD). A day that isn't after today in Germany answers
 * `400 invalid_start_date`, a scheduled connection `409 status_changed`; a live one stays as it is
 * (spec 010, contracts/management-api.md "Scheduling")
 */
export function activateFormConnection(
  id: string,
  startDate?: string | null
): Promise<FormConnection> {
  const body: ActivateRequest = startDate === undefined ? {} : { start_date: startDate };
  return apiFetch<FormConnection>(`/form-connections/${encodeURIComponent(id)}/activate`, {
    method: 'POST',
    body,
  });
}

/**
 * Changes a scheduled or live connection's start: `startDate` (YYYY-MM-DD) moves or sets it, `null`
 * makes a scheduled connection active now and leaves a live one as it is; a live connection given a
 * date is scheduled, and its requests in progress are cancelled. A day that isn't after today in
 * Germany answers `400 invalid_start_date`, a deactivated connection `409 status_changed`, a draft
 * `409 not_published` (spec 010, contracts/management-api.md "Scheduling")
 */
export function setStartDate(id: string, startDate: string | null): Promise<FormConnection> {
  const body: StartDateUpdate = { start_date: startDate };
  return apiFetch<FormConnection>(`/form-connections/${encodeURIComponent(id)}/start-date`, {
    method: 'PUT',
    body,
  });
}

/**
 * Deletes a published connection; answers the deletion, which its `id` can restore until
 * `restorable_until` (spec 010, contracts/management-api.md "Deleting")
 */
export function deleteFormConnection(id: string): Promise<Deletion> {
  return apiFetch<Deletion>(`/form-connections/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/**
 * Deletes several connections, drafts and published ones alike, as one deletion, or none: each item
 * names a connection and the state the dialog showed. A connection that no longer exists, is
 * deleted or is in another state answers `409 selection_changed` (`SelectionChanged`, its id in
 * `changed_ids`) and nothing is deleted. 1 to 500 items with distinct ids. Answers the deletion,
 * which its `id` restores whole until `restorable_until` (spec 010, research R10,
 * contracts/management-api.md "Deleting")
 */
export function deleteConnections(items: DeletionItem[]): Promise<Deletion> {
  const body: DeletionCreate = { items };
  return apiFetch<Deletion>('/form-connections/deletions', { method: 'POST', body });
}

/**
 * Takes back a deletion: every connection it deleted comes back as it was, or none. Only the team
 * member who deleted can, until the deletion's `restorable_until`; otherwise, and a second time, it
 * answers `409 not_restorable` and changes nothing (spec 010, contracts/management-api.md
 * "Deleting")
 */
export function restoreDeletion(deletionId: string): Promise<RestoredConnections> {
  return apiFetch<RestoredConnections>(
    `/form-connections/deletions/${encodeURIComponent(deletionId)}/restore`,
    { method: 'POST' }
  );
}

// Drafts (specs/005-connection-drafts/contracts/management-api.md "Endpoints")

export function createDraft(data: DraftCreate): Promise<FormConnectionDraft> {
  return apiFetch<FormConnectionDraft>('/form-connections/drafts', { method: 'POST', body: data });
}

export function saveDraft(id: string, data: DraftUpdate): Promise<FormConnectionDraft> {
  return apiFetch<FormConnectionDraft>(`/form-connections/${encodeURIComponent(id)}/draft`, {
    method: 'PUT',
    body: data,
  });
}

/**
 * Publishes a draft; with `data.start_date` (YYYY-MM-DD) it is published scheduled for that day,
 * and a day that isn't after today in Germany answers `400 invalid_start_date` (spec 010,
 * contracts/management-api.md "Scheduling")
 */
export function publishDraft(id: string, data: DraftPublish): Promise<FormConnection> {
  return apiFetch<FormConnection>(`/form-connections/${encodeURIComponent(id)}/publish`, {
    method: 'POST',
    body: data,
  });
}

/**
 * Deletes a draft; answers the deletion, which its `id` can restore until `restorable_until`
 * (spec 010, contracts/management-api.md "Deleting")
 */
export function deleteDraft(id: string): Promise<Deletion> {
  return apiFetch<Deletion>(`/form-connections/${encodeURIComponent(id)}/draft`, {
    method: 'DELETE',
  });
}
