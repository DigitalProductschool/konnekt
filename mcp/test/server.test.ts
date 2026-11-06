// The MCP server against the fake backend, over Streamable HTTP with the SDK's client (research
// R2, R19): the bearer, the two protocol eras, the sessions, the skills, and the tools. The tool
// tests of later phases add to this file
import type {
  FormConnectionDraft,
  RuleTreeItem,
} from '@connection-portal/api-types/form-connections';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { SkillsClient } from '@modelcontextprotocol/client/ext/skills';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type { RunningServer } from '../src/server';
import { BEARERS, type FakeBackend, IDS, startFakeBackend } from './fakeBackend';

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
        },
        {
          id: IDS.live,
          name: 'Fishing licence',
          status: 'live',
          link: links.connectionLink(IDS.live),
          updated_at: '2026-11-02T09:00:00Z',
        },
        {
          id: IDS.deactivated,
          name: 'Dog licence',
          status: 'deactivated',
          link: links.connectionLink(IDS.deactivated),
          updated_at: '2026-11-01T09:00:00Z',
        },
      ]);
      expect(text).toContain(links.connectionLink(IDS.live));
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
      expect(second.structured.items).toHaveLength(3);
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
        draft: { version: 1, step: 'rules', updated_at: '2026-11-03T09:00:00Z' },
      });
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
      expect(text).toContain('unavailable');
      expect(text).toContain('{reference}');
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
        message: "This link doesn't belong to this Connection Portal.",
      });
    });

    it('answers not_found for an unknown connection', async () => {
      const { structured } = await callTool('get_connection', {
        connection: '99999999-9999-4999-8999-999999999999',
      });
      expect(structured.code).toBe('not_found');
    });
  });

  describe('get_variant', () => {
    it('shows the marks of a based variant, with its items and applicant fields', async () => {
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
      expect(structured.items[1].statement).toContain('Esslingen');
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
