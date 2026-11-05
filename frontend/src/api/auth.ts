import type { LoginRequest, UserView } from '@connection-portal/api-types/auth';

import { apiFetch } from './client';

export function login(credentials: LoginRequest): Promise<UserView> {
  return apiFetch<UserView>('/auth/login', { method: 'POST', body: credentials });
}

export function logout(): Promise<null> {
  return apiFetch<null>('/auth/logout', { method: 'POST' });
}

export function getMe(): Promise<UserView> {
  return apiFetch<UserView>('/auth/me');
}
