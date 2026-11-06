// The MCP tools (contracts/mcp-tools.md "Results and errors"): every tool module registers its
// definitions here, the server registers them on each instance it builds, and the guidance gate
// reads the list. Every call runs through one wrapper: the caller's level before any work, the
// handler, the backend's and the references' refusals as tool errors, and one log line
import type { AccessLevel } from '@connection-portal/api-types/agent-access';
import type {
  CallToolResult,
  InputRequiredResult,
  McpServer,
  ServerContext,
} from '@modelcontextprotocol/server';
import type { z } from 'zod';

import {
  type Caller,
  HttpRefusal,
  insufficientAccessError,
  levelAllows,
  unauthorizedResponse,
} from '../auth';
import {
  BackendClient,
  BackendError,
  BackendFailure,
  BrowserOnly,
  Conflict,
  InsufficientAccess,
  NotFound,
  RateLimited,
  Refused,
  Unauthorized,
} from '../backend';
import { type Exchange, exchangeOfContext } from '../exchange';
import { ReferenceRefusal } from '../links';
import { logError, logRequest } from '../log';
import { AmbiguousName } from '../resolve';
import type { ItemRef, VariantRef } from '../views';

/** The codes of a tool error (contracts/mcp-tools.md "Results and errors"). */
export type ToolErrorCode =
  | 'insufficient_access'
  | 'published_read_only'
  | 'not_found'
  | 'ambiguous_name'
  | 'foreign_link'
  | 'validation'
  | 'conflict'
  | 'not_allowed'
  | 'rate_limited'
  | 'backend_error';

/** A refusal's `structuredContent`. */
export interface ToolError {
  code: ToolErrorCode;
  message: string;
  needs_access_level?: AccessLevel;
  candidates?: (VariantRef | ItemRef)[];
  error_id?: string;
}

/** What a handler answers: a result, or (2026-07-28 and the 2025 shim) a request for input. */
export type ToolAnswer = CallToolResult | InputRequiredResult;

/** What a handler gets besides the caller and its input. */
export interface ToolContext {
  /** The management API with the caller's bearer. */
  backend: BackendClient;
  /** The SDK's context of the call: the envelope, `requestState`, the abort signal. */
  request: ServerContext;
  /** The server instance serving the call (in a 2025-era session, its client's capabilities). */
  server: McpServer;
}

/** A tool: its name, the lowest level that may call it, its description, input and handler. */
export interface ToolDefinition<Input extends z.ZodObject = z.ZodObject> {
  name: string;
  level: AccessLevel;
  description: string;
  input: Input;
  /**
   * Whether the tool changes content: the backend's `browser_only` then means a published
   * connection's content, `published_read_only` (FR-018)
   */
  changesContent?: boolean;
  handler(caller: Caller, input: z.infer<Input>, context: ToolContext): Promise<ToolAnswer>;
}

export const PUBLISHED_READ_ONLY_MESSAGE =
  'The content of a published connection is changed in the Connection Portal. Agents can only ' +
  'change drafts.';
export const BACKEND_ERROR_MESSAGE = 'The Connection Portal could not complete this.';
export const SIGNED_OUT_MESSAGE =
  'The sign-in to the Connection Portal has ended. Call the tool again to sign in anew.';

/** A tool's answer: the JSON the contract names, and a text block that summarises it. */
export function toolResult(structured: Record<string, unknown>, text: string): CallToolResult {
  return { structuredContent: structured, content: [{ type: 'text', text }] };
}

/** A refusal: `isError`, the message as the text, and the `ToolError` as structured content. */
export function toolError(
  code: ToolErrorCode,
  message: string,
  extras: Omit<ToolError, 'code' | 'message'> = {}
): CallToolResult {
  const error: ToolError = { code, message, ...extras };
  return {
    isError: true,
    content: [{ type: 'text', text: message }],
    structuredContent: { ...error },
  };
}

/** The tool error for a backend failure (contracts/mcp-tools.md "Results and errors"). */
export function backendFailureError(error: BackendFailure, changesContent = false): CallToolResult {
  if (error instanceof InsufficientAccess) {
    return toolError('insufficient_access', error.message, { needs_access_level: error.level });
  }
  if (error instanceof BrowserOnly) {
    return changesContent
      ? toolError('published_read_only', PUBLISHED_READ_ONLY_MESSAGE)
      : toolError('not_allowed', error.message);
  }
  if (error instanceof NotFound) return toolError('not_found', error.message);
  if (error instanceof Conflict) {
    if (error.code === 'not_allowed') return toolError('not_allowed', error.message);
    if (error.code === 'draft_published') {
      return toolError('published_read_only', PUBLISHED_READ_ONLY_MESSAGE);
    }
    return toolError('conflict', error.message);
  }
  if (error instanceof RateLimited) return toolError('rate_limited', error.message);
  if (error instanceof Refused) return toolError('validation', error.message);
  if (error instanceof Unauthorized) return toolError('backend_error', SIGNED_OUT_MESSAGE);
  const errorId = error instanceof BackendError ? error.errorId : undefined;
  return errorId
    ? toolError('backend_error', `${BACKEND_ERROR_MESSAGE} Error ID: ${errorId}`, {
        error_id: errorId,
      })
    : toolError('backend_error', BACKEND_ERROR_MESSAGE);
}

/** The tool error for a reference a tool can't use (links.ts, resolve.ts). */
export function referenceRefusalError(error: ReferenceRefusal): CallToolResult {
  return error instanceof AmbiguousName
    ? toolError(error.code, error.message, { candidates: error.candidates })
    : toolError(error.code, error.message);
}

function statusOf(answer: ToolAnswer): string {
  if (!('content' in answer) || !answer.isError) return 'ok';
  const code = (answer.structuredContent as Partial<ToolError> | undefined)?.code;
  return typeof code === 'string' ? code : 'error';
}

/**
 * Sets the HTTP answer of the call's request (`exchange`). Where the response has already
 * started (a 2025-era session streams it), the tool error stands for it
 */
function refuseHttp(exchange: Exchange | null, refusal: HttpRefusal): CallToolResult {
  if (exchange) exchange.httpAnswer = refusal.answer;
  return toolError(
    'backend_error',
    refusal.answer.status === 401 ? SIGNED_OUT_MESSAGE : BACKEND_ERROR_MESSAGE
  );
}

/** The tools of one server: registered by the tool modules, registered on every instance. */
export class ToolRegistry {
  readonly #tools = new Map<string, ToolDefinition>();

  /** Adds a tool; a second tool with the same name is a programming error. */
  registerTool<Input extends z.ZodObject>(definition: ToolDefinition<Input>): void {
    if (this.#tools.has(definition.name)) {
      throw new Error(`The tool ${definition.name} is registered twice`);
    }
    this.#tools.set(definition.name, definition as unknown as ToolDefinition);
  }

  /** The registered tools, in registration order. */
  tools(): ToolDefinition[] {
    return [...this.#tools.values()];
  }

  /** Registers every tool on `server`, each behind the wrapper. */
  attach(server: McpServer): void {
    for (const definition of this.#tools.values()) {
      server.registerTool(
        definition.name,
        { description: definition.description, inputSchema: definition.input },
        (input: Record<string, unknown>, request: ServerContext) =>
          this.call(definition, input, request, server)
      );
    }
  }

  /**
   * Runs one call: the caller's level before any work (FR-003), the handler, the refusals as
   * tool errors, then the call's log line (method, tool, status, duration; never the input)
   */
  async call(
    definition: ToolDefinition,
    input: Record<string, unknown>,
    request: ServerContext,
    server: McpServer
  ): Promise<ToolAnswer> {
    const started = performance.now();
    const exchange = exchangeOfContext(request);
    const answer = await this.#answer(definition, input, request, server, exchange);
    logRequest({
      method: 'tools/call',
      tool: definition.name,
      status: statusOf(answer),
      durationMs: performance.now() - started,
    });
    if (exchange) exchange.logged = true;
    return answer;
  }

  async #answer(
    definition: ToolDefinition,
    input: Record<string, unknown>,
    request: ServerContext,
    server: McpServer,
    exchange: Exchange | null
  ): Promise<ToolAnswer> {
    // Every request to /mcp is resolved before the SDK sees it; a call without a caller can only
    // come from outside it
    if (!exchange) return refuseHttp(null, new HttpRefusal(unauthorizedResponse()));
    const { caller } = exchange;
    if (!levelAllows(caller, definition.level)) {
      const { code, message, needs_access_level } = insufficientAccessError(
        caller,
        definition.level
      );
      return toolError(code, message, { needs_access_level });
    }
    const context: ToolContext = { backend: new BackendClient(caller.token), request, server };
    try {
      return await definition.handler(caller, input, context);
    } catch (error) {
      if (error instanceof Unauthorized) {
        return refuseHttp(exchange, new HttpRefusal(unauthorizedResponse()));
      }
      if (error instanceof HttpRefusal) return refuseHttp(exchange, error);
      if (error instanceof BackendFailure) {
        return backendFailureError(error, definition.changesContent);
      }
      if (error instanceof ReferenceRefusal) return referenceRefusalError(error);
      logError(`The tool ${definition.name} failed`);
      return toolError('backend_error', BACKEND_ERROR_MESSAGE);
    }
  }
}

/** The server's tools: the tool modules register here (`tools/index.ts` imports them all). */
export const registry = new ToolRegistry();

/** Registers a tool of the server. */
export function registerTool<Input extends z.ZodObject>(definition: ToolDefinition<Input>): void {
  registry.registerTool(definition);
}

/** The server's tools, which the guidance gate checks (FR-038). */
export function tools(): ToolDefinition[] {
  return registry.tools();
}
