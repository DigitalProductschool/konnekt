// The MCP server over HTTP (research R2; contracts/mcp-tools.md "Server"): one endpoint /mcp, the
// bearer resolved on every request before the SDK sees it, 2026-07-28 requests served stateless
// by `createMcpHandler`, 2025-era requests in sessions bound to the bearer that opened them; plus
// the protected resource metadata and the health check
import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  NodeStreamableHTTPServerTransport,
  toNodeHandler,
  toWebRequest,
} from '@modelcontextprotocol/node';
import {
  type AuthInfo,
  createMcpHandler,
  DEFAULT_MAX_REQUEST_BODY_SIZE,
  isInitializeRequest,
  isJsonContentType,
  isLegacyRequest,
  McpServer,
} from '@modelcontextprotocol/server';
import { memorySkillFiles, SkillCatalog } from '@modelcontextprotocol/server/ext/skills';

import packageJson from '../package.json';
import { callerOf, HttpRefusal, protectedResourceMetadata, sendHttpAnswer } from './auth';
import { authInfoOf, type Exchange, exchangeFor, exchangeOf } from './exchange';
import { instructions, skills } from './guidance';
import { logError, logRequest } from './log';
import { bearerHashOf, SessionStore } from './sessions';
import { registry as defaultRegistry } from './tools';
import { BACKEND_ERROR_MESSAGE, type ToolRegistry } from './tools/registry';

/** The paths of the protected resource metadata (RFC 9728: the root and the path form). */
const METADATA_PATHS = new Set([
  '/.well-known/oauth-protected-resource',
  '/.well-known/oauth-protected-resource/mcp',
]);

type McpRequest = IncomingMessage & { auth?: AuthInfo };

/** A 2025-era session: its transport and the server instance connected to it. */
interface Session {
  transport: NodeStreamableHTTPServerTransport;
  server: McpServer;
  close(): Promise<void>;
}

/** What `startServer` takes. */
export interface StartOptions {
  port: number;
  /** All interfaces when left out. */
  host?: string;
  /** The tools to serve; the server's own by default (tests pass a registry of their own). */
  registry?: ToolRegistry;
}

/** A listening MCP server. */
export interface RunningServer {
  /** `http://<host>:<port>`, without a path. */
  url: string;
  port: number;
  close(): Promise<void>;
}

/** The skills of `guidance.ts`, loaded once; every server instance attaches them. */
export function loadSkillCatalog(): Promise<SkillCatalog> {
  const files = Object.fromEntries(skills().map((skill) => [`${skill.name}/SKILL.md`, skill.text]));
  return SkillCatalog.load(memorySkillFiles(files), {
    strict: true,
    onWarning: (warning) => logError(`The skill file ${warning.path} has a problem`),
  });
}

/** One server instance: the tools of `registry`, the instructions and the skills. */
export function createMcpServer(registry: ToolRegistry, catalog: SkillCatalog): McpServer {
  const server = new McpServer(
    { name: 'connection-portal', version: packageJson.version },
    { capabilities: { tools: {}, resources: {} }, instructions }
  );
  registry.attach(server);
  catalog.attach(server);
  return server;
}

function pathOf(request: IncomingMessage): string {
  try {
    return new URL(request.url ?? '/', 'http://localhost').pathname;
  } catch {
    return '';
  }
}

function headerOf(request: IncomingMessage, name: string): string | undefined {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function sendJson(
  response: ServerResponse,
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
): void {
  response.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  response.end(JSON.stringify(body));
}

/** A JSON-RPC error outside the SDK, shaped as the SDK's transports answer them. */
function sendRpcError(
  response: ServerResponse,
  status: number,
  code: number,
  message: string,
  headers: Record<string, string> = {}
): void {
  sendJson(response, status, { jsonrpc: '2.0', error: { code, message }, id: null }, headers);
}

function sendMethodNotAllowed(response: ServerResponse, allow: string): void {
  sendRpcError(response, 405, -32000, 'Method not allowed.', { Allow: allow });
}

class BodyTooLarge extends Error {}

async function bodyTextOf(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string);
    size += buffer.length;
    if (size > DEFAULT_MAX_REQUEST_BODY_SIZE) throw new BodyTooLarge();
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function messagesOf(body: unknown): Record<string, unknown>[] {
  const messages = Array.isArray(body) ? body : [body];
  return messages.filter(
    (message): message is Record<string, unknown> => typeof message === 'object' && message !== null
  );
}

/** The JSON-RPC method for the log line: one message's, or `batch`. */
function methodOf(body: unknown): string {
  const [message, ...rest] = messagesOf(body);
  if (!message || rest.length > 0) return 'batch';
  return typeof message.method === 'string' ? message.method : 'response';
}

/** The tool a single `tools/call` names, for the log line; never its arguments. */
function toolOf(body: unknown): string | null {
  const [message, ...rest] = messagesOf(body);
  if (!message || rest.length > 0 || message.method !== 'tools/call') return null;
  const params = message.params as { name?: unknown } | undefined;
  return typeof params?.name === 'string' ? params.name : null;
}

/** The HTTP side of the server: its request listener and what closes it. */
function createApp(registry: ToolRegistry, catalog: SkillCatalog) {
  const factory = () => createMcpServer(registry, catalog);
  const onerror = () => logError('An MCP request failed');
  const sessions = new SessionStore<Session>();
  sessions.start();

  // 2026-07-28: stateless. A tool may replace the answer at the HTTP level (exchange.ts): the
  // response isn't sent before the handler has answered, unless the handler streamed
  const modern = createMcpHandler(factory, { legacy: 'reject', onerror });
  const serveModern = toNodeHandler(
    {
      fetch: async (request, options) => {
        const response = await modern.fetch(request, options);
        const answer = exchangeOf(options?.authInfo)?.httpAnswer;
        if (!answer) return response;
        await response.body?.cancel();
        return new Response(answer.body, { status: answer.status, headers: answer.headers });
      },
    },
    { onerror }
  );

  async function openSession(
    request: McpRequest,
    response: ServerResponse,
    body: unknown,
    bearerHash: string
  ): Promise<void> {
    const server = factory();
    const transport: NodeStreamableHTTPServerTransport = new NodeStreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        sessions.add(id, bearerHash, { transport, server, close: () => server.close() });
      },
      onsessionclosed: (id) => sessions.remove(id),
    });
    server.server.onclose = () => {
      if (transport.sessionId) sessions.remove(transport.sessionId);
    };
    await server.connect(transport);
    await transport.handleRequest(request, response, body);
    if (!transport.sessionId) await server.close();
  }

  // 2025-era: in a session, opened by `initialize` and bound to its bearer (research R2)
  async function serveLegacy(
    request: McpRequest,
    response: ServerResponse,
    body: unknown,
    exchange: Exchange
  ): Promise<void> {
    const bearerHash = bearerHashOf(exchange.caller.token);
    const sessionId = headerOf(request, 'mcp-session-id');
    if (sessionId) {
      const session = sessions.find(sessionId, bearerHash);
      if (!session) return sendRpcError(response, 404, -32001, 'Session not found');
      await session.transport.handleRequest(request, response, body);
      // The bearer ended during the call, after the response had started: the client meets the
      // 401 when it opens a new session
      if (exchange.httpAnswer?.status === 401) {
        sessions.remove(sessionId);
        await session.close();
      }
      return;
    }
    if (request.method !== 'POST') return sendMethodNotAllowed(response, 'POST');
    if (!messagesOf(body).some((message) => isInitializeRequest(message))) {
      return sendRpcError(response, 400, -32000, 'Bad Request: Mcp-Session-Id header is required');
    }
    await openSession(request, response, body, bearerHash);
  }

  async function serveMcp(request: McpRequest, response: ServerResponse): Promise<void> {
    const started = performance.now();
    let exchange: Exchange | null = null;
    let method = request.method ?? 'unknown';
    let tool: string | null = null;
    response.on('close', () => {
      if (exchange?.logged) return;
      logRequest({
        method,
        tool,
        status: response.statusCode,
        durationMs: performance.now() - started,
      });
    });

    // The bearer first, in both eras: without a valid one, 401 and no body (R5)
    try {
      exchange = exchangeFor(await callerOf(request));
    } catch (error) {
      if (error instanceof HttpRefusal) return sendHttpAnswer(response, error.answer);
      logError('The caller could not be resolved');
      return sendRpcError(response, 503, -32603, BACKEND_ERROR_MESSAGE);
    }
    request.auth = authInfoOf(exchange);

    if (request.method === 'GET' || request.method === 'DELETE') {
      return serveLegacy(request, response, undefined, exchange);
    }
    if (request.method !== 'POST') return sendMethodNotAllowed(response, 'GET, POST, DELETE');
    if (!isJsonContentType(headerOf(request, 'content-type'))) {
      return sendRpcError(
        response,
        415,
        -32000,
        'Unsupported Media Type: Content-Type must be application/json'
      );
    }
    let body: unknown;
    try {
      body = JSON.parse(await bodyTextOf(request));
    } catch (error) {
      return error instanceof BodyTooLarge
        ? sendRpcError(response, 413, -32000, 'Payload Too Large')
        : sendRpcError(response, 400, -32700, 'Parse error: Invalid JSON');
    }
    method = methodOf(body);
    tool = toolOf(body);
    if (await isLegacyRequest(await toWebRequest(request, body), body)) {
      return serveLegacy(request, response, body, exchange);
    }
    await serveModern(request, response, body);
  }

  async function listener(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const path = pathOf(request);
    if (path === '/mcp') return serveMcp(request, response);
    if (request.method === 'GET' && path === '/health') {
      return sendJson(response, 200, { status: 'ok' });
    }
    if (request.method === 'GET' && METADATA_PATHS.has(path)) {
      return sendJson(response, 200, protectedResourceMetadata(), {
        'Cache-Control': 'max-age=3600',
      });
    }
    response.writeHead(404);
    response.end();
  }

  async function close(): Promise<void> {
    await sessions.closeAll();
    await modern.close();
  }

  return { listener, close };
}

/** Starts the MCP server on `port` and answers once it listens. */
export async function startServer({
  port,
  host,
  registry = defaultRegistry,
}: StartOptions): Promise<RunningServer> {
  const app = createApp(registry, await loadSkillCatalog());
  const server = createServer((request, response) => {
    app.listener(request, response).catch(() => {
      logError('A request to the MCP server failed');
      if (!response.headersSent) {
        response.writeHead(500);
        response.end();
      } else {
        response.destroy();
      }
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      resolve();
    });
  });
  const { port: listening } = server.address() as AddressInfo;
  return {
    url: `http://${host ?? 'localhost'}:${listening}`,
    port: listening,
    close: async () => {
      await app.close();
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
