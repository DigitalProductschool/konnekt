// The MCP server against the fake backend, over Streamable HTTP with the SDK's client (research
// R2, R19): the bearer, the two protocol eras, the sessions, the skills. The tool tests of later
// phases add to this file
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { SkillsClient } from '@modelcontextprotocol/client/ext/skills';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { RunningServer } from '../src/server';
import { BEARERS, type FakeBackend, startFakeBackend } from './fakeBackend';

const SKILL_NAMES = [
  'access-levels',
  'checks-and-tests',
  'conditions',
  'connection-workflow',
  'documents-and-catalog',
  'links',
  'publishing-and-live-connections',
  'variants-and-standard',
];

let fake: FakeBackend;
let running: RunningServer;
let mcpUrl: URL;
let instructions: string;
let metadata: () => unknown;
let metadataUrl: () => string;
let previousBackendUrl: string | undefined;
const clients: Client[] = [];

beforeAll(async () => {
  // The server's log lines would only clutter the test output
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  fake = await startFakeBackend();
  // `config` reads the environment once, when first imported: the server's modules are imported
  // after BACKEND_URL points at the fake
  previousBackendUrl = process.env.BACKEND_URL;
  process.env.BACKEND_URL = fake.url;
  const { startServer } = await import('../src/server');
  ({ instructions } = await import('../src/guidance'));
  ({ protectedResourceMetadata: metadata, resourceMetadataUrl: metadataUrl } =
    await import('../src/auth'));
  running = await startServer({ port: 0, host: '127.0.0.1' });
  mcpUrl = new URL('/mcp', running.url);
});

afterAll(async () => {
  await Promise.allSettled(clients.map((client) => client.close()));
  await running?.close();
  await fake?.close();
  if (previousBackendUrl === undefined) delete process.env.BACKEND_URL;
  else process.env.BACKEND_URL = previousBackendUrl;
  vi.restoreAllMocks();
});

type Era = 'modern' | 'legacy';

async function connect(
  era: Era,
  token: string = BEARERS.read
): Promise<{
  client: Client;
  transport: StreamableHTTPClientTransport;
}> {
  const client = new Client(
    { name: 'server-test', version: '1.0.0' },
    era === 'modern'
      ? { capabilities: {}, versionNegotiation: { mode: 'auto' } }
      : { capabilities: {} }
  );
  const transport = new StreamableHTTPClientTransport(mcpUrl, {
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
  });
  await client.connect(transport);
  clients.push(client);
  return { client, transport };
}

function rpc(
  body: unknown,
  headers: Record<string, string> = {},
  method = 'POST'
): Promise<Response> {
  return fetch(mcpUrl, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...headers,
    },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });
}

const INITIALIZE = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-11-25',
    capabilities: {},
    clientInfo: { name: 'raw', version: '1.0.0' },
  },
};

describe('the HTTP endpoints', () => {
  it('answers GET /health with ok', async () => {
    const response = await fetch(new URL('/health', running.url));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  it.each(['/.well-known/oauth-protected-resource', '/.well-known/oauth-protected-resource/mcp'])(
    'answers %s with the protected resource metadata, without a bearer',
    async (path) => {
      const response = await fetch(new URL(path, running.url));
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('max-age=3600');
      expect(await response.json()).toEqual(metadata());
    }
  );

  it('answers 404 elsewhere', async () => {
    expect((await fetch(new URL('/elsewhere', running.url))).status).toBe(404);
  });
});

describe('the bearer', () => {
  it.each([
    ['no bearer', {}],
    ['an unknown bearer', { Authorization: 'Bearer unknown-token' }],
  ])('%s: 401 with WWW-Authenticate and no body', async (_case, headers) => {
    const response = await rpc(INITIALIZE, headers);
    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toBe(
      `Bearer resource_metadata="${metadataUrl()}"`
    );
    expect(await response.text()).toBe('');
  });

  it.each<Era>(['modern', 'legacy'])(
    'a %s client without a bearer meets the 401 before the SDK answers',
    async (era) => {
      const seen: { status: number; header: string | null; body: string }[] = [];
      const client = new Client(
        { name: 'server-test', version: '1.0.0' },
        era === 'modern' ? { capabilities: {}, versionNegotiation: { mode: 'auto' } } : {}
      );
      const transport = new StreamableHTTPClientTransport(mcpUrl, {
        fetch: async (input, init) => {
          const response = await fetch(input, init);
          seen.push({
            status: response.status,
            header: response.headers.get('www-authenticate'),
            body: await response.clone().text(),
          });
          return response;
        },
      });
      await expect(client.connect(transport)).rejects.toThrow();
      expect(seen.length).toBeGreaterThan(0);
      for (const answer of seen) {
        expect(answer).toEqual({
          status: 401,
          header: expect.stringContaining('resource_metadata='),
          body: '',
        });
      }
    }
  );
});

describe('the protocol eras', () => {
  it('2026-07-28: a client that negotiates connects, with the instructions and capabilities', async () => {
    const { client } = await connect('modern');
    expect(client.getNegotiatedProtocolVersion()).toBe('2026-07-28');
    expect(client.getInstructions()).toBe(instructions);
    expect(client.getServerVersion()?.name).toBe('connection-portal');
    const capabilities = client.getServerCapabilities();
    expect(capabilities?.tools).toBeDefined();
    expect(capabilities?.resources).toBeDefined();
    expect(capabilities?.extensions).toHaveProperty(['io.modelcontextprotocol/skills']);
  });

  it('2025: initialize returns the instructions and the capabilities', async () => {
    const { client, transport } = await connect('legacy');
    expect(client.getNegotiatedProtocolVersion()).toBe('2025-11-25');
    expect(transport.sessionId).toBeTruthy();
    expect(client.getInstructions()).toBe(instructions);
    expect(client.getServerVersion()?.name).toBe('connection-portal');
    const capabilities = client.getServerCapabilities();
    expect(capabilities?.tools).toBeDefined();
    expect(capabilities?.resources).toBeDefined();
    expect(capabilities?.extensions).toHaveProperty(['io.modelcontextprotocol/skills']);
  });

  it.each<Era>(['modern', 'legacy'])('%s: tools/list answers the registry', async (era) => {
    const { tools } = await import('../src/tools');
    const { client } = await connect(era);
    const listed = (await client.listTools()).tools.map((tool) => tool.name);
    expect(listed.sort()).toEqual(
      tools()
        .map((tool) => tool.name)
        .sort()
    );
  });

  it.each<Era>(['modern', 'legacy'])('%s: skills/list answers the eight skills', async (era) => {
    const { client } = await connect(era);
    const listing = await new SkillsClient(client).list();
    const names = listing.skills.map((skill) => skill.frontmatter.name).sort();
    expect(names).toEqual(SKILL_NAMES);
  });
});

describe('the 2025-era sessions', () => {
  it('answers GET /mcp without a session with 405', async () => {
    const response = await rpc(undefined, { Authorization: `Bearer ${BEARERS.read}` }, 'GET');
    expect(response.status).toBe(405);
  });

  it("answers 404 for a session id sent with another caller's bearer", async () => {
    const { transport } = await connect('legacy', BEARERS.read);
    const sessionId = transport.sessionId ?? '';
    const ping = { jsonrpc: '2.0', id: 7, method: 'ping' };
    const headers = { 'Mcp-Session-Id': sessionId, 'Mcp-Protocol-Version': '2025-11-25' };

    const own = await rpc(ping, { ...headers, Authorization: `Bearer ${BEARERS.read}` });
    expect(own.status).toBe(200);
    await own.body?.cancel();

    const other = await rpc(ping, { ...headers, Authorization: `Bearer ${BEARERS.drafts}` });
    expect(other.status).toBe(404);
  });

  it('answers 404 for an unknown session id', async () => {
    const response = await rpc(
      { jsonrpc: '2.0', id: 8, method: 'ping' },
      {
        Authorization: `Bearer ${BEARERS.read}`,
        'Mcp-Session-Id': '00000000-0000-4000-8000-000000000000',
      }
    );
    expect(response.status).toBe(404);
  });
});

describe('the tool wrapper over HTTP', () => {
  let probes: RunningServer;
  let probesUrl: URL;

  beforeAll(async () => {
    const { startServer } = await import('../src/server');
    const { ToolRegistry, toolResult } = await import('../src/tools/registry');
    const { Unauthorized } = await import('../src/backend');
    const { z } = await import('zod');
    // A registry of the tests' own: the server's tools stay those of the tool modules
    const registry = new ToolRegistry();
    registry.registerTool({
      name: 'whoami_probe',
      level: 'read',
      description: 'Answers the caller as resolved for this request',
      input: z.object({}),
      handler: async (caller) =>
        toolResult({ level: caller.accessLevel }, `Level ${caller.accessLevel}.`),
    });
    registry.registerTool({
      name: 'drafts_probe',
      level: 'drafts',
      description: 'Needs the drafts level',
      input: z.object({}),
      handler: async () => toolResult({}, 'Done.'),
    });
    registry.registerTool({
      name: 'signed_out_probe',
      level: 'read',
      description: "Meets the backend's 401",
      input: z.object({}),
      handler: async () => {
        throw new Unauthorized();
      },
    });
    probes = await startServer({ port: 0, host: '127.0.0.1', registry });
    probesUrl = new URL('/mcp', probes.url);
  });

  afterAll(async () => {
    await probes?.close();
  });

  function probeClient(era: Era, token: string, seen: number[] = []) {
    const client = new Client(
      { name: 'server-test', version: '1.0.0' },
      era === 'modern'
        ? { capabilities: {}, versionNegotiation: { mode: 'auto' } }
        : { capabilities: {} }
    );
    const transport = new StreamableHTTPClientTransport(probesUrl, {
      requestInit: { headers: { Authorization: `Bearer ${token}` } },
      fetch: async (input, init) => {
        const response = await fetch(input, init);
        seen.push(response.status);
        return response;
      },
    });
    clients.push(client);
    return { client, transport };
  }

  it.each<Era>(['modern', 'legacy'])('%s: answers with the caller of the request', async (era) => {
    const { client, transport } = probeClient(era, BEARERS.manage);
    await client.connect(transport);
    const answer = await client.callTool({ name: 'whoami_probe', arguments: {} });
    expect(answer.structuredContent).toEqual({ level: 'manage' });
  });

  it.each<Era>(['modern', 'legacy'])(
    '%s: refuses a tool above the caller level with insufficient_access',
    async (era) => {
      const { client, transport } = probeClient(era, BEARERS.read);
      await client.connect(transport);
      const answer = await client.callTool({ name: 'drafts_probe', arguments: {} });
      expect(answer.isError).toBe(true);
      expect(answer.structuredContent).toMatchObject({
        code: 'insufficient_access',
        needs_access_level: 'drafts',
      });
    }
  );

  it("2026-07-28: the backend's 401 during a call answers the HTTP 401", async () => {
    const seen: number[] = [];
    const { client, transport } = probeClient('modern', BEARERS.read, seen);
    await client.connect(transport);
    seen.length = 0;
    await expect(client.callTool({ name: 'signed_out_probe', arguments: {} })).rejects.toThrow();
    expect(seen).toContain(401);
  });

  it("2025: the backend's 401 during a call answers a tool error and ends the session", async () => {
    const { client, transport } = probeClient('legacy', BEARERS.read);
    await client.connect(transport);
    const sessionId = transport.sessionId ?? '';
    const answer = await client.callTool({ name: 'signed_out_probe', arguments: {} });
    expect(answer.isError).toBe(true);
    const next = await fetch(probesUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        Authorization: `Bearer ${BEARERS.read}`,
        'Mcp-Session-Id': sessionId,
        'Mcp-Protocol-Version': '2025-11-25',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 9, method: 'ping' }),
    });
    expect(next.status).toBe(404);
  });
});
