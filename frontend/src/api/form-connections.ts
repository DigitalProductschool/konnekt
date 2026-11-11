import type {
  ActivityPage,
  DraftCreate,
  DraftPublish,
  DraftUpdate,
  FormConnection,
  FormConnectionCreate,
  FormConnectionDraft,
  FormConnectionOrDraft,
  FormConnectionSummary,
  FormConnectionUpdate,
} from '@connection-portal/api-types/form-connections';

import { apiFetch } from './client';

export function listFormConnections(): Promise<FormConnectionSummary[]> {
  return apiFetch<FormConnectionSummary[]>('/form-connections');
}

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

export function activateFormConnection(id: string): Promise<FormConnection> {
  return apiFetch<FormConnection>(`/form-connections/${encodeURIComponent(id)}/activate`, {
    method: 'POST',
  });
}

export function deleteFormConnection(id: string): Promise<null> {
  return apiFetch<null>(`/form-connections/${encodeURIComponent(id)}`, { method: 'DELETE' });
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

export function publishDraft(id: string, data: DraftPublish): Promise<FormConnection> {
  return apiFetch<FormConnection>(`/form-connections/${encodeURIComponent(id)}/publish`, {
    method: 'POST',
    body: data,
  });
}

export function deleteDraft(id: string): Promise<null> {
  return apiFetch<null>(`/form-connections/${encodeURIComponent(id)}/draft`, { method: 'DELETE' });
}
