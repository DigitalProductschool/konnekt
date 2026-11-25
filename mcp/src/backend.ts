// The management API as the caller: every call carries the caller's bearer, answers the `data`
// of the `{ data }` envelope, and turns the backend's `{ error, message, error_id?,
// needs_access_level? }` bodies into typed errors (research R5; contracts/management-api.md)
import type { AccessLevel } from '@konnekt/api-types/agent-access';
import type { DocumentType } from '@konnekt/api-types/document-types';
import type { OptionSet } from '@konnekt/api-types/option-sets';

import { config } from './config';

/** The base of every failed backend call, so the tool registry can tell them from bugs. */
export abstract class BackendFailure extends Error {}

/** `401`: the bearer is missing, unknown, expired or revoked. */
export class Unauthorized extends BackendFailure {
  constructor() {
    super('Sign in to continue');
    this.name = 'Unauthorized';
  }
}

/** `403 insufficient_access`: the caller's level doesn't allow the endpoint. */
export class InsufficientAccess extends BackendFailure {
  constructor(
    readonly level: AccessLevel,
    message: string
  ) {
    super(message);
    this.name = 'InsufficientAccess';
  }
}

/** `403 browser_only`: an endpoint reserved to Konnekt's own pages. */
export class BrowserOnly extends BackendFailure {
  constructor(message: string) {
    super(message);
    this.name = 'BrowserOnly';
  }
}

/** `404`: no such resource, or not the caller's. */
export class NotFound extends BackendFailure {
  constructor(message: string) {
    super(message);
    this.name = 'NotFound';
  }
}

/** `409`: `draft_changed`, `draft_published`, `not_allowed`, `approval_*`, … */
export class Conflict extends BackendFailure {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'Conflict';
  }
}

/** `429`: the limit on new drafts. */
export class RateLimited extends BackendFailure {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimited';
  }
}

/** `400` (and any other refusal of the request): the backend's message says why. */
export class Refused extends BackendFailure {
  constructor(message: string) {
    super(message);
    this.name = 'Refused';
  }
}

/** `5xx`, no answer, or an answer that can't be read: never what went wrong. */
export class BackendError extends BackendFailure {
  constructor(readonly errorId?: string) {
    super('Konnekt could not complete this.');
    this.name = 'BackendError';
  }
}

interface ErrorBody {
  error?: unknown;
  message?: unknown;
  error_id?: unknown;
  needs_access_level?: unknown;
}

const ACCESS_LEVELS: readonly AccessLevel[] = ['read', 'drafts', 'manage'];

// Long enough for a draft save with its checks, short enough that a hung backend doesn't hold
// the agent's call open
const TIMEOUT_MS = 30_000;

/** How long the catalog (document types and option sets) is reused, per process. */
export const CATALOG_TTL_MS = 60_000;
const CATALOG_PATHS = new Set(['/api/document-types', '/api/option-sets']);
const catalogCache = new Map<string, { data: unknown; expiresAt: number }>();

/** Forgets the cached catalog (for tests). */
export function clearCatalogCache(): void {
  catalogCache.clear();
}

function textOf(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

function failureOf(status: number, body: ErrorBody): BackendFailure {
  const code = textOf(body.error) ?? '';
  const message = textOf(body.message);
  if (status >= 500) return new BackendError(textOf(body.error_id));
  if (status === 401) return new Unauthorized();
  if (message === undefined) return new BackendError();
  if (status === 403 && code === 'insufficient_access') {
    const level = ACCESS_LEVELS.find((each) => each === body.needs_access_level);
    return level ? new InsufficientAccess(level, message) : new BackendError();
  }
  if (status === 403 && code === 'browser_only') return new BrowserOnly(message);
  if (status === 404) return new NotFound(message);
  if (status === 409) return new Conflict(code, message);
  if (status === 429) return new RateLimited(message);
  if (status >= 400 && status < 500) return new Refused(message);
  return new BackendError();
}

async function bodyOf(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

/** The management API with one caller's bearer. */
export class BackendClient {
  constructor(
    private readonly token: string,
    private readonly baseUrl: string = config.backendUrl
  ) {}

  /** `GET path`: the document types and option sets come from the 60-second catalog cache. */
  async get<T>(path: string): Promise<T> {
    if (!CATALOG_PATHS.has(path)) return this.request<T>('GET', path);
    const cached = catalogCache.get(path);
    if (cached && cached.expiresAt > Date.now()) return cached.data as T;
    const data = await this.request<T>('GET', path);
    catalogCache.set(path, { data, expiresAt: Date.now() + CATALOG_TTL_MS });
    return data;
  }

  /** `POST path` with a JSON body. */
  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  /** `PUT path` with a JSON body. */
  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  /** `DELETE path`, sent as JSON like every write (the backend's `require_json`). */
  delete<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('DELETE', path, body);
  }

  /** The catalog's document types (cached). */
  documentTypes(): Promise<DocumentType[]> {
    return this.get<DocumentType[]>('/api/document-types');
  }

  /** The value sets of enum fields and parts (cached). */
  optionSets(): Promise<OptionSet[]> {
    return this.get<OptionSet[]>('/api/option-sets');
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Bearer ${this.token}`,
    };
    const write = method !== 'GET';
    if (write) headers['Content-Type'] = 'application/json';
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: write && body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new BackendError();
    }
    const answer = await bodyOf(response);
    if (!response.ok) {
      throw failureOf(response.status, typeof answer === 'object' && answer ? answer : {});
    }
    if (typeof answer !== 'object' || answer === null || !('data' in answer)) {
      throw new BackendError();
    }
    return (answer as { data: T }).data;
  }
}
