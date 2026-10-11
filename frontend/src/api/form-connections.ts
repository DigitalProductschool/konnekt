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
