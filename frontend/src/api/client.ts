import type { ApiErrorResponse, ApiResponse, ErrorNotice } from '@connection-portal/api-types/api';
import { DEFAULT_LANGUAGE, type Language } from '@connection-portal/rules/language';

// In production VITE_API_URL is unset and the app calls its own origin ('/api'),
// which nginx proxies to the backend. In dev it points at the backend directly.
const API_URL = import.meta.env.VITE_API_URL || '/api';

function normalizeApiBaseUrl(value: string): string {
  const trimmed = value.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

export const API_BASE_URL = normalizeApiBaseUrl(API_URL);

// These need a JSON body, which also protects the session cookie against CSRF
const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'DELETE']);

// The website's language, which every call asks the answers' texts in (spec 009, research R7,
// contracts/api-language.md "The request header"). `LanguageProvider` sets it before the first
// render and on every change, so that the client needs no React
let requestLanguage: Language = DEFAULT_LANGUAGE;

/** The language the following calls send as `Accept-Language`; only `LanguageProvider` sets it. */
export function setRequestLanguage(language: Language): void {
  requestLanguage = language;
}

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
  return (
    typeof record.error === 'string' &&
    typeof record.message === 'string' &&
    (record.error_id === undefined || typeof record.error_id === 'string')
  );
}

/**
 * What to show for a failed call: the API's message and, after a 5xx answer, the error ID that
 * the backend logged the details under. Any other failure gets the fallback message.
 */
export function errorNoticeOf(error: unknown, fallback: string): ErrorNotice {
  return error instanceof ApiError
    ? { message: error.data.message, error_id: error.data.error_id }
    : { message: fallback };
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

interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
}

/**
 * Call the backend with the session cookie and return the `data` of its answer.
 *
 * Every call sends the website's language as `Accept-Language`. POST, PUT and DELETE always
 * send JSON, `{}` when there is no body. An error answer throws an `ApiError`.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = { 'Accept-Language': requestLanguage };
  const init: RequestInit = { method, credentials: 'include', headers };

  if (STATE_CHANGING_METHODS.has(method)) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(options.body ?? {});
  }

  const response = await fetch(`${API_BASE_URL}${path}`, init);
  const result = await handleResponse<ApiResponse<T>>(response);
  return result.data;
}
