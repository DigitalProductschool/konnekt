import type {
  FormConnection,
  FormConnectionCreate,
  FormConnectionSummary,
  FormConnectionUpdate,
} from '../types/form-connections';
import { apiFetch } from './client';

export function listFormConnections(): Promise<FormConnectionSummary[]> {
  return apiFetch<FormConnectionSummary[]>('/form-connections');
}

export function createFormConnection(data: FormConnectionCreate): Promise<FormConnection> {
  return apiFetch<FormConnection>('/form-connections', { method: 'POST', body: data });
}

export function getFormConnection(id: string): Promise<FormConnection> {
  return apiFetch<FormConnection>(`/form-connections/${encodeURIComponent(id)}`);
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
