// Who calls, at which level (research R5; contracts/mcp-tools.md "Server"): the bearer is
// resolved with `GET /api/agent/me` on every request, before the SDK sees it, and the backend's
// own per-endpoint check stays the safety net
import type { ServerResponse } from 'node:http';
import type {
  AccessLevel,
  AccessLevelInfo,
  AgentAccessKind,
  AgentMe,
} from '@connection-portal/api-types/agent-access';

import { BackendClient, Unauthorized } from './backend';
import { config } from './config';

/** The resolved bearer: whose access it is and its level at this call. */
export interface Caller {
  token: string;
  username: string;
  clientName: string | null;
  kind: AgentAccessKind;
  accessLevel: AccessLevel;
  levels: AccessLevelInfo[];
}

/** An answer at the HTTP level, outside the MCP protocol: a status, headers, maybe a body. */
export interface HttpAnswer {
  status: number;
  headers: Record<string, string>;
  body: string | null;
}

/** Thrown where the whole HTTP request answers `answer` instead of an MCP message. */
export class HttpRefusal extends Error {
  constructor(readonly answer: HttpAnswer) {
    super(`HTTP ${answer.status}`);
    this.name = 'HttpRefusal';
  }
}

/** A tool error for a tool above the caller's level (contracts/mcp-tools.md "Results and errors"). */
export interface InsufficientAccessError {
  code: 'insufficient_access';
  message: string;
  needs_access_level: AccessLevel;
}

/** The order of the levels: each includes the ones before it (data-model §3.1). */
const LEVEL_ORDER: readonly AccessLevel[] = ['read', 'drafts', 'manage'];

/** The levels' UI names, as the backend names them (data-model §3.1). */
export const LEVEL_NAMES: Record<AccessLevel, string> = {
  read: 'Read only',
  drafts: 'Read and edit drafts',
  manage: 'Read, edit drafts and manage live connections',
};

/** What a level adds, as the start of a refusal's sentence (contracts/management-api.md). */
const LEVEL_ACTIONS: Record<AccessLevel, string> = {
  read: 'Reading connections',
  drafts: 'Changing drafts',
  manage: 'Deactivating, reactivating and deleting published connections',
};

/** The OAuth scope that grants a level: the cumulative set (research R5). */
function scopeOf(level: AccessLevel): string {
  return LEVEL_ORDER.slice(0, LEVEL_ORDER.indexOf(level) + 1).join(' ');
}

function levelName(caller: Caller | null, level: AccessLevel): string {
  return caller?.levels.find((info) => info.level === level)?.name ?? LEVEL_NAMES[level];
}

/** The URL of the protected resource metadata, RFC 9728's path form for `{origin}/mcp`. */
export function resourceMetadataUrl(): string {
  return `${config.mcpOrigin}/.well-known/oauth-protected-resource/mcp`;
}

/** `401` with the resource metadata and no body: the protocol's signal to authorize. */
export function unauthorizedResponse(): HttpAnswer {
  return {
    status: 401,
    headers: { 'WWW-Authenticate': `Bearer resource_metadata="${resourceMetadataUrl()}"` },
    body: null,
  };
}

type HeaderValue = string | string[] | undefined;

/** A request with headers: a `node:http` request or a web `Request`. */
export type RequestWithHeaders = { headers: Headers } | { headers: Record<string, HeaderValue> };

function authorizationOf(request: RequestWithHeaders): string | undefined {
  const { headers } = request;
  if (headers instanceof Headers) return headers.get('authorization') ?? undefined;
  const value = headers.authorization ?? headers.Authorization;
  return Array.isArray(value) ? value[0] : value;
}

/** The bearer token of an `Authorization: Bearer …` header, or `null`. */
export function bearerOf(request: RequestWithHeaders): string | null {
  const match = /^Bearer\s+(\S+)\s*$/i.exec(authorizationOf(request) ?? '');
  return match ? match[1] : null;
}

/**
 * Resolves the request's bearer with `GET /api/agent/me`. A missing header or the backend's
 * `401` throws an `HttpRefusal` with `unauthorizedResponse()`; other backend failures
 * (`BackendError`, …) are thrown as they are.
 */
export async function callerOf(
  request: RequestWithHeaders,
  backendUrl: string = config.backendUrl
): Promise<Caller> {
  const token = bearerOf(request);
  if (token === null) throw new HttpRefusal(unauthorizedResponse());
  let me: AgentMe;
  try {
    me = await new BackendClient(token, backendUrl).get<AgentMe>('/api/agent/me');
  } catch (error) {
    if (error instanceof Unauthorized) throw new HttpRefusal(unauthorizedResponse());
    throw error;
  }
  return {
    token,
    username: me.username,
    clientName: me.client_name,
    kind: me.kind,
    accessLevel: me.access_level,
    levels: me.levels,
  };
}

/** Whether the caller's level includes `level` (`read < drafts < manage`). */
export function levelAllows(caller: Caller, level: AccessLevel): boolean {
  return LEVEL_ORDER.indexOf(caller.accessLevel) >= LEVEL_ORDER.indexOf(level);
}

/** The tool error for a tool that needs `level`, naming it and the two ways to get it. */
export function insufficientAccessError(
  caller: Caller,
  level: AccessLevel
): InsufficientAccessError {
  const current = levelName(caller, caller.accessLevel).toLowerCase();
  const message =
    `Your access is ${current}. ${LEVEL_ACTIONS[level]} needs the access level ` +
    `'${levelName(caller, level)}'. Ask for it with request_access, or the team member ` +
    'raises it on their user page.';
  return { code: 'insufficient_access', message, needs_access_level: level };
}

/** `403 insufficient_scope`: the protocol's signal to authorize again with `level` (step-up). */
export function stepUpResponse(level: 'drafts' | 'manage'): HttpAnswer {
  const description =
    `${LEVEL_ACTIONS[level]} needs the access level '${LEVEL_NAMES[level]}'. ` +
    'Reconnect with that level, or ask the team member to raise it on their user page.';
  return {
    status: 403,
    headers: {
      'WWW-Authenticate':
        `Bearer error="insufficient_scope", scope="${scopeOf(level)}", ` +
        `error_description="${description}"`,
    },
    body: null,
  };
}

/** RFC 9728 protected resource metadata for the MCP endpoint. */
export function protectedResourceMetadata(): {
  resource: string;
  authorization_servers: string[];
  scopes_supported: AccessLevel[];
  bearer_methods_supported: string[];
  resource_name: string;
} {
  return {
    resource: config.mcpUrl,
    authorization_servers: [config.oauthIssuer],
    scopes_supported: [...LEVEL_ORDER],
    bearer_methods_supported: ['header'],
    resource_name: 'Connection Portal',
  };
}

/** Writes an `HttpAnswer` to a `node:http` response. */
export function sendHttpAnswer(response: ServerResponse, answer: HttpAnswer): void {
  response.writeHead(answer.status, answer.headers);
  response.end(answer.body ?? undefined);
}
