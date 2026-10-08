import type { ApiErrorResponse } from '../types/api';

// In production VITE_API_URL is unset and the app calls its own origin ('/api'),
// which nginx proxies to the backend. In dev it points at the backend directly.
const API_URL = import.meta.env.VITE_API_URL || '/api';

function normalizeApiBaseUrl(value: string): string {
  const trimmed = value.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

export const API_BASE_URL = normalizeApiBaseUrl(API_URL);

export class ApiError extends Error {
  status: number;
  data: ApiErrorResponse;

  constructor(status: number, data: ApiErrorResponse) {
    super(data.message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record.error === 'string' && typeof record.message === 'string';
}

async function parseJson(response: Response): Promise<unknown> {
  return (await response.json()) as unknown;
}

export async function handleResponse<T>(response: Response): Promise<T> {
  const payload = await parseJson(response).catch(() => null);

  if (!response.ok) {
    const data = isApiErrorResponse(payload)
      ? payload
      : {
          error: 'Unknown error',
          message: 'An unexpected error occurred',
        };
    throw new ApiError(response.status, data);
  }

  return payload as T;
}
