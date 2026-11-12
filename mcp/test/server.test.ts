// The MCP server against the fake backend, over Streamable HTTP with the SDK's client (research
// R2, R19): the bearer, the two protocol eras, the sessions, the skills, and the tools. The tool
// tests of later phases add to this file
import type { ApprovalRequest } from '@connection-portal/api-types/approvals';
import type {
  ActivityEntry,
  Condition,
  FormConnection,
  FormConnectionDraft,
  RuleTreeItem,
} from '@connection-portal/api-types/form-connections';
import { dayNumber } from '@connection-portal/rules/checks/calendar';
import { buildCheckedBranch } from '@connection-portal/rules/checks/checkedTree';
import { checkBranch } from '@connection-portal/rules/checks/findings';
import { todayInGermany } from '@connection-portal/rules/dates';
import {
  addRule,
  addVariant,
  changeRule,
  deleteItem,
  groupItems,
} from '@connection-portal/rules/edits';
import { evaluateBranch } from '@connection-portal/rules/evaluation';
import { rule, target } from '@connection-portal/rules/testData';
import type { EditResult, EditState } from '@connection-portal/rules/types';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { SkillsClient } from '@modelcontextprotocol/client/ext/skills';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from 'vitest';

import type { RunningServer } from '../src/server';
import {
  BEARERS,
  type FakeBackend,
  IDS,
  publishedOf,
  SCHEDULED_START,
  startFakeBackend,
} from './fakeBackend';

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
// The server's log lines, kept for the log line's tests
let errorLog: MockInstance<typeof console.error>;

beforeAll(async () => {
  // The server's log lines would only clutter the test output
  errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
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

describe('the log line (research R18)', () => {
  /** The request log lines written since `mark`, parsed. */
  function linesSince(mark: number): Record<string, unknown>[] {
    return errorLog.mock.calls
      .slice(mark)
      .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>)
      .filter((line) => 'durationMs' in line);
  }

  it('names a tool the server lacks unknown, never with the text the client sent', async () => {
    const mark = errorLog.mock.calls.length;
    const { client } = await connect('modern');
    await expect(
      client.callTool({ name: 'Erika Mustermann', arguments: { birthdate: '1984-01-26' } })
    ).rejects.toThrow();

    await vi.waitFor(() =>
      expect(linesSince(mark)).toContainEqual(
        expect.objectContaining({ method: 'tools/call', tool: 'unknown' })
      )
    );
    const written = JSON.stringify(errorLog.mock.calls.slice(mark));
    expect(written).not.toContain('Erika');
    expect(written).not.toContain('1984-01-26');
    expect(written).not.toContain(BEARERS.read);
  });

  it('logs a method that is no method name as other', async () => {
    const mark = errorLog.mock.calls.length;
    await rpc(
      { jsonrpc: '2.0', id: 1, method: 'Erika Mustermann, 1984-01-26' },
      { Authorization: `Bearer ${BEARERS.read}` }
    );

    await vi.waitFor(() =>
      expect(linesSince(mark)).toContainEqual(expect.objectContaining({ method: 'other' }))
    );
    expect(JSON.stringify(errorLog.mock.calls.slice(mark))).not.toContain('Erika');
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

  it('offers no tool that creates the example, restores or deletes several (FR-068)', async () => {
    const { tools } = await import('../src/tools');
    const names = tools().map((tool) => tool.name);
    expect(names.filter((name) => /example|restore|bulk/.test(name))).toEqual([]);
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
      expect(answer.structuredContent).toEqual({
        code: 'insufficient_access',
        message:
          "Your access is read only. Changing drafts needs the access level 'Read and edit " +
          "drafts'. Ask for it with request_access, or the team member raises it on their user " +
          'page.',
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

// The tools (contracts/mcp-tools.md "Tools")

type Links = typeof import('../src/links');
let links: Links;
const toolClients = new Map<string, Client>();

/** A client per bearer and era, reused across the tool tests. */
async function toolClient(token: string, era: Era): Promise<Client> {
  const key = `${era}:${token}`;
  const known = toolClients.get(key);
  if (known) return known;
  const { client } = await connect(era, token);
  toolClients.set(key, client);
  return client;
}

/** Calls a tool of the server as the caller of `token`. */
async function callTool(
  name: string,
  args: Record<string, unknown>,
  token: string = BEARERS.read,
  era: Era = 'modern'
) {
  const client = await toolClient(token, era);
  const answer = await client.callTool({ name, arguments: args });
  const content = answer.content as { type: string; text?: string }[];
  return {
    isError: answer.isError === true,
    // The tests read the answers' JSON as the contract names it
    structured: answer.structuredContent as Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
    text: content.map((block) => block.text ?? '').join('\n'),
  };
}

function storedDraft(): FormConnectionDraft {
  return fake.store.connections.get(IDS.draft) as FormConnectionDraft;
}

describe('the reading tools', () => {
  beforeAll(async () => {
    links = await import('../src/links');
  });

  afterEach(() => fake.reset());

  describe('search_connections', () => {
    it('answers every connection, the most recently changed first, with links', async () => {
      const { isError, structured, text } = await callTool('search_connections', {});
      expect(isError).toBe(false);
      expect(structured.next_cursor).toBeNull();
      expect(structured.items).toEqual([
        {
          id: IDS.draft,
          name: 'Resident parking permit',
          status: 'draft',
          link: links.connectionLink(IDS.draft),
          description: 'The parking permit for residents of the city centre.',
          updated_at: '2026-11-03T09:00:00Z',
          step: 'rules',
        },
        {
          id: IDS.live,
          name: 'Fishing licence',
          status: 'live',
          link: links.connectionLink(IDS.live),
          updated_at: '2026-11-02T09:00:00Z',
          published_at: '2026-10-01T09:00:00Z',
        },
        {
          id: IDS.deactivated,
          name: 'Dog licence',
          status: 'deactivated',
          link: links.connectionLink(IDS.deactivated),
          updated_at: '2026-11-01T09:00:00Z',
          published_at: '2026-10-01T09:00:00Z',
          deactivated_at: '2026-11-01T09:00:00Z',
        },
        {
          id: IDS.scheduled,
          name: 'Boat licence',
          status: 'scheduled',
          link: links.connectionLink(IDS.scheduled),
          updated_at: '2026-10-31T09:00:00Z',
          start_date: SCHEDULED_START,
          published_at: '2026-10-01T09:00:00Z',
        },
      ]);
      expect(text).toContain(links.connectionLink(IDS.live));
    });

    it('finds the scheduled connections, each with the day it becomes active', async () => {
      const { structured, text } = await callTool('search_connections', { status: 'scheduled' });
      expect(structured.items.map((item: { id: string }) => item.id)).toEqual([IDS.scheduled]);
      expect(structured.items[0]).toMatchObject({ status: 'scheduled', start_date: '2026-12-01' });
      expect(structured.items[0]).not.toHaveProperty('deactivated_at');
      expect(text).toContain(
        `- Connection 'Boat licence' (scheduled from 2026-12-01): ` +
          `${links.connectionLink(IDS.scheduled)}\n  Published 2026-10-01T09:00:00Z.`
      );
      expect(fake.calls.map((call) => call.path)).toContain(
        '/api/form-connections/search?status=scheduled'
      );
      // A deactivated connection has no start: neither status takes the other's rows
      const deactivated = await callTool('search_connections', { status: 'deactivated' });
      expect(deactivated.structured.items.map((item: { id: string }) => item.id)).toEqual([
        IDS.deactivated,
      ]);
    });

    it('leaves start_date out for a draft, a live and a deactivated connection', async () => {
      const { structured } = await callTool('search_connections', {});
      for (const item of structured.items as { id: string }[]) {
        if (item.id !== IDS.scheduled) expect(item).not.toHaveProperty('start_date');
      }
    });

    it("says a draft's step, and when a connection was published and deactivated", async () => {
      storedDraft().step = 'documents';
      const { structured, text } = await callTool('search_connections', {});
      const draft = structured.items.find((item: { id: string }) => item.id === IDS.draft);
      expect(draft.step).toBe('documents');
      expect(draft).not.toHaveProperty('published_at');
      expect(draft).not.toHaveProperty('deactivated_at');
      const live = structured.items.find((item: { id: string }) => item.id === IDS.live);
      expect(live).not.toHaveProperty('step');
      expect(live).not.toHaveProperty('deactivated_at');
      expect(text).toContain('Draft at the documents step.');
      expect(text).toContain('Published 2026-10-01T09:00:00Z.');
      expect(text).toContain('Published 2026-10-01T09:00:00Z; deactivated 2026-11-01T09:00:00Z.');
    });

    it('marks the example example: true while its mark is set, changed or not', async () => {
      for (const example of ['unchanged', 'changed'] as const) {
        storedDraft().example = example;
        storedDraft().step = 'connection';
        const { structured, text } = await callTool('search_connections', {});
        const draft = structured.items.find((item: { id: string }) => item.id === IDS.draft);
        expect(draft).toMatchObject({ step: 'connection', example: true });
        expect(text).toContain('Draft at the connection step. This draft is the example.');
      }
    });

    it('leaves example out of every item that is not the example', async () => {
      const { structured, text } = await callTool('search_connections', {});
      for (const item of structured.items) expect(item).not.toHaveProperty('example');
      expect(text).not.toContain('This draft is the example.');
    });

    it('leaves an empty description out', async () => {
      const { structured } = await callTool('search_connections', { status: 'live' });
      expect(structured.items).toHaveLength(1);
      expect(structured.items[0]).not.toHaveProperty('description');
    });

    it('finds by a part of the name or description, and by status', async () => {
      const byText = await callTool('search_connections', { query: '  CITY centre ' });
      expect(byText.structured.items.map((item: { id: string }) => item.id)).toEqual([IDS.draft]);
      const byStatus = await callTool('search_connections', { status: 'deactivated' });
      expect(byStatus.structured.items.map((item: { id: string }) => item.id)).toEqual([
        IDS.deactivated,
      ]);
      expect(fake.calls.map((call) => call.path)).toContain(
        '/api/form-connections/search?q=CITY+centre'
      );
    });

    it('answers at most 25, and the next page through the cursor', async () => {
      const draft = storedDraft();
      for (let index = 0; index < 25; index += 1) {
        const id = `44444444-4444-4444-8444-${String(index).padStart(12, '0')}`;
        fake.store.connections.set(id, {
          ...draft,
          id,
          name: `Permit ${index}`,
          updated_at: '2026-10-01T09:00:00Z',
        });
      }
      const first = await callTool('search_connections', {});
      expect(first.structured.items).toHaveLength(25);
      expect(first.structured.next_cursor).not.toBeNull();
      expect(first.text).toContain(first.structured.next_cursor);
      const second = await callTool('search_connections', {
        cursor: first.structured.next_cursor,
      });
      expect(second.structured.items).toHaveLength(4);
      expect(second.structured.next_cursor).toBeNull();
    });
  });

  describe('get_connection', () => {
    it("answers a draft's documents, variants and step; its urls are null until published", async () => {
      const { isError, structured, text } = await callTool('get_connection', {
        connection: IDS.draft,
      });
      expect(isError).toBe(false);
      expect(structured).toMatchObject({
        id: IDS.draft,
        name: 'Resident parking permit',
        status: 'draft',
        link: links.connectionLink(IDS.draft),
        description: 'The parking permit for residents of the city centre.',
        documents: [
          {
            document_type: 'pid',
            label: 'Personal ID',
            fields: [
              { key: 'birthdate', label: 'Date of birth', kind: 'date' },
              { key: 'address_locality', label: 'City or town', kind: 'text' },
            ],
          },
        ],
        variants: [
          {
            id: IDS.draftStandard,
            name: 'Standard',
            link: links.variantLink(IDS.draft, IDS.draftStandard),
            origin: 'main',
            rules: 2,
            groups: 0,
          },
          { id: IDS.draftBased, name: 'Ambulance', origin: 'based', rules: 2, groups: 0 },
          { id: IDS.draftEmpty, name: 'Pilot', origin: 'empty', rules: 0, groups: 0 },
        ],
        urls: null,
        urls_note: 'The connection URLs exist once the draft is published.',
        dropped: [],
        step: 'rules',
        draft: { version: 1, step: 'rules', updated_at: '2026-11-03T09:00:00Z' },
      });
      expect(structured).not.toHaveProperty('published_at');
      expect(structured).not.toHaveProperty('active_since');
      expect(structured).not.toHaveProperty('deactivated_since');
      expect(text).toContain(
        'Draft at the rules step. Version 1, last saved 2026-11-03T09:00:00Z.'
      );
      // Counts only, never the rules
      expect(JSON.stringify(structured)).not.toContain('rule-1');
      expect(structured.documents[0].fields[0]).toEqual({
        key: 'birthdate',
        label: 'Date of birth',
        kind: 'date',
      });
      expect(text).toContain('The connection URLs exist once the draft is published.');
      expect(text).toContain(links.variantLink(IDS.draft, IDS.draftBased));
    });

    it("answers a deactivated connection's URLs, which answer unavailable", async () => {
      const { structured, text } = await callTool('get_connection', {
        connection: links.connectionLink(IDS.deactivated),
      });
      expect(structured.status).toBe('deactivated');
      expect(structured.urls).toEqual({
        trigger_url: `https://portal.example/api/connect/${IDS.deactivated}`,
        variants: [
          {
            id: IDS.deactivatedStandard,
            name: 'Standard',
            link: links.variantLink(IDS.deactivated, IDS.deactivatedStandard),
            pull_url:
              `https://portal.example/api/connect/${IDS.deactivated}/branches/` +
              `${IDS.deactivatedStandard}/{reference}`,
          },
        ],
      });
      expect(structured.urls_note).toContain('unavailable');
      expect(structured).not.toHaveProperty('description');
      expect(structured).not.toHaveProperty('draft');
      expect(structured).not.toHaveProperty('step');
      expect(structured).toMatchObject({
        published_at: '2026-10-01T09:00:00Z',
        active_since: '2026-10-01T09:00:00Z',
        deactivated_since: '2026-11-01T09:00:00Z',
      });
      expect(text).toContain(
        'Published 2026-10-01T09:00:00Z; active since 2026-10-01T09:00:00Z; ' +
          'deactivated since 2026-11-01T09:00:00Z.'
      );
      expect(text).toContain('unavailable');
      expect(text).toContain('{reference}');
    });

    it("answers a live connection's published_at and active_since, which reactivating moved", async () => {
      const stored = fake.store.connections.get(IDS.live) as FormConnection;
      fake.store.connections.set(IDS.live, { ...stored, activated_at: '2026-11-05T09:00:00Z' });
      const { structured, text } = await callTool('get_connection', { connection: IDS.live });
      expect(structured).toMatchObject({
        status: 'live',
        published_at: '2026-10-01T09:00:00Z',
        active_since: '2026-11-05T09:00:00Z',
      });
      expect(structured).not.toHaveProperty('deactivated_since');
      expect(structured).not.toHaveProperty('step');
      expect(text).toContain('Published 2026-10-01T09:00:00Z; active since 2026-11-05T09:00:00Z.');
    });

    it("answers a scheduled connection's start_date and URLs, which answer unavailable until then", async () => {
      const { structured, text } = await callTool('get_connection', {
        connection: IDS.scheduled,
      });
      expect(structured).toMatchObject({
        id: IDS.scheduled,
        status: 'scheduled',
        start_date: '2026-12-01',
        published_at: '2026-10-01T09:00:00Z',
        urls: { trigger_url: `https://portal.example/api/connect/${IDS.scheduled}` },
        urls_note:
          'This connection is scheduled: its URLs answer "unavailable" until it becomes active ' +
          'on 2026-12-01, 00:00 in Germany.',
      });
      expect(structured).not.toHaveProperty('active_since');
      expect(structured).not.toHaveProperty('deactivated_since');
      expect(structured).not.toHaveProperty('step');
      expect(text.split('\n')[0]).toBe(
        `Connection 'Boat licence' (scheduled from 2026-12-01): ${links.connectionLink(IDS.scheduled)}`
      );
      expect(text).toContain('Published 2026-10-01T09:00:00Z.');
      expect(text).toContain('until it becomes active on 2026-12-01, 00:00 in Germany.');
      expect(text).not.toContain('{date}');
    });

    it("answers the example's mark as stored, with the text line", async () => {
      for (const example of ['unchanged', 'changed'] as const) {
        storedDraft().example = example;
        const { structured, text } = await callTool('get_connection', { connection: IDS.draft });
        expect(structured).toMatchObject({ status: 'draft', step: 'rules', example });
        expect(text).toContain('This draft is the example.');
      }
    });

    it('leaves example out of a draft that is not the example and of published connections', async () => {
      for (const id of [IDS.draft, IDS.live, IDS.deactivated, IDS.scheduled]) {
        const { structured, text } = await callTool('get_connection', { connection: id });
        expect(structured).not.toHaveProperty('example');
        expect(text).not.toContain('This draft is the example.');
      }
    });

    it('leaves start_date out for a live and a deactivated connection and a draft', async () => {
      for (const id of [IDS.live, IDS.deactivated, IDS.draft]) {
        const { structured } = await callTool('get_connection', { connection: id });
        expect(structured).not.toHaveProperty('start_date');
      }
    });

    it('lists a requested document type the catalog lacks in dropped, by its key', async () => {
      storedDraft().documents.push({
        document_type: 'residence_permit',
        label: 'residence_permit',
        fields: [],
      });
      const { structured, text } = await callTool('get_connection', { connection: IDS.draft });
      expect(structured.dropped).toEqual([
        { document_type: 'residence_permit', field: null, label: 'residence_permit' },
      ]);
      expect(text).toContain(
        'The wallet no longer offers some data of this draft: residence_permit.'
      );
      expect(text).toContain('set_document');
    });

    it('refuses a link to another address', async () => {
      const { isError, structured } = await callTool('get_connection', {
        connection: `https://elsewhere.example/form-connections/${IDS.draft}`,
      });
      expect(isError).toBe(true);
      expect(structured).toEqual({
        code: 'foreign_link',
        message: "This link doesn't belong to Konnekt.",
      });
    });

    it('answers not_found for an unknown connection', async () => {
      const { structured } = await callTool('get_connection', {
        connection: '99999999-9999-4999-8999-999999999999',
      });
      expect(structured.code).toBe('not_found');
    });
  });

  describe('get_activity', () => {
    it("answers a connection's activity, newest first, at the level read", async () => {
      const { isError, structured, text } = await callTool(
        'get_activity',
        { connection: links.connectionLink(IDS.deactivated) },
        BEARERS.read
      );
      expect(isError).toBe(false);
      expect(structured).toEqual({
        connection: {
          id: IDS.deactivated,
          name: expect.any(String),
          status: 'deactivated',
          link: links.connectionLink(IDS.deactivated),
        },
        entries: [
          { at: '2026-11-01T09:00:00Z', event: 'Deactivated', kind: 'deactivated', by: 'anna' },
          { at: '2026-10-01T09:00:00Z', event: 'Published', kind: 'published' },
          { at: '2026-10-01T09:00:00Z', event: 'Created', kind: 'created' },
        ],
      });
      expect(structured).not.toHaveProperty('next_cursor');
      expect(text).toContain('- 2026-11-01T09:00:00Z · Deactivated · anna');
      expect(text).toContain('- 2026-10-01T09:00:00Z · Published\n');
    });

    it('answers an entry without a person without by, and an agent’s with by and agent', async () => {
      const { structured, text } = await callTool('get_activity', { connection: IDS.draft });
      expect(structured.entries).toEqual([
        {
          at: '2026-11-01T09:00:00Z',
          event: 'Created',
          kind: 'created',
          by: 'anna',
          agent: 'Claude Code',
        },
      ]);
      expect(text).toContain('Created · anna with Claude Code');
      const live = await callTool('get_activity', { connection: IDS.live });
      for (const entry of live.structured.entries) {
        expect(entry).not.toHaveProperty('by');
        expect(entry).not.toHaveProperty('agent');
        expect(entry).not.toHaveProperty('approved');
      }
    });

    it('words the variant, the date and an approved request', async () => {
      const entry = (
        kind: ActivityEntry['kind'],
        detail: Partial<ActivityEntry>
      ): ActivityEntry => ({
        id: `${kind}-entry`,
        kind,
        at: '2026-11-06T09:00:00Z',
        variant: null,
        start_date: null,
        actor: null,
        ...detail,
      });
      fake.store.activity.set(IDS.scheduled, [
        entry('scheduled', {
          start_date: '2026-12-01',
          actor: { name: 'ben', agent: 'Claude Code', approved: true },
        }),
        entry('published', { actor: { name: 'ben', agent: 'Claude Code', approved: true } }),
        entry('rules_changed', {
          variant: 'Ambulance',
          actor: { name: 'anna', agent: 'Claude Code', approved: false },
        }),
      ]);
      const { structured, text } = await callTool('get_activity', { connection: IDS.scheduled });
      expect(structured.entries).toEqual([
        {
          at: '2026-11-06T09:00:00Z',
          event: 'Scheduled for 2026-12-01',
          kind: 'scheduled',
          start_date: '2026-12-01',
          by: 'ben',
          agent: 'Claude Code',
          approved: true,
        },
        {
          at: '2026-11-06T09:00:00Z',
          event: 'Published',
          kind: 'published',
          by: 'ben',
          agent: 'Claude Code',
          approved: true,
        },
        {
          at: '2026-11-06T09:00:00Z',
          event: 'Rules changed in Ambulance',
          kind: 'rules_changed',
          variant: 'Ambulance',
          by: 'anna',
          agent: 'Claude Code',
        },
      ]);
      expect(text).toContain('Published · ben, asked by Claude Code');
      expect(text).toContain('Rules changed in Ambulance · anna with Claude Code');
    });

    it('answers 50 entries per page and passes next_cursor on for the earlier ones', async () => {
      const entries: ActivityEntry[] = Array.from({ length: 60 }, (_, index) => ({
        id: `entry-${index}`,
        kind: 'rules_changed',
        at: new Date(Date.UTC(2026, 10, 10, 12, 60 - index)).toISOString(),
        variant: `Variant ${index}`,
        start_date: null,
        actor: { name: 'anna', agent: null, approved: false },
      }));
      fake.store.activity.set(IDS.live, entries);
      const first = await callTool('get_activity', { connection: IDS.live });
      expect(first.structured.entries).toHaveLength(50);
      expect(first.structured.entries[0].event).toBe('Rules changed in Variant 0');
      expect(first.structured.next_cursor).toEqual(expect.any(String));
      expect(first.text).toContain(
        `Earlier entries exist: pass the cursor ${first.structured.next_cursor}.`
      );
      const second = await callTool('get_activity', {
        connection: IDS.live,
        cursor: first.structured.next_cursor,
      });
      expect(second.structured.entries).toHaveLength(10);
      expect(second.structured.entries[0].event).toBe('Rules changed in Variant 50');
      expect(second.structured.entries[9].event).toBe('Rules changed in Variant 59');
      expect(second.structured).not.toHaveProperty('next_cursor');
    });

    it('answers not_found for an unknown connection', async () => {
      const { isError, structured } = await callTool('get_activity', {
        connection: '99999999-9999-4999-8999-999999999999',
      });
      expect(isError).toBe(true);
      expect(structured.code).toBe('not_found');
    });
  });

  describe('get_variant', () => {
    it('shows the marks of a based variant, with its items and citizen fields', async () => {
      const { isError, structured, text } = await callTool('get_variant', {
        connection: IDS.draft,
        variant: ' ambulance ',
      });
      expect(isError).toBe(false);
      expect(structured.connection).toEqual({
        id: IDS.draft,
        name: 'Resident parking permit',
        status: 'draft',
        link: links.connectionLink(IDS.draft),
      });
      expect(structured.variant).toEqual({
        id: IDS.draftBased,
        name: 'Ambulance',
        link: links.variantLink(IDS.draft, IDS.draftBased),
        origin: 'based',
        operator: 'and',
        operator_mark: null,
      });
      expect(structured.items).toMatchObject([
        {
          id: 'rule-1',
          type: 'rule',
          mark: null,
          link: links.itemLink(IDS.draft, IDS.draftBased, 'rule-1'),
          target: { document_type: 'pid', field: 'birthdate' },
        },
        {
          id: 'rule-2',
          type: 'rule',
          mark: 'changed',
          condition: { operator: 'equal_to', value: 'Esslingen' },
          message: 'You must live in Esslingen.',
        },
      ]);
      // The statement in the design's form: "·" after the document (spec 008 C3)
      expect(structured.items[1].statement).toBe(
        'Personal ID · City or town is equal to "Esslingen", ignoring letter case'
      );
      expect(structured.applicant_fields.map((field: { key: string }) => field.key).sort()).toEqual(
        ['pid.address_locality', 'pid.birthdate']
      );
      expect(structured.unrequested_rules).toEqual([]);
      expect(text).toContain('changed');
      expect(text).toContain(links.itemLink(IDS.draft, IDS.draftBased, 'rule-2'));
    });

    it('answers the candidates with their links for an ambiguous name', async () => {
      storedDraft().branches[2].name = 'AMBULANCE';
      const { isError, structured } = await callTool('get_variant', {
        connection: IDS.draft,
        variant: 'Ambulance',
      });
      expect(isError).toBe(true);
      expect(structured.code).toBe('ambiguous_name');
      expect(structured.candidates).toEqual([
        {
          id: IDS.draftBased,
          name: 'Ambulance',
          link: links.variantLink(IDS.draft, IDS.draftBased),
        },
        {
          id: IDS.draftEmpty,
          name: 'AMBULANCE',
          link: links.variantLink(IDS.draft, IDS.draftEmpty),
        },
      ]);
      expect(structured.message).toContain(links.variantLink(IDS.draft, IDS.draftEmpty));
    });

    it('refuses a link that names another connection', async () => {
      const { isError, structured } = await callTool('get_variant', {
        connection: IDS.draft,
        variant: links.variantLink(IDS.live, IDS.liveStandard),
      });
      expect(isError).toBe(true);
      expect(structured).toEqual({
        code: 'not_found',
        message: 'This link names another connection.',
      });
    });
  });

  describe('get_item', () => {
    it('answers a rule with its view and no group', async () => {
      const { structured, text } = await callTool('get_item', {
        connection: IDS.draft,
        variant: links.variantLink(IDS.draft, IDS.draftBased),
        item: 'rule-2',
      });
      expect(structured.connection.id).toBe(IDS.draft);
      expect(structured.variant).toEqual({
        id: IDS.draftBased,
        name: 'Ambulance',
        link: links.variantLink(IDS.draft, IDS.draftBased),
      });
      expect(structured.item).toMatchObject({ id: 'rule-2', mark: 'changed' });
      expect(structured.in_group).toBeNull();
      expect(text).toContain('You must live in Esslingen.');
    });

    it('names the group a rule sits in', async () => {
      const standard = storedDraft().branches[0];
      const group: RuleTreeItem = {
        type: 'group',
        id: 'group-1',
        name: 'Group 01',
        mark: null,
        operator: 'or',
        message: null,
        items: standard.items,
      };
      standard.items = [group];
      const { structured } = await callTool('get_item', {
        connection: IDS.draft,
        variant: 'Standard',
        item: 'rule 02',
      });
      expect(structured.item.id).toBe('rule-2');
      expect(structured.in_group).toEqual({
        id: 'group-1',
        type: 'group',
        name: 'Group 01',
        link: links.itemLink(IDS.draft, IDS.draftStandard, 'group-1'),
      });
    });

    it('answers not_found for a rule the variant lacks', async () => {
      const { structured } = await callTool('get_item', {
        connection: IDS.draft,
        variant: 'Pilot',
        item: 'rule-1',
      });
      expect(structured).toEqual({
        code: 'not_found',
        message: 'This rule or group no longer exists.',
      });
    });
  });
});

describe('the catalog tools', () => {
  it('get_catalog lists the document types with their number of fields', async () => {
    const { structured } = await callTool('get_catalog', {});
    expect(structured).toEqual({
      document_types: fake.store.documentTypes.map((type) => ({
        key: type.key,
        label: type.label,
        fields: type.fields.length,
      })),
    });
  });

  it("get_catalog answers pid's fields with their parts and conditions", async () => {
    const { structured, text } = await callTool('get_catalog', { document_type: 'pid' });
    expect(structured.key).toBe('pid');
    expect(structured.label).toBe('Personal ID');
    const fields = structured.fields as { key: string }[];
    const field = (key: string) => fields.find((each) => each.key === key);
    expect(field('family_name')).toEqual({
      key: 'family_name',
      label: 'Family name',
      kind: 'text',
      group: 'Name',
      multiple_values: false,
      conditions: [
        { operator: 'equal_to', words: 'is equal to', input: 'text' },
        { operator: 'not_equal_to', words: 'is not equal to', input: 'text' },
        { operator: 'contains', words: 'contains', input: 'text' },
        { operator: 'not_contains', words: 'doesn’t contain', input: 'text' },
      ],
    });
    expect(field('birthdate')).toMatchObject({
      kind: 'date',
      conditions: expect.arrayContaining([
        { operator: 'at_least_years_ago', words: 'is at least', input: 'years' },
      ]),
    });
    expect(field('nationalities')).toMatchObject({
      kind: 'enum',
      option_set: 'countries',
      multiple_values: true,
    });
    expect(field('picture')).toMatchObject({ kind: 'image', conditions: [] });
    expect(field('place_of_birth')).toMatchObject({
      kind: 'parts',
      conditions: [],
      parts: [
        {
          key: 'country',
          label: 'Country',
          kind: 'enum',
          option_set: 'countries',
          per_licence_class: false,
          multiple_values: false,
          conditions: [
            { operator: 'includes_one_of', words: 'includes one of', input: 'values' },
            { operator: 'includes_none_of', words: 'includes none of', input: 'values' },
          ],
        },
        { key: 'region', kind: 'text' },
        { key: 'locality', kind: 'text' },
      ],
    });
    expect(text).toContain('place_of_birth.country');
  });

  it("get_catalog gives each of pid's fields its data group and the groups in Konnekt's order", async () => {
    const { structured, text } = await callTool('get_catalog', { document_type: 'pid' });
    expect(structured.groups).toEqual(['Name', 'Birth', 'Address', 'Document', 'Other details']);
    const fields = structured.fields as { key: string; group?: string }[];
    // The fields stay in catalog order; each carries its group's English name
    expect(fields.map((field) => field.key)).toEqual(
      fake.store.documentTypes[0].fields.map((field) => field.key)
    );
    const groupOf = (key: string) => fields.find((each) => each.key === key)?.group;
    expect(groupOf('family_name')).toBe('Name');
    expect(groupOf('nationalities')).toBe('Birth');
    expect(groupOf('address_country')).toBe('Address');
    expect(groupOf('date_of_expiry')).toBe('Document');
    expect(groupOf('picture')).toBe('Other details');
    expect(fields.every((field) => typeof field.group === 'string')).toBe(true);
    expect(text).toContain('- family_name: Family name (text, group Name)');
    expect(text).toContain(
      "Its data groups, in Konnekt's order: Name, Birth, Address, Document, Other details."
    );
  });

  it('get_catalog gives a document without data groups no group and an empty groups', async () => {
    const { structured, text } = await callTool('get_catalog', { document_type: 'mdl' });
    expect(structured.groups).toEqual([]);
    const fields = structured.fields as Record<string, unknown>[];
    expect(fields.length).toBe(10);
    expect(fields.every((field) => !('group' in field))).toBe(true);
    expect(text).not.toContain('data groups');
    expect(text).not.toContain('group ');
  });

  it('get_catalog lists the document types without their groups', async () => {
    const { structured } = await callTool('get_catalog', {});
    const types = structured.document_types as Record<string, unknown>[];
    expect(types.every((type) => !('groups' in type))).toBe(true);
  });

  it('no document tool takes a data group: set_document still takes the fields one by one', async () => {
    const { client } = await connect('modern');
    const { tools } = await client.listTools();
    const propertiesOf = (name: string) =>
      tools.find((tool) => tool.name === name)?.inputSchema.properties ?? {};
    for (const name of ['get_catalog', 'set_document', 'move_document']) {
      expect(Object.keys(propertiesOf(name)).filter((key) => key.includes('group'))).toEqual([]);
    }
    expect(Object.keys(propertiesOf('set_document')).sort()).toEqual([
      'also_remove_rules',
      'connection',
      'document_type',
      'fields',
    ]);
  });

  it('get_catalog refuses an unknown document type with the known keys', async () => {
    const { isError, structured } = await callTool('get_catalog', { document_type: 'passport' });
    expect(isError).toBe(true);
    expect(structured.code).toBe('not_found');
    expect(structured.message).toContain('pid, mdl');
  });

  it('search_values finds the countries matching "ger" on one page', async () => {
    const { structured } = await callTool('search_values', {
      option_set: 'countries',
      query: 'GER',
    });
    expect(structured).toEqual({
      items: [
        { value: 'DE', label: 'Germany' },
        { value: 'DZ', label: 'Algeria' },
        { value: 'NE', label: 'Niger' },
        { value: 'NG', label: 'Nigeria' },
      ],
      next_cursor: null,
    });
  });

  it('search_values answers 25 per page, and the second page through the cursor', async () => {
    const first = await callTool('search_values', { option_set: 'countries' });
    expect(first.structured.items).toHaveLength(25);
    expect(first.structured.next_cursor).not.toBeNull();
    const second = await callTool('search_values', {
      option_set: 'countries',
      cursor: first.structured.next_cursor,
    });
    const total = fake.store.optionSets.find((set) => set.key === 'countries')?.options.length;
    expect(second.structured.items).toHaveLength((total ?? 0) - 25);
    expect(second.structured.items[0]).toEqual(
      expect.objectContaining({ value: expect.any(String) })
    );
    expect(second.structured.next_cursor).toBeNull();
  });

  it('search_values matches the code and keeps a description', async () => {
    const { structured } = await callTool('search_values', {
      option_set: 'licence_classes',
      query: 'be',
    });
    expect(structured.items).toEqual([
      { value: 'BE', label: 'BE', description: 'Car with a heavy trailer' },
    ]);
  });

  it('search_values refuses an unknown value set', async () => {
    const { isError, structured } = await callTool('search_values', { option_set: 'planets' });
    expect(isError).toBe(true);
    expect(structured.code).toBe('not_found');
    expect(structured.message).toContain('countries');
  });
});

describe('request_access', () => {
  const STEP_UP =
    'Bearer error="insufficient_scope", scope="read drafts", error_description="Changing ' +
    "drafts needs the access level 'Read and edit drafts'. Reconnect with that level, or ask " +
    'the team member to raise it on their user page."';

  it('2025: the read caller asking for drafts gets HTTP 403 with the step-up header', async () => {
    const { transport } = await connect('legacy', BEARERS.read);
    const response = await rpc(
      {
        jsonrpc: '2.0',
        id: 11,
        method: 'tools/call',
        params: { name: 'request_access', arguments: { level: 'drafts' } },
      },
      {
        Authorization: `Bearer ${BEARERS.read}`,
        'Mcp-Session-Id': transport.sessionId ?? '',
        'Mcp-Protocol-Version': '2025-11-25',
      }
    );
    expect(response.status).toBe(403);
    expect(response.headers.get('www-authenticate')).toBe(STEP_UP);
    expect(await response.text()).toBe('');
  });

  it('2026-07-28: the read caller asking for manage gets HTTP 403 with the step-up header', async () => {
    const seen: { status: number; header: string | null }[] = [];
    const client = new Client(
      { name: 'server-test', version: '1.0.0' },
      { capabilities: {}, versionNegotiation: { mode: 'auto' } }
    );
    const transport = new StreamableHTTPClientTransport(mcpUrl, {
      requestInit: { headers: { Authorization: `Bearer ${BEARERS.read}` } },
      fetch: async (input, init) => {
        const response = await fetch(input, init);
        seen.push({ status: response.status, header: response.headers.get('www-authenticate') });
        return response;
      },
    });
    clients.push(client);
    await client.connect(transport);
    seen.length = 0;
    await expect(
      client.callTool({ name: 'request_access', arguments: { level: 'manage' } })
    ).rejects.toThrow();
    expect(seen[0]).toEqual({
      status: 403,
      header:
        'Bearer error="insufficient_scope", scope="read drafts manage", error_description=' +
        '"Deactivating, reactivating and deleting published connections needs the access level ' +
        "'Read, edit drafts and manage live connections'. Reconnect with that level, or ask the " +
        'team member to raise it on their user page."',
    });
  });

  it.each<Era>(['modern', 'legacy'])(
    '%s: a caller who has the level reads that they have it',
    async (era) => {
      const { isError, structured, text } = await callTool(
        'request_access',
        { level: 'drafts' },
        BEARERS.drafts,
        era
      );
      expect(isError).toBe(false);
      expect(structured).toEqual({
        access_level: 'drafts',
        message: "You already have 'Read and edit drafts'.",
      });
      expect(text).toBe("You already have 'Read and edit drafts'.");
    }
  );

  it('the manage caller asking for drafts has it already', async () => {
    const { structured } = await callTool('request_access', { level: 'drafts' }, BEARERS.manage);
    expect(structured.access_level).toBe('manage');
  });
});

describe('the guidance (get_guide and the Skills extension)', () => {
  it.each<Era>(['modern', 'legacy'])(
    '%s: get_guide without a topic lists the eight topics with their descriptions',
    async (era) => {
      const { skills } = await import('../src/guidance');
      const { isError, structured, text } = await callTool('get_guide', {}, BEARERS.read, era);
      expect(isError).toBe(false);
      expect(structured).toEqual({
        topics: skills().map(({ name, description }) => ({ name, description })),
      });
      expect(structured.topics.map((topic: { name: string }) => topic.name)).toEqual(SKILL_NAMES);
      expect(text).toContain('- conditions: ');
    }
  );

  it.each<Era>(['modern', 'legacy'])(
    '%s: skills/get and resources/read answer the text of get_guide(topic)',
    async (era) => {
      const { client } = await connect(era);
      const skillsClient = new SkillsClient(client);
      for (const name of SKILL_NAMES) {
        const uri = `skill://${name}/SKILL.md`;
        const { structured, text } = await callTool(
          'get_guide',
          { topic: name },
          BEARERS.read,
          era
        );
        expect(structured.topic).toBe(name);
        expect(text).toBe(structured.text);
        const { skill } = await skillsClient.get(uri);
        expect(skill.uri).toBe(uri);
        expect(skill.frontmatter.name).toBe(name);
        expect((await skillsClient.read(skill)).text).toBe(structured.text);
        const read = await client.readResource({ uri });
        expect(read.contents).toEqual([
          expect.objectContaining({ uri, mimeType: 'text/markdown', text: structured.text }),
        ]);
      }
    }
  );

  it.each<Era>(['modern', 'legacy'])(
    '%s: resources/list lists the eight SKILL.md files and nothing else',
    async (era) => {
      const { client } = await connect(era);
      const { resources } = await client.listResources();
      expect(resources.map((resource) => resource.uri).sort()).toEqual(
        SKILL_NAMES.map((name) => `skill://${name}/SKILL.md`)
      );
    }
  );

  it('get_guide answers an unknown topic with validation and the list of topics', async () => {
    const { isError, structured, text } = await callTool('get_guide', { topic: 'publishing' });
    expect(isError).toBe(true);
    const message = `The guide has no topic 'publishing'. Its topics: ${SKILL_NAMES.join(', ')}.`;
    expect(structured).toEqual({ code: 'validation', message });
    expect(text).toBe(message);
  });
});

describe('the draft tools', () => {
  beforeAll(async () => {
    links = await import('../src/links');
  });

  afterEach(() => fake.reset());

  const PUBLISHED_READ_ONLY = {
    code: 'published_read_only',
    message:
      'The content of a published connection is changed in Konnekt. Agents can ' +
      'only change drafts.',
  };

  function variantNames(): string[] {
    return storedDraft().branches.map((branch) => branch.name);
  }

  describe('create_draft', () => {
    it('creates a draft with Standard and no documents, at the connection step', async () => {
      const { isError, structured, text } = await callTool(
        'create_draft',
        { name: 'Fishing permit', description: 'Form 4711' },
        BEARERS.drafts
      );
      expect(isError).toBe(false);
      const id = structured.connection.id as string;
      const draft = fake.store.connections.get(id) as FormConnectionDraft;
      expect(draft).toMatchObject({
        status: 'draft',
        name: 'Fishing permit',
        description: 'Form 4711',
        documents: [],
        step: 'connection',
        version: 1,
      });
      expect(draft.branches).toEqual([
        {
          id: expect.stringMatching(/^[0-9a-f-]{36}$/),
          name: 'Standard',
          description: null,
          origin: 'main',
          operator: 'and',
          operator_mark: null,
          items: [],
        },
      ]);
      const standardId = draft.branches[0].id ?? '';
      expect(structured).toEqual({
        connection: {
          id,
          name: 'Fishing permit',
          status: 'draft',
          link: links.connectionLink(id),
        },
        variants: [{ id: standardId, name: 'Standard', link: links.variantLink(id, standardId) }],
      });
      expect(text).toContain(links.connectionLink(id));
      expect(text).toContain('at the connection step');
    });

    it("answers rate_limited with the backend's message once the hourly limit is reached", async () => {
      fake.store.draftsCreated.set(BEARERS.drafts, 20);
      const { isError, structured } = await callTool(
        'create_draft',
        { name: 'Fishing permit' },
        BEARERS.drafts
      );
      expect(isError).toBe(true);
      expect(structured).toEqual({
        code: 'rate_limited',
        message: 'This agent can create drafts again at 15:40.',
      });
    });

    it.each(['create_draft', 'add_variant'])(
      "refuses the read caller %s, naming 'Read and edit drafts'",
      async (tool) => {
        const { isError, structured } = await callTool(
          tool,
          { connection: IDS.draft, name: 'Night shift', origin: 'empty' },
          BEARERS.read
        );
        expect(isError).toBe(true);
        expect(structured).toEqual({
          code: 'insufficient_access',
          message:
            "Your access is read only. Changing drafts needs the access level 'Read and edit " +
            "drafts'. Ask for it with request_access, or the team member raises it on their " +
            'user page.',
          needs_access_level: 'drafts',
        });
        expect(fake.calls.filter((call) => call.method !== 'GET')).toEqual([]);
      }
    );
  });

  describe('update_connection', () => {
    it('renames the draft and clears its description', async () => {
      const { isError, structured, text } = await callTool(
        'update_connection',
        { connection: links.connectionLink(IDS.draft), name: 'Parking permit', description: null },
        BEARERS.drafts
      );
      expect(isError).toBe(false);
      expect(structured).toEqual({
        connection: {
          id: IDS.draft,
          name: 'Parking permit',
          status: 'draft',
          link: links.connectionLink(IDS.draft),
        },
      });
      expect(storedDraft()).toMatchObject({
        name: 'Parking permit',
        description: '',
        version: 2,
        step: 'rules',
      });
      expect(text).toContain('Saved as draft version 2, at the rules step.');
    });

    it("refuses a description over 500 characters with the server's message", async () => {
      const { isError, structured } = await callTool(
        'update_connection',
        { connection: IDS.draft, description: 'x'.repeat(600) },
        BEARERS.drafts
      );
      expect(isError).toBe(true);
      expect(structured).toEqual({
        code: 'validation',
        message: 'The description can have at most 500 characters.',
      });
      expect(storedDraft().version).toBe(1);
    });

    it('refuses a published connection, also at manage level', async () => {
      const { isError, structured } = await callTool(
        'update_connection',
        { connection: IDS.live, name: 'Renamed' },
        BEARERS.manage
      );
      expect(isError).toBe(true);
      expect(structured).toEqual(PUBLISHED_READ_ONLY);
      expect(fake.calls.filter((call) => call.method === 'PUT')).toEqual([]);
    });

    it('applies the change to the draft another save stored in between', async () => {
      fake.beforeNextDraftSave((draft) => {
        fake.store.connections.set(draft.id, {
          ...draft,
          description: 'Changed in Konnekt',
          version: draft.version + 1,
        });
      });
      const { isError } = await callTool(
        'update_connection',
        { connection: IDS.draft, name: 'Parking permit' },
        BEARERS.drafts
      );
      expect(isError).toBe(false);
      expect(storedDraft()).toMatchObject({
        name: 'Parking permit',
        description: 'Changed in Konnekt',
        version: 3,
      });
    });
  });

  describe('set_document', () => {
    it('adds a document with its fields in catalog order, at the documents step', async () => {
      const created = await callTool('create_draft', { name: 'Fishing permit' }, BEARERS.drafts);
      const id = created.structured.connection.id as string;
      const { isError, structured, text } = await callTool(
        'set_document',
        { connection: id, document_type: 'pid', fields: ['nationalities', 'birthdate'] },
        BEARERS.drafts
      );
      expect(isError).toBe(false);
      expect(structured.documents).toEqual([
        {
          document_type: 'pid',
          label: 'Personal ID',
          fields: [
            { key: 'birthdate', label: 'Date of birth', kind: 'date' },
            { key: 'nationalities', label: 'Nationality', kind: 'enum' },
          ],
        },
      ]);
      expect(structured.removed_rules).toEqual([]);
      expect((fake.store.connections.get(id) as FormConnectionDraft).step).toBe('documents');
      expect(text).toContain('at the documents step');
    });

    it('adds a document at the end, not in catalog order, and the fake stores that order', async () => {
      // The catalog lists pid before mdl
      const created = await callTool('create_draft', { name: 'Fishing permit' }, BEARERS.drafts);
      const id = created.structured.connection.id as string;
      await callTool(
        'set_document',
        { connection: id, document_type: 'mdl', fields: [] },
        BEARERS.drafts
      );
      const { isError, structured, text } = await callTool(
        'set_document',
        { connection: id, document_type: 'pid', fields: ['birthdate'] },
        BEARERS.drafts
      );
      expect(isError).toBe(false);
      expect(
        structured.documents.map((document: { document_type: string }) => document.document_type)
      ).toEqual(['mdl', 'pid']);
      const stored = fake.store.connections.get(id) as FormConnectionDraft;
      expect(stored.documents.map((document) => document.document_type)).toEqual(['mdl', 'pid']);
      expect(text).toContain(
        '1. Driving licence (mdl): no fields yet\n2. Personal ID (pid): birthdate'
      );
    });

    it('keeps the place of a document whose fields change, and the order of the others on a removal', async () => {
      const created = await callTool('create_draft', { name: 'Fishing permit' }, BEARERS.drafts);
      const id = created.structured.connection.id as string;
      const set = (document_type: string, fields: string[] | null) =>
        callTool('set_document', { connection: id, document_type, fields }, BEARERS.drafts);
      await set('mdl', []);
      await set('pid', ['birthdate']);
      const changed = await set('mdl', ['issue_date']);
      expect(changed.isError).toBe(false);
      expect(
        changed.structured.documents.map(
          (document: { document_type: string; fields: unknown[] }) => [
            document.document_type,
            document.fields.length,
          ]
        )
      ).toEqual([
        ['mdl', 1],
        ['pid', 1],
      ]);
      const removed = await set('mdl', null);
      expect(removed.isError).toBe(false);
      expect(
        removed.structured.documents.map(
          (document: { document_type: string }) => document.document_type
        )
      ).toEqual(['pid']);
    });

    it('refuses an unknown field with the known ones', async () => {
      const { isError, structured } = await callTool(
        'set_document',
        { connection: IDS.draft, document_type: 'pid', fields: ['eye_colour'] },
        BEARERS.drafts
      );
      expect(isError).toBe(true);
      expect(structured.code).toBe('validation');
      expect(structured.message).toMatch(/^Unknown field 'eye_colour' for 'Personal ID'\. /);
    });

    it('refuses to stop requesting data that rules check, then removes them with also_remove_rules', async () => {
      const input = { connection: IDS.draft, document_type: 'pid', fields: ['birthdate'] };
      const refused = await callTool('set_document', input, BEARERS.drafts);
      expect(refused.isError).toBe(true);
      expect(refused.structured).toEqual({
        code: 'validation',
        message:
          '2 rules check City or town: Rule 02 in Standard, Rule 02 in Ambulance. Pass ' +
          'also_remove_rules: true to remove these rules in every variant too, or change these ' +
          'rules first.',
      });
      expect(storedDraft().version).toBe(1);

      const { isError, structured } = await callTool(
        'set_document',
        { ...input, also_remove_rules: true },
        BEARERS.drafts
      );
      expect(isError).toBe(false);
      expect(structured.removed_rules).toEqual([
        {
          id: 'rule-2',
          type: 'rule',
          name: 'Rule 02',
          link: links.itemLink(IDS.draft, IDS.draftStandard, 'rule-2'),
        },
        {
          id: 'rule-2',
          type: 'rule',
          name: 'Rule 02',
          link: links.itemLink(IDS.draft, IDS.draftBased, 'rule-2'),
        },
      ]);
      const draft = storedDraft();
      expect(draft.documents[0].fields.map((field) => field.key)).toEqual(['birthdate']);
      expect(
        draft.branches.map((branch) => branch.items.map((item: RuleTreeItem) => item.id))
      ).toEqual([['rule-1'], ['rule-1'], []]);
      expect(draft.step).toBe('rules');
    });

    it('removes a document the catalog dropped, which the server refuses to save', async () => {
      const draft = storedDraft();
      fake.store.connections.set(IDS.draft, {
        ...draft,
        documents: [
          ...draft.documents,
          { document_type: 'eye_test', label: 'eye_test', fields: [] },
        ],
      });
      const refused = await callTool(
        'add_variant',
        { connection: IDS.draft, name: 'Night shift', origin: 'empty' },
        BEARERS.drafts
      );
      expect(refused.structured).toEqual({
        code: 'validation',
        message: "Unknown document type 'eye_test'.",
      });
      const { isError, structured } = await callTool(
        'set_document',
        { connection: IDS.draft, document_type: 'eye_test', fields: null },
        BEARERS.drafts
      );
      expect(isError).toBe(false);
      expect(
        structured.documents.map((document: { document_type: string }) => document.document_type)
      ).toEqual(['pid']);
    });
  });

  describe('move_document', () => {
    /** The fixture draft with two documents: pid, then mdl added at the end (version 2). */
    async function withTwoDocuments(): Promise<void> {
      const added = await callTool(
        'set_document',
        { connection: IDS.draft, document_type: 'mdl', fields: ['issue_date'] },
        BEARERS.drafts
      );
      expect(added.isError).toBe(false);
    }

    function storedOrder(): string[] {
      return storedDraft().documents.map((document) => document.document_type);
    }

    it('moves the second document to the first place and answers the new order (US8-AS2)', async () => {
      await withTwoDocuments();
      const { isError, structured, text } = await callTool(
        'move_document',
        { connection: links.connectionLink(IDS.draft), document_type: 'mdl', position: 1 },
        BEARERS.drafts
      );
      expect(isError).toBe(false);
      expect(structured).toEqual({
        connection: {
          id: IDS.draft,
          name: 'Resident parking permit',
          status: 'draft',
          link: links.connectionLink(IDS.draft),
        },
        documents: [
          {
            document_type: 'mdl',
            label: 'Driving licence',
            fields: [{ key: 'issue_date', label: 'Issue date', kind: 'date' }],
          },
          {
            document_type: 'pid',
            label: 'Personal ID',
            fields: [
              { key: 'birthdate', label: 'Date of birth', kind: 'date' },
              { key: 'address_locality', label: 'City or town', kind: 'text' },
            ],
          },
        ],
      });
      // The same stored result as the editor's move: the order sent, the rest unchanged
      expect(storedOrder()).toEqual(['mdl', 'pid']);
      expect(storedDraft()).toMatchObject({ version: 3, step: 'rules' });
      expect(storedDraft().branches.map((branch) => branch.items.length)).toEqual([2, 2, 0]);
      expect(text).toContain('Moved Driving licence (mdl) to position 1 of 2.');
      expect(text).toContain('1. Driving licence (mdl): issue_date\n2. Personal ID (pid):');
      expect(text).toContain('Saved as draft version 3, at the rules step.');

      const back = await callTool(
        'move_document',
        { connection: IDS.draft, document_type: 'mdl', position: 2 },
        BEARERS.drafts
      );
      expect(back.isError).toBe(false);
      expect(storedOrder()).toEqual(['pid', 'mdl']);
    });

    it.each([
      [
        'a document the draft does not request',
        { document_type: 'eye_test', position: 1 },
        { code: 'not_found', message: 'The connection doesn’t request “eye_test”.' },
      ],
      [
        'a position after the last',
        { document_type: 'mdl', position: 3 },
        { code: 'validation', message: 'Choose a position from 1 to 2.' },
      ],
      [
        'a position before the first',
        { document_type: 'mdl', position: 0 },
        { code: 'validation', message: 'Choose a position from 1 to 2.' },
      ],
      [
        'a position that is no whole number',
        { document_type: 'mdl', position: 1.5 },
        { code: 'validation', message: 'Choose a position from 1 to 2.' },
      ],
      [
        'the place the document already has',
        { document_type: 'mdl', position: 2 },
        { code: 'validation', message: '“mdl” is already in position 2.' },
      ],
    ])("refuses %s with the editor's message and saves nothing", async (_case, args, error) => {
      await withTwoDocuments();
      const { isError, structured } = await callTool(
        'move_document',
        { connection: IDS.draft, ...args },
        BEARERS.drafts
      );
      expect(isError).toBe(true);
      expect(structured).toEqual(error);
      expect(storedDraft().version).toBe(2);
      expect(storedOrder()).toEqual(['pid', 'mdl']);
    });

    it('refuses a published connection, also at manage level', async () => {
      const { isError, structured } = await callTool(
        'move_document',
        { connection: IDS.live, document_type: 'pid', position: 1 },
        BEARERS.manage
      );
      expect(isError).toBe(true);
      expect(structured).toEqual(PUBLISHED_READ_ONLY);
      expect(fake.calls.filter((call) => call.method === 'PUT')).toEqual([]);
    });

    it("refuses the read caller, naming 'Read and edit drafts'", async () => {
      const { isError, structured } = await callTool(
        'move_document',
        { connection: IDS.draft, document_type: 'pid', position: 1 },
        BEARERS.read
      );
      expect(isError).toBe(true);
      expect(structured).toMatchObject({
        code: 'insufficient_access',
        needs_access_level: 'drafts',
      });
      expect(fake.calls.filter((call) => call.method !== 'GET')).toEqual([]);
    });
  });

  describe('add_variant', () => {
    it('adds a variant based on Standard with an id of its own', async () => {
      const { isError, structured } = await callTool(
        'add_variant',
        { connection: IDS.draft, name: 'Night shift', origin: 'based', description: 'At night' },
        BEARERS.drafts
      );
      expect(isError).toBe(false);
      const added = storedDraft().branches[3];
      expect(added).toMatchObject({
        name: 'Night shift',
        description: 'At night',
        origin: 'based',
        items: storedDraft().branches[0].items,
      });
      expect(structured.variant).toEqual({
        id: added.id,
        name: 'Night shift',
        link: links.variantLink(IDS.draft, added.id ?? ''),
      });
    });

    it("refuses a name taken with the editor's message and leaves the draft unchanged", async () => {
      const { isError, structured } = await callTool(
        'add_variant',
        { connection: IDS.draft, name: ' ambulance ', origin: 'empty' },
        BEARERS.drafts
      );
      expect(isError).toBe(true);
      expect(structured).toEqual({
        code: 'validation',
        message: 'There’s already a variant called "Ambulance".',
      });
      expect(storedDraft().version).toBe(1);
      expect(variantNames()).toEqual(['Standard', 'Ambulance', 'Pilot']);
    });

    it('refuses a change to a published connection', async () => {
      const { structured } = await callTool(
        'add_variant',
        { connection: IDS.deactivated, name: 'Night shift', origin: 'empty' },
        BEARERS.manage
      );
      expect(structured).toEqual(PUBLISHED_READ_ONLY);
    });
  });

  describe('update_variant', () => {
    it("renames a variant and switches its top level's AND/OR", async () => {
      const { isError, structured, text } = await callTool(
        'update_variant',
        { connection: IDS.draft, variant: 'Ambulance', name: 'Rescue service', operator: 'or' },
        BEARERS.drafts
      );
      expect(isError).toBe(false);
      expect(structured).toEqual({
        connection: expect.objectContaining({ id: IDS.draft }),
        variant: {
          id: IDS.draftBased,
          name: 'Rescue service',
          link: links.variantLink(IDS.draft, IDS.draftBased),
        },
      });
      expect(storedDraft().branches[1]).toMatchObject({
        name: 'Rescue service',
        operator: 'or',
        operator_mark: 'changed',
      });
      expect(text).toContain("Top level: OR (changed from Standard's).");
    });

    it("resets a based variant's AND/OR to Standard's", async () => {
      await callTool(
        'update_variant',
        { connection: IDS.draft, variant: IDS.draftBased, operator: 'or' },
        BEARERS.drafts
      );
      const { isError } = await callTool(
        'update_variant',
        { connection: IDS.draft, variant: IDS.draftBased, reset_operator: true },
        BEARERS.drafts
      );
      expect(isError).toBe(false);
      expect(storedDraft().branches[1]).toMatchObject({ operator: 'and', operator_mark: null });
    });

    it("refuses resetting a variant that isn't based on Standard", async () => {
      const { structured } = await callTool(
        'update_variant',
        { connection: IDS.draft, variant: 'Pilot', reset_operator: true },
        BEARERS.drafts
      );
      expect(structured).toEqual({
        code: 'validation',
        message: 'Pilot isn’t based on Standard, so it has nothing to reset or restore.',
      });
    });

    it('answers not_found for a variant the draft lacks', async () => {
      const { structured } = await callTool(
        'update_variant',
        { connection: IDS.draft, variant: 'Night shift', name: 'Day shift' },
        BEARERS.drafts
      );
      expect(structured).toEqual({ code: 'not_found', message: 'This variant no longer exists.' });
    });
  });

  describe('delete_variant', () => {
    it('deletes a variant with its rules', async () => {
      const { isError, structured } = await callTool(
        'delete_variant',
        { connection: IDS.draft, variant: links.variantLink(IDS.draft, IDS.draftEmpty) },
        BEARERS.drafts
      );
      expect(isError).toBe(false);
      expect(structured.deleted).toEqual({
        id: IDS.draftEmpty,
        name: 'Pilot',
        link: links.variantLink(IDS.draft, IDS.draftEmpty),
      });
      expect(variantNames()).toEqual(['Standard', 'Ambulance']);
    });

    it('refuses the main variant with not_allowed', async () => {
      const { isError, structured } = await callTool(
        'delete_variant',
        { connection: IDS.draft, variant: 'Standard' },
        BEARERS.drafts
      );
      expect(isError).toBe(true);
      expect(structured).toEqual({
        code: 'not_allowed',
        message: 'Standard is the main variant and can’t be deleted.',
      });
      expect(storedDraft().version).toBe(1);
    });
  });
});

describe('the item tools', () => {
  beforeAll(async () => {
    links = await import('../src/links');
  });

  afterEach(() => fake.reset());

  /** Calls a tool on the fixture draft as the `drafts` caller. */
  function onDraft(name: string, args: Record<string, unknown>, token: string = BEARERS.drafts) {
    return callTool(name, { connection: IDS.draft, ...args }, token);
  }

  function itemsOf(branchIndex: number): RuleTreeItem[] {
    return storedDraft().branches[branchIndex].items;
  }

  function itemOf(branchIndex: number, id: string): RuleTreeItem | undefined {
    const find = (items: RuleTreeItem[]): RuleTreeItem | undefined =>
      items
        .map((item) =>
          item.id === id ? item : item.type === 'group' ? find(item.items) : undefined
        )
        .find((item) => item !== undefined);
    return find(itemsOf(branchIndex));
  }

  function variantRef(id: string, name: string) {
    return { id, name, link: links.variantLink(IDS.draft, id) };
  }

  function itemRef(variantId: string, id: string, name: string) {
    return {
      id,
      type: id.startsWith('rule-') ? 'rule' : 'group',
      name,
      link: links.itemLink(IDS.draft, variantId, id),
    };
  }

  describe('add_rule', () => {
    it("adds a rule to Standard on a licence class's date, passed on to the based variant", async () => {
      const condition = { operator: 'at_least_years_ago', years: 2 };
      const { isError, structured, text } = await onDraft('add_rule', {
        variant: 'standard',
        name: 'Licence B',
        target: { document_type: 'mdl', field: 'driving_privileges.issue_date#b' },
        condition,
        message: 'You must have held licence B for two years.',
      });
      expect(isError).toBe(false);
      expect(structured).toEqual({
        connection: expect.objectContaining({ id: IDS.draft, status: 'draft' }),
        variant: variantRef(IDS.draftStandard, 'Standard'),
        item: {
          id: 'rule-3',
          type: 'rule',
          name: 'Licence B',
          statement: expect.any(String),
          mark: null,
          link: links.itemLink(IDS.draft, IDS.draftStandard, 'rule-3'),
          target: { document_type: 'mdl', field: 'driving_privileges.issue_date#B' },
          condition,
          message: 'You must have held licence B for two years.',
        },
        propagated_to: [variantRef(IDS.draftBased, 'Ambulance')],
      });
      // The data isn't requested yet: an incomplete draft is stored all the same (FR-013)
      expect(itemOf(0, 'rule-3')).toMatchObject({
        target: target('mdl', 'driving_privileges', 'issue_date', 'B'),
      });
      expect(itemOf(1, 'rule-3')).toMatchObject({ name: 'Licence B', mark: null });
      expect(itemsOf(2)).toEqual([]);
      expect(storedDraft()).toMatchObject({ version: 2, next_rule_number: 4 });
      expect(text).toContain('Also in the variants based on Standard: Ambulance.');
    });

    it('adds an incomplete rule to a group of a based variant, marked added', async () => {
      await onDraft('group_items', { variant: 'Standard', items: ['rule-1', 'rule-2'] });
      const { isError, structured } = await onDraft('add_rule', {
        variant: 'Ambulance',
        group: 'Group 01',
      });
      expect(isError).toBe(false);
      expect(structured.item).toEqual({
        id: 'rule-3',
        type: 'rule',
        name: 'Rule 03',
        statement: null,
        mark: 'added',
        link: links.itemLink(IDS.draft, IDS.draftBased, 'rule-3'),
        message: '',
      });
      expect(structured.propagated_to).toEqual([]);
      const group = itemOf(1, 'group-1');
      expect(group?.type === 'group' && group.items.map((item) => item.id)).toEqual([
        'rule-1',
        'rule-2',
        'rule-3',
      ]);
      expect(itemOf(0, 'rule-3')).toBeUndefined();
    });

    it('refuses data the catalog lacks, with the known fields', async () => {
      const { isError, structured } = await onDraft('add_rule', {
        variant: 'Standard',
        target: { document_type: 'pid', field: 'shoe_size' },
      });
      expect(isError).toBe(true);
      expect(structured.code).toBe('validation');
      expect(structured.message).toContain("Personal ID has no field 'shoe_size'");
      expect(storedDraft().version).toBe(1);
    });

    it("refuses a check the data doesn't offer, with the data's checks (FR-016)", async () => {
      const { isError, structured, text } = await onDraft('add_rule', {
        variant: 'Standard',
        target: { document_type: 'mdl', field: 'driving_privileges.classes' },
        condition: { operator: 'contains_any', values: ['B'] },
      });
      expect(isError).toBe(true);
      expect(structured).toEqual({
        code: 'validation',
        message:
          "Rule 03 in Standard: 'contains_any' isn't a check of driving_privileges.classes " +
          '(kind enum). Its checks: includes_one_of, includes_none_of.',
      });
      expect(text).toBe(structured.message);
      expect(itemOf(0, 'rule-3')).toBeUndefined();
      expect(storedDraft()).toMatchObject({ version: 1, next_rule_number: 3 });
    });

    it('without data, accepts a check of some kind as incomplete and refuses one of no kind', async () => {
      const accepted = await onDraft('add_rule', {
        variant: 'Pilot',
        condition: { operator: 'before', date: '2030-01-01' },
      });
      expect(accepted.isError).toBe(false);
      expect(accepted.structured.item).toMatchObject({
        id: 'rule-3',
        statement: null,
        condition: { operator: 'before', date: '2030-01-01' },
      });

      const refused = await onDraft('add_rule', {
        variant: 'Pilot',
        condition: { operator: 'contains_any', values: ['B'] },
      });
      expect(refused.isError).toBe(true);
      expect(refused.structured).toEqual({
        code: 'validation',
        message:
          "Rule 04 in Pilot: 'contains_any' isn't a check of any kind of data. The checks per " +
          'kind: number: greater_than, less_than, equal_to, not_equal_to; text: equal_to, ' +
          'not_equal_to, contains, not_contains; enum: includes_one_of, includes_none_of; date: ' +
          'before, after, on, at_least_years_ago, less_than_years_ago, exactly_years_ago, ' +
          'at_least_from_now, less_than_from_now.',
      });
      expect(itemOf(2, 'rule-4')).toBeUndefined();
      expect(storedDraft()).toMatchObject({ version: 2, next_rule_number: 4 });
    });
  });

  describe('update_item', () => {
    it("changes Standard's rule in the based variant, which marks it changed there", async () => {
      const condition = { operator: 'at_least_years_ago', years: 21 };
      const { isError, structured } = await onDraft('update_item', {
        variant: 'Ambulance',
        item: 'rule-1',
        condition,
        message: 'You must be at least 21 years old.',
      });
      expect(isError).toBe(false);
      expect(structured.item).toMatchObject({
        id: 'rule-1',
        mark: 'changed',
        condition,
        message: 'You must be at least 21 years old.',
        link: links.itemLink(IDS.draft, IDS.draftBased, 'rule-1'),
      });
      expect(structured.propagated_to).toEqual([]);
      expect(itemOf(0, 'rule-1')).toMatchObject({ condition: { years: 18 }, mark: null });
    });

    it("switches a group's AND/OR and removes its own message", async () => {
      await onDraft('group_items', {
        variant: 'Standard',
        items: ['rule-1', 'rule-2'],
        message: 'Adults of Stuttgart only.',
      });
      const { isError, structured } = await onDraft('update_item', {
        variant: 'Standard',
        item: 'group-1',
        operator: 'or',
        message: null,
      });
      expect(isError).toBe(false);
      expect(structured.item).toMatchObject({ id: 'group-1', type: 'group', operator: 'or' });
      expect(structured.item).not.toHaveProperty('message');
      expect(structured.propagated_to).toEqual([variantRef(IDS.draftBased, 'Ambulance')]);
      expect(itemOf(1, 'group-1')).toMatchObject({ operator: 'or', message: null, mark: null });
    });

    it('refuses a rename in Standard that clashes in a based variant, as the editor does', async () => {
      await onDraft('add_rule', { variant: 'Ambulance', name: 'Night' });
      const { isError, structured } = await onDraft('update_item', {
        variant: 'Standard',
        item: 'rule-1',
        name: 'night',
      });
      expect(isError).toBe(true);
      expect(structured).toEqual({
        code: 'validation',
        message: 'There’s already a rule called "Night" in Ambulance.',
      });
      expect(itemOf(0, 'rule-1')?.name).toBe('Rule 01');
    });

    it("refuses a condition whose operator the rule's data doesn't offer (FR-016)", async () => {
      const { isError, structured } = await onDraft('update_item', {
        variant: 'Standard',
        item: 'rule-2',
        condition: { operator: 'greater_than', value: 3 },
      });
      expect(isError).toBe(true);
      expect(structured).toEqual({
        code: 'validation',
        message:
          "Rule 02 in Standard: 'greater_than' isn't a check of address_locality (kind text). " +
          'Its checks: equal_to, not_equal_to, contains, not_contains.',
      });
      expect(itemOf(0, 'rule-2')).toMatchObject({ condition: { operator: 'equal_to' } });
      expect(storedDraft().version).toBe(1);
    });

    it("drops the condition when the rule's new data is of another kind, and says so", async () => {
      const { isError, structured, text } = await onDraft('update_item', {
        variant: 'Standard',
        item: 'rule-1',
        target: { document_type: 'mdl', field: 'driving_privileges.classes' },
      });
      expect(isError).toBe(false);
      expect(structured.item).toMatchObject({
        id: 'rule-1',
        statement: null,
        target: { document_type: 'mdl', field: 'driving_privileges.classes' },
      });
      expect(structured.item).not.toHaveProperty('condition');
      expect(structured.dropped_condition).toEqual({ operator: 'at_least_years_ago', years: 18 });
      expect(text).toContain(
        "Its condition was dropped: it doesn't fit driving_privileges.classes (kind enum). " +
          'Its checks: includes_one_of, includes_none_of.'
      );
      expect(structured.propagated_to).toEqual([variantRef(IDS.draftBased, 'Ambulance')]);
      expect(itemOf(0, 'rule-1')).toMatchObject({ condition: null });
      expect(itemOf(1, 'rule-1')).toMatchObject({ condition: null, mark: null });
    });

    it('keeps the condition for new data of the same kind, as the editor does (FR-014)', async () => {
      const { isError, structured } = await onDraft('update_item', {
        variant: 'Standard',
        item: 'rule-1',
        target: { document_type: 'mdl', field: 'issue_date' },
      });
      expect(isError).toBe(false);
      expect(structured.item).toMatchObject({
        target: { document_type: 'mdl', field: 'issue_date' },
        condition: { operator: 'at_least_years_ago', years: 18 },
        statement: 'Driving licence · Issue date is at least 18 years ago',
      });
      expect(structured).not.toHaveProperty('dropped_condition');
    });

    it('checks a condition given with new data against that data', async () => {
      const condition = { operator: 'includes_one_of', values: ['B'] };
      const accepted = await onDraft('update_item', {
        variant: 'Standard',
        item: 'rule-1',
        target: { document_type: 'mdl', field: 'driving_privileges.classes' },
        condition,
      });
      expect(accepted.isError).toBe(false);
      expect(accepted.structured.item).toMatchObject({
        condition,
        statement: 'Driving licence · Licence classes includes one of B',
      });
      expect(accepted.structured).not.toHaveProperty('dropped_condition');

      const refused = await onDraft('update_item', {
        variant: 'Standard',
        item: 'rule-2',
        target: { document_type: 'pid', field: 'birthdate' },
        condition: { operator: 'equal_to', value: 'Stuttgart' },
      });
      expect(refused.isError).toBe(true);
      expect(refused.structured.message).toBe(
        "Rule 02 in Standard: 'equal_to' isn't a check of birthdate (kind date). Its checks: " +
          'before, after, on, at_least_years_ago, less_than_years_ago, exactly_years_ago, ' +
          'at_least_from_now, less_than_from_now.'
      );
      expect(itemOf(0, 'rule-2')).toMatchObject({ target: target('pid', 'address_locality') });
    });

    it('refuses a change to a published connection, also at manage level', async () => {
      const { isError, structured } = await callTool(
        'update_item',
        { connection: IDS.live, variant: 'Standard', item: 'rule-1', message: 'Changed' },
        BEARERS.manage
      );
      expect(isError).toBe(true);
      expect(structured).toEqual({
        code: 'published_read_only',
        message:
          'The content of a published connection is changed in Konnekt. Agents ' +
          'can only change drafts.',
      });
      expect(fake.calls.filter((call) => call.method === 'PUT')).toEqual([]);
    });

    it.each([
      ['its id', () => 'rule-3'],
      ['its link', () => links.itemLink(IDS.draft, IDS.draftStandard, 'rule-3')],
      ['its name', () => ' residence '],
    ])('names a rule by %s', async (_case, reference) => {
      await onDraft('add_rule', { variant: 'Standard', name: 'Residence' });
      const { isError, structured } = await onDraft('update_item', {
        variant: 'Standard',
        item: reference(),
        message: 'You must live in Stuttgart.',
      });
      expect(isError).toBe(false);
      expect(structured.item).toMatchObject({ id: 'rule-3', name: 'Residence' });
      expect(itemOf(0, 'rule-3')).toMatchObject({ message: 'You must live in Stuttgart.' });
    });
  });

  describe('links (FR-028 to FR-031)', () => {
    /** Ambulance's rule-2, which the based variant changed: Standard has a rule-2 too */
    function ruleLink(): string {
      return links.itemLink(IDS.draft, IDS.draftBased, 'rule-2');
    }

    it("update_item given a rule's link changes that rule in that variant", async () => {
      const { isError, structured } = await onDraft('update_item', {
        connection: ruleLink(),
        variant: ruleLink(),
        item: ruleLink(),
        message: 'You must live in Esslingen or Plochingen.',
      });
      expect(isError).toBe(false);
      expect(structured.variant).toEqual(variantRef(IDS.draftBased, 'Ambulance'));
      expect(structured.item).toMatchObject({
        id: 'rule-2',
        message: 'You must live in Esslingen or Plochingen.',
        link: ruleLink(),
      });
      expect(itemOf(1, 'rule-2')).toMatchObject({
        message: 'You must live in Esslingen or Plochingen.',
      });
      // Standard's rule-2 and the other variants stay as they were
      expect(itemOf(0, 'rule-2')).toMatchObject({ message: 'You must live in Stuttgart.' });
      expect(itemsOf(2)).toEqual([]);
    });

    it("still resolves a rule's link after the variant is renamed and the draft published (the same ids)", async () => {
      const renamed = await onDraft('update_variant', {
        variant: 'Ambulance',
        name: 'Rescue service',
      });
      expect(renamed.isError).toBe(false);
      await onDraft('update_item', { variant: 'Rescue service', item: 'rule-2', name: 'Town' });

      const afterRename = await onDraft('update_item', {
        variant: ruleLink(),
        item: ruleLink(),
        message: 'You must live in Esslingen.',
      });
      expect(afterRename.isError).toBe(false);
      expect(afterRename.structured.variant).toEqual(variantRef(IDS.draftBased, 'Rescue service'));
      expect(afterRename.structured.item).toMatchObject({ id: 'rule-2', name: 'Town' });

      fake.store.connections.set(IDS.draft, publishedOf(storedDraft()));
      const afterPublish = await callTool('get_item', {
        connection: ruleLink(),
        variant: ruleLink(),
        item: ruleLink(),
      });
      expect(afterPublish.isError).toBe(false);
      expect(afterPublish.structured.connection).toMatchObject({ id: IDS.draft, status: 'live' });
      expect(afterPublish.structured.variant).toEqual(variantRef(IDS.draftBased, 'Rescue service'));
      expect(afterPublish.structured.item).toMatchObject({
        id: 'rule-2',
        name: 'Town',
        message: 'You must live in Esslingen.',
        link: ruleLink(),
      });
    });

    it('refuses a link from another origin with foreign_link, and changes nothing', async () => {
      const foreign = ruleLink().replace(/^https?:\/\/[^/]+/, 'https://preview.example.org');
      expect(foreign).not.toBe(ruleLink());
      const { isError, structured } = await onDraft('update_item', {
        variant: 'Ambulance',
        item: foreign,
        message: 'Changed',
      });
      expect(isError).toBe(true);
      expect(structured).toEqual({
        code: 'foreign_link',
        message: "This link doesn't belong to Konnekt.",
      });
      expect(fake.calls.filter((call) => call.method === 'PUT')).toEqual([]);
    });
  });

  describe('delete_item', () => {
    it("removes Standard's rule from the based variant instead of deleting it", async () => {
      const { isError, structured } = await onDraft('delete_item', {
        variant: 'Ambulance',
        item: 'Rule 01',
      });
      expect(isError).toBe(false);
      expect(structured).toEqual({
        connection: expect.objectContaining({ id: IDS.draft }),
        variant: variantRef(IDS.draftBased, 'Ambulance'),
        action: 'removed',
        item: itemRef(IDS.draftBased, 'rule-1', 'Rule 01'),
        effects: [],
      });
      expect(itemOf(1, 'rule-1')?.mark).toBe('removed');
      expect(itemOf(0, 'rule-1')?.mark).toBeNull();
    });

    it('deletes in Standard and reports the changed rule the based variant keeps', async () => {
      const { isError, structured } = await onDraft('delete_item', {
        variant: 'Standard',
        item: 'rule-2',
      });
      expect(isError).toBe(false);
      expect(structured.action).toBe('deleted');
      expect(structured.effects).toEqual([
        {
          variant: variantRef(IDS.draftBased, 'Ambulance'),
          kept: [itemRef(IDS.draftBased, 'rule-2', 'Rule 02')],
          dissolved: [],
        },
      ]);
      expect(itemsOf(0).map((item) => item.id)).toEqual(['rule-1']);
      expect(itemOf(1, 'rule-2')?.mark).toBe('added');
    });

    it('ungroups a group with keep_members', async () => {
      await onDraft('group_items', { variant: 'Standard', items: ['rule-1', 'rule-2'] });
      const { isError, structured } = await onDraft('delete_item', {
        variant: 'Standard',
        item: 'group-1',
        keep_members: true,
      });
      expect(isError).toBe(false);
      expect(structured.action).toBe('ungrouped');
      expect(itemsOf(0).map((item) => item.id)).toEqual(['rule-1', 'rule-2']);
      expect(itemsOf(1).map((item) => item.id)).toEqual(['rule-1', 'rule-2']);
    });
  });

  describe('reset_item', () => {
    it("resets the based variant's changed rule to follow Standard", async () => {
      const { isError, structured } = await onDraft('reset_item', {
        variant: 'Ambulance',
        item: 'rule-2',
      });
      expect(isError).toBe(false);
      expect(structured.item).toMatchObject({
        id: 'rule-2',
        mark: null,
        condition: { operator: 'equal_to', value: 'Stuttgart' },
        message: 'You must live in Stuttgart.',
      });
      expect(itemOf(1, 'rule-2')).toEqual(itemOf(0, 'rule-2'));
    });

    it('restores a removed rule', async () => {
      await onDraft('delete_item', { variant: 'Ambulance', item: 'rule-1' });
      const { isError, structured, text } = await onDraft('reset_item', {
        variant: 'Ambulance',
        item: 'rule-1',
      });
      expect(isError).toBe(false);
      expect(structured.item).toMatchObject({ id: 'rule-1', mark: null });
      expect(itemOf(1, 'rule-1')?.mark).toBeNull();
      expect(text).toContain('Restored:');
    });

    it("refuses an item that isn't changed, in the editor's words", async () => {
      const { structured } = await onDraft('reset_item', { variant: 'Ambulance', item: 'rule-1' });
      expect(structured).toEqual({
        code: 'validation',
        message: 'Rule 01 in Ambulance isn’t changed: it follows Standard already.',
      });
    });
  });

  describe('copy_rule', () => {
    it('duplicates a rule beside it without to_variants', async () => {
      const { isError, structured } = await onDraft('copy_rule', {
        variant: 'Standard',
        rule: 'rule-1',
      });
      expect(isError).toBe(false);
      expect(structured).toEqual({
        connection: expect.objectContaining({ id: IDS.draft }),
        copies: [
          {
            variant: variantRef(IDS.draftStandard, 'Standard'),
            item: itemRef(IDS.draftStandard, 'rule-3', 'Rule 03'),
          },
        ],
      });
      expect(itemOf(0, 'rule-3')).toMatchObject({ condition: { years: 18 } });
      expect(itemOf(1, 'rule-3')?.mark).toBeNull();
    });

    it('copies a rule to the empty variant', async () => {
      const { isError, structured } = await onDraft('copy_rule', {
        variant: 'Ambulance',
        rule: 'rule-2',
        to_variants: ['Pilot'],
      });
      expect(isError).toBe(false);
      expect(structured.copies).toEqual([
        {
          variant: variantRef(IDS.draftEmpty, 'Pilot'),
          item: itemRef(IDS.draftEmpty, 'rule-3', 'Rule 03'),
        },
      ]);
      expect(itemsOf(2)).toEqual([
        expect.objectContaining({
          id: 'rule-3',
          mark: null,
          condition: { operator: 'equal_to', value: 'Esslingen' },
        }),
      ]);
    });
  });

  describe('group_items', () => {
    it('groups two of Standard’s rules with a name and OR, passed on to the based variant', async () => {
      const { isError, structured } = await onDraft('group_items', {
        variant: 'Standard',
        items: ['Rule 01', links.itemLink(IDS.draft, IDS.draftStandard, 'rule-2')],
        name: 'Age or city',
        operator: 'or',
      });
      expect(isError).toBe(false);
      expect(structured).toEqual({
        connection: expect.objectContaining({ id: IDS.draft }),
        variant: variantRef(IDS.draftStandard, 'Standard'),
        item: expect.objectContaining({
          id: 'group-1',
          type: 'group',
          name: 'Age or city',
          operator: 'or',
          mark: null,
          link: links.itemLink(IDS.draft, IDS.draftStandard, 'group-1'),
          items: [
            expect.objectContaining({ id: 'rule-1' }),
            expect.objectContaining({ id: 'rule-2' }),
          ],
        }),
      });
      expect(itemOf(1, 'group-1')).toMatchObject({ name: 'Age or city', operator: 'or' });
    });

    it("refuses a single rule with the editor's message", async () => {
      const { structured } = await onDraft('group_items', {
        variant: 'Standard',
        items: ['rule-1'],
      });
      expect(structured).toEqual({
        code: 'validation',
        message:
          'Choose two or more rules of one level in Standard to group. A sub-group can’t hold ' +
          'groups.',
      });
      expect(storedDraft().version).toBe(1);
    });
  });

  it('applies the change to the draft another save stored in between (FR-015)', async () => {
    fake.beforeNextDraftSave((draft) => {
      // Another save added rule-3 to Standard meanwhile
      const state: EditState = {
        branches: draft.branches,
        counters: { rule: draft.next_rule_number, group: draft.next_group_number },
      };
      const other = addRule(state, IDS.draftStandard, null, { name: 'Other save' });
      if (!other.ok) throw new Error(other.refusal.message);
      fake.store.connections.set(draft.id, {
        ...draft,
        branches: other.state.branches,
        next_rule_number: other.state.counters.rule,
        version: draft.version + 1,
      });
    });
    const { isError, structured } = await onDraft('add_rule', {
      variant: 'Standard',
      name: 'Mine',
    });
    expect(isError).toBe(false);
    expect(structured.item).toMatchObject({ id: 'rule-4', name: 'Mine' });
    expect(itemsOf(0).map((item) => [item.id, item.name])).toEqual([
      ['rule-1', 'Rule 01'],
      ['rule-2', 'Rule 02'],
      ['rule-3', 'Other save'],
      ['rule-4', 'Mine'],
    ]);
    expect(itemsOf(1).map((item) => item.id)).toEqual(['rule-1', 'rule-2', 'rule-3', 'rule-4']);
    expect(storedDraft().version).toBe(3);
    expect(fake.calls.filter((call) => call.method === 'PUT')).toHaveLength(2);
  });

  it("builds User Story 2's draft exactly as the editor's actions do (SC-002, SC-003)", async () => {
    const AGE: Condition = { operator: 'at_least_years_ago', years: 18 };
    const NATIONALITY: Condition = { operator: 'includes_one_of', values: ['DE', 'AT'] };
    const CLASS_B: Condition = { operator: 'includes_one_of', values: ['B'] };
    const CLASS_C: Condition = { operator: 'includes_one_of', values: ['C'] };
    const VALID: Condition = { operator: 'at_least_from_now', amount: 6, unit: 'months' };

    // Through the tools, one change per call
    const created = await callTool('create_draft', { name: 'Fishing permit' }, BEARERS.drafts);
    const id = created.structured.connection.id as string;
    const standardId = created.structured.variants[0].id as string;
    async function call(tool: string, args: Record<string, unknown>) {
      const answer = await callTool(tool, { connection: id, ...args }, BEARERS.drafts);
      expect(answer.isError, answer.text).toBe(false);
      return answer.structured;
    }
    await call('set_document', { document_type: 'pid', fields: ['nationalities', 'birthdate'] });
    await call('set_document', {
      document_type: 'mdl',
      fields: ['expiry_date', 'driving_privileges'],
    });
    const basedId = (await call('add_variant', { name: 'Ambulance', origin: 'based' })).variant
      .id as string;
    const emptyId = (
      await call('add_variant', { name: 'Pilot', origin: 'empty', description: 'A trial' })
    ).variant.id as string;
    await call('add_rule', {
      variant: 'Standard',
      name: 'Adult',
      target: { document_type: 'pid', field: 'birthdate' },
      condition: AGE,
      message: 'You must be at least 18 years old.',
    });
    await call('add_rule', {
      variant: 'Standard',
      target: { document_type: 'pid', field: 'nationalities' },
      condition: NATIONALITY,
      message: 'You must be German or Austrian.',
    });
    await call('add_rule', {
      variant: standardId,
      target: { document_type: 'mdl', field: 'driving_privileges.classes' },
      condition: CLASS_B,
      message: 'You need licence B.',
    });
    await call('add_rule', {
      variant: 'Standard',
      target: { document_type: 'mdl', field: 'expiry_date' },
      condition: VALID,
      message: 'Your licence must be valid for six more months.',
    });
    await call('group_items', {
      variant: 'Standard',
      items: ['Adult', 'rule-2'],
      name: 'Age or nationality',
      operator: 'or',
    });
    await call('update_item', {
      variant: 'Ambulance',
      item: 'rule-3',
      condition: CLASS_C,
      message: 'You need licence C.',
    });
    await call('delete_item', { variant: 'Standard', item: 'rule-4' });

    // The same actions through edits.ts directly, with the ids the tools answered
    let state: EditState = {
      branches: [
        {
          id: standardId,
          name: 'Standard',
          description: null,
          origin: 'main',
          operator: 'and',
          operator_mark: null,
          items: [],
        },
      ],
      counters: { rule: 1, group: 1 },
    };
    function apply<T extends object>(result: EditResult<T>): void {
      if (!result.ok) throw new Error(result.refusal.message);
      state = result.state;
    }
    apply(addVariant(state, { name: 'Ambulance', description: null }, 'based', basedId));
    apply(addVariant(state, { name: 'Pilot', description: 'A trial' }, 'empty', emptyId));
    apply(
      addRule(state, standardId, null, {
        name: 'Adult',
        target: target('pid', 'birthdate'),
        condition: AGE,
        message: 'You must be at least 18 years old.',
      })
    );
    apply(
      addRule(state, standardId, null, {
        target: target('pid', 'nationalities'),
        condition: NATIONALITY,
        message: 'You must be German or Austrian.',
      })
    );
    apply(
      addRule(state, standardId, null, {
        target: target('mdl', 'driving_privileges', 'classes'),
        condition: CLASS_B,
        message: 'You need licence B.',
      })
    );
    apply(
      addRule(state, standardId, null, {
        target: target('mdl', 'expiry_date'),
        condition: VALID,
        message: 'Your licence must be valid for six more months.',
      })
    );
    apply(
      groupItems(state, standardId, ['rule-1', 'rule-2'], {
        name: 'Age or nationality',
        operator: 'or',
      })
    );
    apply(
      changeRule(state, basedId, 'rule-3', { condition: CLASS_C, message: 'You need licence C.' })
    );
    apply(deleteItem(state, standardId, 'rule-4'));

    const stored = fake.store.connections.get(id) as FormConnectionDraft;
    expect(stored.branches).toEqual(state.branches);
    expect({ rule: stored.next_rule_number, group: stored.next_group_number }).toEqual(
      state.counters
    );
    // What the comparison covers, spelled out: the marks and the tree of each variant
    const shape = (items: RuleTreeItem[]): unknown[] =>
      items.map((item) =>
        item.type === 'group' ? [item.id, item.mark, shape(item.items)] : [item.id, item.mark]
      );
    expect(
      stored.branches.map((branch) => [branch.name, branch.origin, shape(branch.items)])
    ).toEqual([
      [
        'Standard',
        'main',
        [
          [
            'group-1',
            null,
            [
              ['rule-1', null],
              ['rule-2', null],
            ],
          ],
          ['rule-3', null],
        ],
      ],
      [
        'Ambulance',
        'based',
        [
          [
            'group-1',
            null,
            [
              ['rule-1', null],
              ['rule-2', null],
            ],
          ],
          ['rule-3', 'changed'],
        ],
      ],
      ['Pilot', 'empty', []],
    ]);
    expect(
      stored.documents.map((document) => [
        document.document_type,
        document.fields.map((field) => field.key),
      ])
    ).toEqual([
      ['pid', ['birthdate', 'nationalities']],
      ['mdl', ['expiry_date', 'driving_privileges']],
    ]);
    expect(stored.step).toBe('rules');
  });
});

describe('the approval tools', () => {
  type ElicitParams = { mode?: string; url?: string; message?: string };

  beforeAll(async () => {
    links = await import('../src/links');
  });

  afterEach(() => fake.reset());

  const NAME = 'Resident parking permit';

  /** The time the team member reads, on Germany's clock. */
  function timeOf(iso: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Berlin',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(iso));
  }

  function approvalPosts() {
    return fake.calls.filter(
      (call) => call.method === 'POST' && call.path === '/api/approval-requests'
    );
  }

  /** A client of `era` that declares URL-mode elicitation and records what it is shown. */
  async function elicitingClient(
    era: Era,
    seen: ElicitParams[],
    token: string = BEARERS.drafts
  ): Promise<Client> {
    const capabilities = { elicitation: { url: {} } };
    const client = new Client(
      { name: 'server-test', version: '1.0.0' },
      era === 'modern' ? { capabilities, versionNegotiation: { mode: 'auto' } } : { capabilities }
    );
    client.setRequestHandler('elicitation/create', async (request) => {
      seen.push(request.params as ElicitParams);
      return { action: 'accept' };
    });
    const transport = new StreamableHTTPClientTransport(mcpUrl, {
      requestInit: { headers: { Authorization: `Bearer ${token}` } },
    });
    await client.connect(transport);
    clients.push(client);
    return client;
  }

  /** A request stored in the fake, changed by `change`, for check_approval. */
  async function storedRequest(
    change: (request: ApprovalRequest) => ApprovalRequest,
    connection: string = IDS.draft,
    action: string = 'publish',
    token: string = BEARERS.drafts
  ) {
    const { structured } = await callTool('request_approval', { connection, action }, token);
    const id = structured.request.id as string;
    const stored = fake.store.approvals.get(id);
    if (!stored) throw new Error('The fake stored no request');
    stored.request = change(stored.request);
    return id;
  }

  describe('request_approval', () => {
    it("answers the request's link and expiry, and what happens next; nothing is published", async () => {
      const { isError, structured, text } = await callTool(
        'request_approval',
        { connection: links.connectionLink(IDS.draft), action: 'publish' },
        BEARERS.drafts
      );
      expect(isError).toBe(false);
      const [stored] = [...fake.store.approvals.values()];
      const { request } = stored;
      expect(structured).toEqual({
        request: {
          id: request.id,
          action: 'publish',
          connection: {
            id: IDS.draft,
            name: NAME,
            status: 'draft',
            link: links.connectionLink(IDS.draft),
          },
          link: `http://localhost:5173/approvals/${request.id}`,
          expires_at: request.expires_at,
          status: 'waiting',
        },
        what_happens:
          "Nothing is published yet. The team member opens the link, sees the draft's content " +
          "and the rule checks' findings, and approves or declines before " +
          `${timeOf(request.expires_at)}.`,
      });
      expect(new Date(request.expires_at).getTime() - Date.now()).toBeGreaterThan(9 * 60_000);
      expect(text).toContain(request.link);
      expect(text).toContain('check_approval');
      expect(storedDraft().status).toBe('draft');
    });

    it('says that deleting a draft is for good', async () => {
      const { structured } = await callTool(
        'request_approval',
        { connection: IDS.draft, action: 'delete_draft' },
        BEARERS.drafts
      );
      expect(structured.request.action).toBe('delete_draft');
      expect(structured.what_happens).toMatch(/^Nothing is deleted yet\. /);
      expect(structured.what_happens).toContain('its content will be gone for good.');
      expect(fake.store.connections.has(IDS.draft)).toBe(true);
    });

    it.each([
      [
        'publish',
        IDS.draft,
        'drafts',
        "Your access is read only. Changing drafts needs the access level 'Read and edit " +
          "drafts'. Ask for it with request_access, or the team member raises it on their user " +
          'page.',
      ],
      [
        'deactivate',
        IDS.live,
        'manage',
        'Your access is read only. Deactivating, reactivating and deleting published ' +
          "connections needs the access level 'Read, edit drafts and manage live connections'. " +
          'Ask for it with request_access, or the team member raises it on their user page.',
      ],
    ])(
      'refuses the read caller asking to %s with the level it needs, and makes no request',
      async (action, connection, level, message) => {
        const { isError, structured } = await callTool(
          'request_approval',
          { connection, action },
          BEARERS.read
        );
        expect(isError).toBe(true);
        expect(structured).toEqual({
          code: 'insufficient_access',
          message,
          needs_access_level: level,
        });
        expect(approvalPosts()).toEqual([]);
        expect(fake.store.approvals.size).toBe(0);
      }
    );

    it('refuses the drafts caller asking to deactivate with the manage level, no request made', async () => {
      const { structured } = await callTool(
        'request_approval',
        { connection: IDS.live, action: 'deactivate' },
        BEARERS.drafts
      );
      expect(structured).toMatchObject({
        code: 'insufficient_access',
        needs_access_level: 'manage',
      });
      expect(approvalPosts()).toEqual([]);
    });

    it("refuses a draft that publishing would refuse with publishing's message", async () => {
      const created = await callTool('create_draft', { name: 'Empty' }, BEARERS.drafts);
      const { isError, structured } = await callTool(
        'request_approval',
        { connection: created.structured.connection.id, action: 'publish' },
        BEARERS.drafts
      );
      expect(isError).toBe(true);
      expect(structured).toEqual({ code: 'validation', message: 'Add at least one document.' });
      expect(fake.store.approvals.size).toBe(0);
    });

    it('refuses publishing a published connection with not_allowed', async () => {
      const { structured } = await callTool(
        'request_approval',
        { connection: IDS.live, action: 'publish' },
        BEARERS.drafts
      );
      expect(structured).toEqual({
        code: 'not_allowed',
        message: 'This connection is already published.',
      });
    });

    describe('the status actions (US7)', () => {
      const MANAGE_NEEDED =
        'Deactivating, reactivating and deleting published connections needs the access level ' +
        "'Read, edit drafts and manage live connections'. Ask for it with request_access, or the " +
        'team member raises it on their user page.';

      it.each([
        ['read', 'read only', 'deactivate', IDS.live],
        ['read', 'read only', 'reactivate', IDS.deactivated],
        ['read', 'read only', 'delete', IDS.live],
        ['drafts', 'read and edit drafts', 'deactivate', IDS.live],
        ['drafts', 'read and edit drafts', 'reactivate', IDS.deactivated],
        ['drafts', 'read and edit drafts', 'delete', IDS.live],
      ] as const)(
        'refuses the %s caller (%s) asking to %s with the manage message, no request made',
        async (level, current, action, connection) => {
          const { isError, structured } = await callTool(
            'request_approval',
            { connection, action },
            BEARERS[level]
          );
          expect(isError).toBe(true);
          expect(structured).toEqual({
            code: 'insufficient_access',
            message: `Your access is ${current}. ${MANAGE_NEEDED}`,
            needs_access_level: 'manage',
          });
          expect(approvalPosts()).toEqual([]);
          expect(fake.store.approvals.size).toBe(0);
        }
      );

      it.each([
        [
          'deactivate',
          IDS.live,
          'Fishing licence',
          'live',
          (time: string) =>
            'Nothing changes yet. The team member sees which connection URLs will answer ' +
            "'unavailable' until the connection is reactivated and that requests in progress " +
            `are cancelled, and approves or declines before ${time}.`,
        ],
        [
          'reactivate',
          IDS.deactivated,
          'Dog licence',
          'deactivated',
          (time: string) =>
            'Nothing changes yet. The team member sees which connection URLs will work again, ' +
            `and approves or declines before ${time}.`,
        ],
        [
          'delete',
          IDS.live,
          'Fishing licence',
          'live',
          (time: string) =>
            'Nothing changes yet. The team member sees which connection URLs stop working for ' +
            "good, that requests in progress are cancelled and that deleting can't be undone, " +
            `and approves or declines before ${time}.`,
        ],
      ] as const)(
        'makes a %s request for the manage caller and says what happens next; nothing changes',
        async (action, connection, name, status, whatHappens) => {
          const before = fake.store.connections.get(connection);
          const { isError, structured, text } = await callTool(
            'request_approval',
            { connection: links.connectionLink(connection), action },
            BEARERS.manage
          );
          expect(isError).toBe(false);
          expect(approvalPosts()).toHaveLength(1);
          const [{ request }] = [...fake.store.approvals.values()];
          expect(request).toMatchObject({ action, form_connection_id: connection });
          expect(structured).toEqual({
            request: {
              id: request.id,
              action,
              connection: { id: connection, name, status, link: links.connectionLink(connection) },
              link: `http://localhost:5173/approvals/${request.id}`,
              expires_at: request.expires_at,
              status: 'waiting',
            },
            what_happens: whatHappens(timeOf(request.expires_at)),
          });
          expect(text).toContain(request.link);
          expect(fake.store.connections.get(connection)).toBe(before);
        }
      );

      it.each([
        ['deactivate', IDS.live, 'Fishing licence', 'deactivating'],
        ['reactivate', IDS.deactivated, 'Dog licence', 'reactivating'],
        ['delete', IDS.live, 'Fishing licence', 'deleting'],
      ] as const)(
        'shows a client that declares elicitation.url the %s link with its own message',
        async (action, connection, name, verb) => {
          const seen: ElicitParams[] = [];
          const client = await elicitingClient('modern', seen, BEARERS.manage);
          const answer = await client.callTool({
            name: 'request_approval',
            arguments: { connection, action },
          });
          expect(answer.isError).not.toBe(true);
          expect(approvalPosts()).toHaveLength(1);
          const [{ request }] = [...fake.store.approvals.values()];
          expect(seen).toEqual([
            expect.objectContaining({
              mode: 'url',
              url: request.link,
              message: `Approve ${verb} '${name}' in Konnekt.`,
            }),
          ]);
        }
      );

      it.each([
        ['deactivate', IDS.deactivated, 'This connection is already deactivated.'],
        ['reactivate', IDS.live, 'This connection is already live.'],
        ['deactivate', IDS.draft, 'This connection is a draft: it has nothing live yet.'],
        ['reactivate', IDS.draft, 'This connection is a draft: it has nothing live yet.'],
        ['delete', IDS.draft, 'This connection is a draft: it has nothing live yet.'],
      ] as const)(
        "refuses to %s a connection the action doesn't apply to with not_allowed",
        async (action, connection, message) => {
          const { isError, structured } = await callTool(
            'request_approval',
            { connection, action },
            BEARERS.manage
          );
          expect(isError).toBe(true);
          expect(structured).toEqual({ code: 'not_allowed', message });
          expect(fake.store.approvals.size).toBe(0);
        }
      );
    });

    it('answers not_found for an unknown connection', async () => {
      const { structured } = await callTool(
        'request_approval',
        { connection: '44444444-4444-4444-8444-444444444444', action: 'publish' },
        BEARERS.drafts
      );
      expect(structured.code).toBe('not_found');
      expect(approvalPosts()).toEqual([]);
    });

    it.each<Era>(['modern', 'legacy'])(
      '%s: a client that declares elicitation.url is shown the link; one request is made',
      async (era) => {
        const seen: ElicitParams[] = [];
        const client = await elicitingClient(era, seen);
        const answer = await client.callTool({
          name: 'request_approval',
          arguments: { connection: IDS.draft, action: 'publish' },
        });
        expect(answer.isError).not.toBe(true);
        expect(fake.store.approvals.size).toBe(1);
        expect(approvalPosts()).toHaveLength(1);
        const [{ request }] = [...fake.store.approvals.values()];
        expect(seen).toEqual([
          expect.objectContaining({
            mode: 'url',
            url: request.link,
            message: `Approve publishing '${NAME}' in Konnekt.`,
          }),
        ]);
        // The re-entered call read the request back and answers the ordinary result
        const structured = answer.structuredContent as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
        expect(structured.request).toMatchObject({
          id: request.id,
          link: request.link,
          expires_at: request.expires_at,
          status: 'waiting',
          connection: { id: IDS.draft, name: NAME, status: 'draft' },
        });
        expect(structured.what_happens).toMatch(/^Nothing is published yet\. /);
        expect(fake.calls).toContainEqual(
          expect.objectContaining({ method: 'GET', path: `/api/approval-requests/${request.id}` })
        );
      }
    );

    it.each<Era>(['modern', 'legacy'])(
      '%s: a client without elicitation.url gets the link in the result only',
      async (era) => {
        const { structured } = await callTool(
          'request_approval',
          { connection: IDS.draft, action: 'publish' },
          BEARERS.drafts,
          era
        );
        const [{ request }] = [...fake.store.approvals.values()];
        expect(structured.request.link).toBe(request.link);
        expect(approvalPosts()).toHaveLength(1);
        // No round trip: the request isn't read back
        expect(fake.calls.map((call) => call.path)).not.toContain(
          `/api/approval-requests/${request.id}`
        );
      }
    );
  });

  describe('check_approval', () => {
    it('answers a waiting request, by its link too', async () => {
      const id = await storedRequest((request) => request);
      const { structured, text } = await callTool(
        'check_approval',
        { request_id: links.approvalLink(id) },
        BEARERS.drafts
      );
      const { request } = fake.store.approvals.get(id) ?? {};
      expect(structured).toEqual({
        request: {
          id,
          action: 'publish',
          connection: {
            id: IDS.draft,
            name: NAME,
            status: 'draft',
            link: links.connectionLink(IDS.draft),
          },
          link: request?.link,
          expires_at: request?.expires_at,
          status: 'waiting',
          outcome: 'waiting',
        },
        urls: null,
      });
      expect(text).toContain("hasn't decided yet");
    });

    it('answers a done publish with the connection URLs', async () => {
      const id = await storedRequest((request) => ({
        ...request,
        status: 'done',
        outcome: 'done',
        decided_at: new Date().toISOString(),
      }));
      const live = fake.store.connections.get(IDS.live) as FormConnection;
      fake.store.connections.set(IDS.draft, { ...live, id: IDS.draft, name: NAME });
      const { structured, text } = await callTool(
        'check_approval',
        { request_id: id },
        BEARERS.drafts
      );
      expect(structured.request).toMatchObject({
        status: 'done',
        outcome: 'done',
        connection: { id: IDS.draft, status: 'live' },
      });
      expect(structured.urls).toEqual({
        trigger_url: live.trigger_url,
        variants: [
          {
            id: IDS.liveStandard,
            name: 'Standard',
            link: links.variantLink(IDS.draft, IDS.liveStandard),
            pull_url: live.branches[0].pull_url,
          },
        ],
      });
      expect(text).toContain('the draft is published');
      expect(text).toContain(`Trigger URL: ${live.trigger_url}`);
    });

    it.each<[string, Partial<ApprovalRequest>, Record<string, unknown>, string]>([
      ['declined', { status: 'declined', outcome: 'declined' }, {}, 'declined'],
      ['expired', { status: 'expired', outcome: 'expired' }, {}, 'expired at'],
      [
        'cancelled',
        { status: 'cancelled', outcome: 'cancelled', cancel_reason: 'draft_changed' },
        { reason: 'draft_changed' },
        'The draft changed after you asked',
      ],
      [
        'failed',
        {
          status: 'waiting',
          outcome: 'failed',
          failed_at: '2026-11-06T10:00:00Z',
          error_id: 'E-42',
        },
        { error_id: 'E-42' },
        'Error ID: E-42',
      ],
    ])('answers a %s request', async (_case, change, extra, sentence) => {
      const id = await storedRequest((request) => ({ ...request, ...change }));
      const { isError, structured, text } = await callTool(
        'check_approval',
        { request_id: id },
        BEARERS.drafts
      );
      expect(isError).toBe(false);
      const expected = {
        status: change.status,
        outcome: change.outcome,
        ...extra,
      };
      expect(structured.request).toMatchObject(expected);
      if (!('reason' in extra)) expect(structured.request).not.toHaveProperty('reason');
      if (!('error_id' in extra)) expect(structured.request).not.toHaveProperty('error_id');
      expect(structured.urls).toBeNull();
      expect(text).toContain(sentence);
    });

    it('answers a done reactivate with the connection URLs, which work again', async () => {
      const id = await storedRequest(
        (request) => ({ ...request, status: 'done', outcome: 'done' }),
        IDS.deactivated,
        'reactivate',
        BEARERS.manage
      );
      const dog = fake.store.connections.get(IDS.deactivated) as FormConnection;
      fake.store.connections.set(IDS.deactivated, { ...dog, is_active: true });
      const { structured, text } = await callTool(
        'check_approval',
        { request_id: id },
        BEARERS.manage
      );
      expect(structured.request).toMatchObject({
        action: 'reactivate',
        outcome: 'done',
        connection: { id: IDS.deactivated, status: 'live' },
      });
      expect(structured.urls).toEqual({
        trigger_url: dog.trigger_url,
        variants: [
          {
            id: IDS.deactivatedStandard,
            name: 'Standard',
            link: links.variantLink(IDS.deactivated, IDS.deactivatedStandard),
            pull_url: dog.branches[0].pull_url,
          },
        ],
      });
      expect(text).toContain('the connection is live again');
      expect(text).toContain(`Trigger URL: ${dog.trigger_url}`);
    });

    it("fills a scheduled connection's start into the URLs' note", async () => {
      const id = await storedRequest(
        (request) => ({ ...request, status: 'done', outcome: 'done' }),
        IDS.deactivated,
        'reactivate',
        BEARERS.manage
      );
      // The connection was scheduled since: inactive, with a start day
      const dog = fake.store.connections.get(IDS.deactivated) as FormConnection;
      fake.store.connections.set(IDS.deactivated, { ...dog, start_date: '2026-12-01' });
      const { structured, text } = await callTool(
        'check_approval',
        { request_id: id },
        BEARERS.manage
      );
      expect(structured.request.connection).toMatchObject({
        id: IDS.deactivated,
        status: 'scheduled',
      });
      expect(structured.urls?.trigger_url).toBe(dog.trigger_url);
      expect(text).toContain(
        `Connection 'Dog licence' (scheduled from 2026-12-01): ` +
          links.connectionLink(IDS.deactivated)
      );
      expect(text).toContain(
        'This connection is scheduled: its URLs answer "unavailable" until it becomes active ' +
          'on 2026-12-01, 00:00 in Germany.'
      );
      expect(text).not.toContain('{date}');
    });

    it.each<[string, string, string, Partial<ApprovalRequest>, boolean]>([
      ['a done deactivate', IDS.live, 'deactivate', { status: 'done', outcome: 'done' }, false],
      ['a waiting reactivate', IDS.deactivated, 'reactivate', {}, false],
      [
        'a declined reactivate',
        IDS.deactivated,
        'reactivate',
        { status: 'declined', outcome: 'declined' },
        false,
      ],
      ['a waiting delete', IDS.live, 'delete', {}, true],
    ])(
      'answers no URLs for %s, although the backend gives them',
      async (_case, connection, action, change, active) => {
        const id = await storedRequest(
          (request) => ({ ...request, ...change }),
          connection,
          action,
          BEARERS.manage
        );
        const fc = fake.store.connections.get(connection) as FormConnection;
        fake.store.connections.set(connection, { ...fc, is_active: active });
        const { isError, structured, text } = await callTool(
          'check_approval',
          { request_id: id },
          BEARERS.manage
        );
        expect(isError).toBe(false);
        expect(structured.request).toMatchObject({ action, connection: { id: connection } });
        expect(structured.urls).toBeNull();
        expect(text).not.toContain('Trigger URL');
      }
    );

    it.each([
      ['connection_changed', 'The connection was deactivated or reactivated since you asked'],
      ['connection_deleted', 'The connection has been deleted since you asked.'],
    ])('answers a status action cancelled with %s', async (reason, sentence) => {
      const id = await storedRequest(
        (request) => ({
          ...request,
          status: 'cancelled',
          outcome: 'cancelled',
          cancel_reason: reason,
        }),
        IDS.live,
        'deactivate',
        BEARERS.manage
      );
      const { structured, text } = await callTool(
        'check_approval',
        { request_id: id },
        BEARERS.manage
      );
      expect(structured.request).toMatchObject({ outcome: 'cancelled', reason });
      expect(structured.urls).toBeNull();
      expect(text).toContain(sentence);
    });

    it("answers not_found for another caller's request", async () => {
      const id = await storedRequest((request) => request);
      const { structured } = await callTool('check_approval', { request_id: id }, BEARERS.manage);
      expect(structured.code).toBe('not_found');
    });

    it('refuses the read caller with insufficient_access', async () => {
      const { structured } = await callTool(
        'check_approval',
        { request_id: '44444444-4444-4444-8444-444444444444' },
        BEARERS.read
      );
      expect(structured).toMatchObject({
        code: 'insufficient_access',
        needs_access_level: 'drafts',
      });
    });

    it("refuses a connection's link, which names no approval request", async () => {
      const { structured } = await callTool(
        'check_approval',
        { request_id: links.connectionLink(IDS.draft) },
        BEARERS.drafts
      );
      expect(structured.code).toBe('validation');
    });
  });
});

describe('the checks and tests', () => {
  type Findings = typeof import('../src/findings');
  type Views = typeof import('../src/views');
  let findings: Findings;
  let views: Views;

  beforeAll(async () => {
    links = await import('../src/links');
    findings = await import('../src/findings');
    views = await import('../src/views');
  });

  afterEach(() => fake.reset());

  /** The checks' draft: its own id, beside the fixtures */
  const CHECKS_ID = '44444444-4444-4444-8444-444444444444';
  const CHECKS_STANDARD = '44444444-4444-4444-8444-4444444444a1';
  const CHECKS_PILOT = '44444444-4444-4444-8444-4444444444a2';
  const AGE: Condition = { operator: 'at_least_years_ago', years: 18 };

  /**
   * A draft that requests the fixture's data (pid: birthdate, address_locality). Standard: Rule 01
   * and its duplicate Rule 02, Rule 03 without a condition, Rule 04 on data not requested, Rule 07
   * without data. Pilot, started empty: Rule 05 and Rule 06 on the city, which conflict, so that
   * no citizen can meet it
   */
  function checksDraft(): FormConnectionDraft {
    const base = storedDraft();
    const city = (number: number, value: string) =>
      rule(number, target('pid', 'address_locality'), { operator: 'equal_to', value });
    const draft: FormConnectionDraft = {
      ...base,
      id: CHECKS_ID,
      name: 'Checked permit',
      branches: [
        {
          ...base.branches[0],
          id: CHECKS_STANDARD,
          items: [
            rule(1, target('pid', 'birthdate'), AGE),
            rule(2, target('pid', 'birthdate'), AGE),
            rule(3, target('pid', 'address_locality'), null),
            rule(4, target('pid', 'family_name'), { operator: 'equal_to', value: 'Muster' }),
            rule(7, null, null),
          ],
        },
        {
          ...base.branches[2],
          id: CHECKS_PILOT,
          items: [city(5, 'Stuttgart'), city(6, 'Esslingen')],
        },
      ],
      next_rule_number: 8,
    };
    fake.store.connections.set(CHECKS_ID, draft);
    return draft;
  }

  function contextOf(draft: FormConnectionDraft) {
    return views.ruleContextOf(draft.documents, fake.store.documentTypes, fake.store.optionSets);
  }

  /** check_rules' answer for one variant, from checkBranch() directly, in time */
  function directCheck(draft: FormConnectionDraft, index: number, day: string) {
    const branch = draft.branches[index];
    const context = contextOf(draft);
    const checked = buildCheckedBranch(
      {
        key: branch.id ?? '',
        origin: branch.origin,
        operator: branch.operator,
        items: branch.items,
      },
      context,
      day
    );
    const check = checkBranch(checked, { deadline: Number.POSITIVE_INFINITY, now: () => 0 });
    return findings.variantCheckOf(check, branch, context, draft);
  }

  function itemRef(connectionId: string, variantId: string, id: string, name: string) {
    return {
      id,
      type: id.startsWith('rule-') ? 'rule' : 'group',
      name,
      link: links.itemLink(connectionId, variantId, id),
    };
  }

  describe('check_rules', () => {
    it("equals checkBranch()'s findings mapped directly, for every variant, as the read caller", async () => {
      const draft = checksDraft();
      const { isError, structured, text } = await callTool(
        'check_rules',
        { connection: CHECKS_ID },
        BEARERS.read
      );
      expect(isError).toBe(false);
      const day = structured.day as string;
      expect(day).toBe(todayInGermany());
      expect(structured.connection).toEqual({
        id: CHECKS_ID,
        name: 'Checked permit',
        status: 'draft',
        link: links.connectionLink(CHECKS_ID),
      });
      expect(structured.variants).toEqual([directCheck(draft, 0, day), directCheck(draft, 1, day)]);

      const [standard, pilot] = structured.variants;
      expect(standard.checked_completely).toBe(true);
      expect(standard.findings).toEqual([
        expect.objectContaining({
          item: itemRef(CHECKS_ID, CHECKS_STANDARD, 'rule-2', 'Rule 02'),
          kind: 'redundant',
          involves: [itemRef(CHECKS_ID, CHECKS_STANDARD, 'rule-1', 'Rule 01')],
          resolution: 'You can delete Rule 02; Rule 01 already covers it.',
        }),
      ]);
      expect(pilot.notice).toEqual(
        expect.objectContaining({ kind: 'none_can_meet', resolution: expect.any(String) })
      );
      expect(pilot.findings).toContainEqual(
        expect.objectContaining({ kind: 'conflicting', resolution: expect.any(String) })
      );
      expect(text).toContain("Variant 'Pilot'");
    });

    it('lists a rule without a condition and one on unrequested data in not_covered, with why', async () => {
      checksDraft();
      const { structured } = await callTool('check_rules', {
        connection: CHECKS_ID,
        variant: 'standard',
      });
      expect(structured.variants).toHaveLength(1);
      const notCovered = structured.variants[0].not_covered;
      expect(notCovered).toEqual([
        {
          item: itemRef(CHECKS_ID, CHECKS_STANDARD, 'rule-3', 'Rule 03'),
          reason: 'condition_incomplete',
          text: expect.stringMatching(/^Rule 03 in Standard: /),
        },
        {
          item: itemRef(CHECKS_ID, CHECKS_STANDARD, 'rule-4', 'Rule 04'),
          reason: 'data_not_requested',
          text: 'Rule 04 in Standard checks data that’s no longer requested.',
        },
        {
          item: itemRef(CHECKS_ID, CHECKS_STANDARD, 'rule-7', 'Rule 07'),
          reason: 'no_data',
          text: 'Rule 07 in Standard: choose the data to check.',
        },
      ]);
    });

    it('answers not_found for a variant the connection lacks', async () => {
      checksDraft();
      const { isError, structured } = await callTool('check_rules', {
        connection: CHECKS_ID,
        variant: 'Nowhere',
      });
      expect(isError).toBe(true);
      expect(structured.code).toBe('not_found');
    });
  });

  describe('test_applicants', () => {
    const ANNA = {
      name: 'Anna',
      values: { 'pid.birthdate': '2000-01-01', 'pid.address_locality': 'Stuttgart' },
    };
    const BEN = {
      name: 'Ben',
      values: { 'pid.birthdate': '2000-01-01', 'pid.address_locality': 'Esslingen' },
    };
    const UNNAMED = { values: { 'pid.address_locality': 'Stuttgart' } };

    /** What evaluateBranch() decides for the fixture draft's Standard, as the tool answers it */
    function expectedResult(
      label: string,
      documents: Record<string, Record<string, unknown>>,
      day: string
    ) {
      const draft = storedDraft();
      const branch = draft.branches[0];
      const evaluation = evaluateBranch(branch, documents, dayNumber(day), contextOf(draft));
      const ref = (item: RuleTreeItem) => itemRef(IDS.draft, IDS.draftStandard, item.id, item.name);
      return {
        applicant: label,
        met: evaluation.met,
        items: evaluation.items.map(({ item, outcome, group }) =>
          expect.objectContaining({ item: ref(item), outcome, in_group: group })
        ),
        messages: evaluation.messages.map(({ id, message }) => {
          const item = branch.items.find((entry) => entry.id === id) as RuleTreeItem;
          return { item: ref(item), message };
        }),
      };
    }

    it('equals evaluateBranch() for three citizens, today in Germany, as the read caller', async () => {
      const { isError, structured } = await callTool(
        'test_applicants',
        { connection: IDS.draft, variant: 'Standard', applicants: [ANNA, BEN, UNNAMED] },
        BEARERS.read
      );
      expect(isError).toBe(false);
      const day = todayInGermany();
      expect(structured.day).toBe(day);
      expect(structured.variant).toEqual({
        id: IDS.draftStandard,
        name: 'Standard',
        link: links.variantLink(IDS.draft, IDS.draftStandard),
      });
      expect(structured.results).toEqual([
        expectedResult(
          'Anna',
          { pid: { birthdate: '2000-01-01', address_locality: 'Stuttgart' } },
          day
        ),
        expectedResult(
          'Ben',
          { pid: { birthdate: '2000-01-01', address_locality: 'Esslingen' } },
          day
        ),
        expectedResult('Citizen 3', { pid: { address_locality: 'Stuttgart' } }, day),
      ]);
      const [anna, ben, unnamed] = structured.results;
      expect(anna.met).toBe(true);
      expect(anna.messages).toEqual([]);
      expect(ben.met).toBe(false);
      expect(ben.messages.map((entry: { message: string }) => entry.message)).toEqual([
        'You must live in Stuttgart.',
      ]);
      expect(unnamed.items[0]).toEqual({
        item: itemRef(IDS.draft, IDS.draftStandard, 'rule-1', 'Rule 01'),
        outcome: 'not_checked',
        reason: "The citizen has no value for 'pid.birthdate'.",
        in_group: null,
      });
    });

    it('uses the day given', async () => {
      const day = '2017-12-31';
      const { structured } = await callTool('test_applicants', {
        connection: IDS.draft,
        variant: IDS.draftStandard,
        applicants: [ANNA],
        day,
      });
      expect(structured.day).toBe(day);
      expect(structured.results).toEqual([
        expectedResult(
          'Anna',
          { pid: { birthdate: '2000-01-01', address_locality: 'Stuttgart' } },
          day
        ),
      ]);
      expect(structured.results[0].met).toBe(false);
      expect(structured.results[0].items[0].outcome).toBe('not_met');
    });

    it('refuses a bad date with validation, naming the citizen, the field and the kind', async () => {
      const { isError, structured } = await callTool('test_applicants', {
        connection: IDS.draft,
        variant: 'Standard',
        applicants: [BEN, { name: 'Anna', values: { 'pid.birthdate': '01.01.2000' } }],
      });
      expect(isError).toBe(true);
      expect(structured).toEqual({
        code: 'validation',
        message: "Citizen 'Anna': 'pid.birthdate' expects a date as YYYY-MM-DD.",
      });
    });

    it('refuses a day that is no date with validation', async () => {
      const { isError, structured } = await callTool('test_applicants', {
        connection: IDS.draft,
        variant: 'Standard',
        applicants: [ANNA],
        day: '2026-02-30',
      });
      expect(isError).toBe(true);
      expect(structured).toEqual({
        code: 'validation',
        message: "'day' expects a date as YYYY-MM-DD.",
      });
    });

    it('refuses a variant whose rules the evaluation can’t take, with the first problem', async () => {
      checksDraft();
      const { isError, structured } = await callTool('test_applicants', {
        connection: CHECKS_ID,
        variant: 'Standard',
        applicants: [{ values: {} }],
      });
      expect(isError).toBe(true);
      expect(structured.code).toBe('validation');
      expect(structured.message).toMatch(
        /^Rule 03 in Standard: .* The variant can be tested once its rules are complete\.$/
      );
    });

    it('takes at most 10 citizens', async () => {
      const { isError } = await callTool('test_applicants', {
        connection: IDS.draft,
        variant: 'Standard',
        applicants: Array.from({ length: 11 }, () => ANNA),
      });
      expect(isError).toBe(true);
    });
  });
});
