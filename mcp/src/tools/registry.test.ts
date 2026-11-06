import type { McpServer, ServerContext } from '@modelcontextprotocol/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { Caller } from '../auth';
import {
  BackendError,
  BrowserOnly,
  Conflict,
  InsufficientAccess,
  NotFound,
  RateLimited,
  Refused,
  Unauthorized,
} from '../backend';
import { authInfoOf, type Exchange, exchangeFor } from '../exchange';
import { ForeignLink } from '../links';
import { AmbiguousName } from '../resolve';
import {
  BACKEND_ERROR_MESSAGE,
  backendFailureError,
  PUBLISHED_READ_ONLY_MESSAGE,
  SIGNED_OUT_MESSAGE,
  type ToolDefinition,
  toolError,
  ToolRegistry,
  toolResult,
} from './registry';

const LEVELS = [
  { level: 'read', name: 'Read only', allows: 'Every read' },
  { level: 'drafts', name: 'Read and edit drafts', allows: 'Also drafts' },
  { level: 'manage', name: 'Read, edit drafts and manage live connections', allows: 'Also live' },
] as const;

function caller(accessLevel: Caller['accessLevel']): Caller {
  return {
    token: 'secret-token',
    username: 'anna',
    clientName: 'Claude Code',
    kind: 'oauth',
    accessLevel,
    levels: [...LEVELS],
  };
}

function contextOf(exchange: Exchange | null): ServerContext {
  return { http: exchange ? { authInfo: authInfoOf(exchange) } : undefined } as ServerContext;
}

const SERVER = {} as McpServer;

function tool(
  handler: ToolDefinition['handler'],
  extra: Partial<ToolDefinition> = {}
): ToolDefinition {
  return {
    name: 'probe',
    level: 'drafts',
    description: 'A tool of the tests',
    input: z.object({ connection: z.string() }),
    handler,
    ...extra,
  };
}

let logged: string[];

beforeEach(() => {
  logged = [];
  vi.spyOn(console, 'error').mockImplementation((line: string) => {
    logged.push(line);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('toolResult and toolError', () => {
  it('answer the structured content and a text block', () => {
    expect(toolResult({ a: 1 }, 'One.')).toEqual({
      structuredContent: { a: 1 },
      content: [{ type: 'text', text: 'One.' }],
    });
    expect(toolError('not_found', 'Gone.', { error_id: 'e-1' })).toEqual({
      isError: true,
      content: [{ type: 'text', text: 'Gone.' }],
      structuredContent: { code: 'not_found', message: 'Gone.', error_id: 'e-1' },
    });
  });
});

describe('backendFailureError', () => {
  it.each([
    [
      new InsufficientAccess('manage', 'Managing needs more.'),
      {
        code: 'insufficient_access',
        message: 'Managing needs more.',
        needs_access_level: 'manage',
      },
    ],
    [
      new NotFound('This draft has been deleted.'),
      { code: 'not_found', message: 'This draft has been deleted.' },
    ],
    [
      new Conflict('not_allowed', 'This connection is already deactivated.'),
      { code: 'not_allowed', message: 'This connection is already deactivated.' },
    ],
    [
      new Conflict('draft_published', 'Published since.'),
      { code: 'published_read_only', message: PUBLISHED_READ_ONLY_MESSAGE },
    ],
    [new RateLimited('Again at 15:40.'), { code: 'rate_limited', message: 'Again at 15:40.' }],
    [
      new Refused('Rule 02 has no error message.'),
      { code: 'validation', message: 'Rule 02 has no error message.' },
    ],
    [
      new BackendError('e-42'),
      {
        code: 'backend_error',
        message: `${BACKEND_ERROR_MESSAGE} Error ID: e-42`,
        error_id: 'e-42',
      },
    ],
    [new BackendError(), { code: 'backend_error', message: BACKEND_ERROR_MESSAGE }],
  ])('maps %s', (error, expected) => {
    const answer = backendFailureError(error);
    expect(answer.isError).toBe(true);
    expect(answer.structuredContent).toEqual(expected);
    expect(answer.content).toEqual([{ type: 'text', text: expected.message }]);
  });

  it('maps browser_only to published_read_only where the tool changes content', () => {
    const error = new BrowserOnly('Only in the Connection Portal.');
    expect(backendFailureError(error, true).structuredContent).toEqual({
      code: 'published_read_only',
      message: PUBLISHED_READ_ONLY_MESSAGE,
    });
    expect(backendFailureError(error, false).structuredContent).toEqual({
      code: 'not_allowed',
      message: 'Only in the Connection Portal.',
    });
  });
});

describe('ToolRegistry', () => {
  it('lists the registered tools and refuses a name twice', () => {
    const registry = new ToolRegistry();
    registry.registerTool(tool(async () => toolResult({}, '')));
    expect(registry.tools().map((each) => each.name)).toEqual(['probe']);
    expect(() => registry.registerTool(tool(async () => toolResult({}, '')))).toThrow(/twice/);
  });

  it('refuses a caller below the level before any work', async () => {
    const handler = vi.fn(async () => toolResult({}, ''));
    const definition = tool(handler);
    const answer = await new ToolRegistry().call(
      definition,
      { connection: 'x' },
      contextOf(exchangeFor(caller('read'))),
      SERVER
    );
    expect(handler).not.toHaveBeenCalled();
    expect(answer).toMatchObject({
      isError: true,
      structuredContent: {
        code: 'insufficient_access',
        needs_access_level: 'drafts',
        message:
          "Your access is read only. Changing drafts needs the access level 'Read and edit " +
          "drafts'. Ask for it with request_access, or the team member raises it on their user page.",
      },
    });
  });

  it('calls the handler with the caller, the input and a backend with its bearer', async () => {
    const handler = vi.fn(async () => toolResult({ ok: true }, 'Done.'));
    const exchange = exchangeFor(caller('manage'));
    const answer = await new ToolRegistry().call(
      tool(handler),
      { connection: 'x' },
      contextOf(exchange),
      SERVER
    );
    expect(answer).toEqual(toolResult({ ok: true }, 'Done.'));
    expect(handler).toHaveBeenCalledWith(
      exchange.caller,
      { connection: 'x' },
      expect.objectContaining({ server: SERVER })
    );
  });

  it('logs one line per call with the tool and its status, never the input or the token', async () => {
    const exchange = exchangeFor(caller('drafts'));
    await new ToolRegistry().call(
      tool(async () => {
        throw new NotFound('Gone.');
      }),
      { connection: 'secret-input' },
      contextOf(exchange),
      SERVER
    );
    expect(logged).toHaveLength(1);
    expect(JSON.parse(logged[0])).toMatchObject({
      method: 'tools/call',
      tool: 'probe',
      status: 'not_found',
    });
    expect(logged[0]).not.toMatch(/secret/);
    expect(exchange.logged).toBe(true);
  });

  it('answers a reference refusal with its code, and the candidates of an ambiguous name', async () => {
    const registry = new ToolRegistry();
    const candidates = [{ id: 'v-1', name: 'Ambulance', link: 'http://localhost:5173/x' }];
    const ambiguous = await registry.call(
      tool(async () => {
        throw new AmbiguousName('Two variants are called Ambulance.', candidates);
      }),
      { connection: 'x' },
      contextOf(exchangeFor(caller('drafts'))),
      SERVER
    );
    expect(ambiguous.structuredContent).toEqual({
      code: 'ambiguous_name',
      message: 'Two variants are called Ambulance.',
      candidates,
    });
    const foreign = await registry.call(
      tool(async () => {
        throw new ForeignLink();
      }),
      { connection: 'x' },
      contextOf(exchangeFor(caller('drafts'))),
      SERVER
    );
    expect(foreign.structuredContent).toMatchObject({ code: 'foreign_link' });
  });

  it("turns the backend's 401 into the HTTP 401 of the request", async () => {
    const exchange = exchangeFor(caller('drafts'));
    const answer = await new ToolRegistry().call(
      tool(async () => {
        throw new Unauthorized();
      }),
      { connection: 'x' },
      contextOf(exchange),
      SERVER
    );
    expect(exchange.httpAnswer).toMatchObject({ status: 401, body: null });
    expect(exchange.httpAnswer?.headers['WWW-Authenticate']).toMatch(/^Bearer resource_metadata=/);
    expect(answer.structuredContent).toEqual({
      code: 'backend_error',
      message: SIGNED_OUT_MESSAGE,
    });
  });

  it('answers an unexpected error as backend_error and logs a fixed line', async () => {
    const answer = await new ToolRegistry().call(
      tool(async () => {
        throw new TypeError('secret detail');
      }),
      { connection: 'x' },
      contextOf(exchangeFor(caller('drafts'))),
      SERVER
    );
    expect(answer.structuredContent).toEqual({
      code: 'backend_error',
      message: BACKEND_ERROR_MESSAGE,
    });
    expect(logged.join('\n')).not.toMatch(/secret detail/);
  });

  it('answers a call outside /mcp, without a caller, as signed out', async () => {
    const handler = vi.fn(async () => toolResult({}, ''));
    const answer = await new ToolRegistry().call(tool(handler), {}, contextOf(null), SERVER);
    expect(handler).not.toHaveBeenCalled();
    expect(answer.structuredContent).toMatchObject({ code: 'backend_error' });
  });
});
