import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BackendClient,
  BackendError,
  BrowserOnly,
  CATALOG_TTL_MS,
  clearCatalogCache,
  Conflict,
  InsufficientAccess,
  NotFound,
  RateLimited,
  Refused,
  Unauthorized,
} from './backend';

interface Seen {
  method: string;
  url: string;
  headers: IncomingMessage['headers'];
  body: string;
}

interface Reply {
  status: number;
  body?: unknown;
  raw?: string;
}

let server: Server;
let baseUrl: string;
let seen: Seen[] = [];
let reply: (request: Seen) => Reply = () => ({ status: 200, body: { data: null } });

beforeAll(async () => {
  server = createServer((request, response) => {
    let body = '';
    request.on('data', (chunk: Buffer) => (body += chunk.toString()));
    request.on('end', () => {
      const entry = {
        method: request.method ?? '',
        url: request.url ?? '',
        headers: request.headers,
        body,
      };
      seen.push(entry);
      const answer = reply(entry);
      response.writeHead(answer.status, { 'Content-Type': 'application/json' });
      response.end(answer.raw ?? JSON.stringify(answer.body));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  seen = [];
  clearCatalogCache();
  reply = () => ({ status: 200, body: { data: null } });
});

function client(): BackendClient {
  return new BackendClient('cp_at_secret', baseUrl);
}

async function failureOf(status: number, body: unknown): Promise<unknown> {
  reply = () => ({ status, body });
  return client()
    .get('/api/form-connections/1')
    .then(
      () => undefined,
      (error: unknown) => error
    );
}

describe('BackendClient', () => {
  it('sends the bearer and answers the data of the envelope', async () => {
    reply = () => ({ status: 200, body: { data: { id: 'c1' }, message: null } });

    await expect(client().get('/api/form-connections/c1')).resolves.toEqual({ id: 'c1' });
    expect(seen[0].method).toBe('GET');
    expect(seen[0].headers.authorization).toBe('Bearer cp_at_secret');
    expect(seen[0].headers['content-type']).toBeUndefined();
  });

  it('sends writes as JSON', async () => {
    reply = () => ({ status: 201, body: { data: { ok: true } } });

    await client().post('/api/form-connections/drafts', { name: 'A' });
    await client().put('/api/form-connections/c1/draft', { name: 'B' });
    await client().delete('/api/approval-requests/a1');

    expect(seen.map((each) => [each.method, each.headers['content-type'], each.body])).toEqual([
      ['POST', 'application/json', '{"name":"A"}'],
      ['PUT', 'application/json', '{"name":"B"}'],
      ['DELETE', 'application/json', ''],
    ]);
  });

  it('maps 401 to Unauthorized', async () => {
    const error = await failureOf(401, { error: 'Unauthorized', message: 'Sign in to continue' });
    expect(error).toBeInstanceOf(Unauthorized);
  });

  it('maps 403 insufficient_access to InsufficientAccess with the level', async () => {
    const message = "Changing drafts needs the access level 'Read and edit drafts'.";
    const error = await failureOf(403, {
      error: 'insufficient_access',
      message,
      needs_access_level: 'drafts',
    });
    expect(error).toBeInstanceOf(InsufficientAccess);
    expect(error).toMatchObject({ level: 'drafts', message });
  });

  it('maps 403 browser_only to BrowserOnly', async () => {
    const message = 'This action is done in the Connection Portal.';
    const error = await failureOf(403, { error: 'browser_only', message });
    expect(error).toBeInstanceOf(BrowserOnly);
    expect(error).toMatchObject({ message });
  });

  it('maps 404 to NotFound', async () => {
    const error = await failureOf(404, { error: 'Not found', message: 'Connection not found' });
    expect(error).toBeInstanceOf(NotFound);
  });

  it.each(['draft_changed', 'draft_published', 'not_allowed', 'approval_expired'])(
    'maps 409 %s to Conflict with its code',
    async (code) => {
      const error = await failureOf(409, { error: code, message: 'Not now.' });
      expect(error).toBeInstanceOf(Conflict);
      expect(error).toMatchObject({ code, message: 'Not now.' });
    }
  );

  it('maps 429 to RateLimited and 400 to Refused, with their messages', async () => {
    const limited = await failureOf(429, {
      error: 'rate_limited',
      message: 'This agent can create drafts again at 15:40.',
    });
    expect(limited).toBeInstanceOf(RateLimited);
    expect(limited).toMatchObject({ message: 'This agent can create drafts again at 15:40.' });

    const refused = await failureOf(400, {
      error: 'Validation error',
      message: 'Invalid request payload',
    });
    expect(refused).toBeInstanceOf(Refused);
    expect(refused).toMatchObject({ message: 'Invalid request payload' });
  });

  it('maps 5xx to BackendError with the error ID and never the exception text', async () => {
    const error = await failureOf(500, {
      error: 'Internal server error',
      message: 'psycopg.OperationalError: connection refused',
      error_id: 'e-123',
    });
    expect(error).toBeInstanceOf(BackendError);
    expect(error).toMatchObject({ errorId: 'e-123' });
    expect((error as Error).message).not.toContain('psycopg');
  });

  it('maps an unreadable answer to BackendError', async () => {
    reply = () => ({ status: 502, raw: '<html>Bad gateway</html>' });
    await expect(client().get('/api/x')).rejects.toBeInstanceOf(BackendError);

    reply = () => ({ status: 200, raw: 'not json' });
    await expect(client().get('/api/x')).rejects.toBeInstanceOf(BackendError);
  });

  it('maps no answer to BackendError without an error ID', async () => {
    const nobody = new BackendClient('cp_at_secret', 'http://127.0.0.1:1');
    const error = await nobody.get('/api/x').catch((failure: unknown) => failure);
    expect(error).toBeInstanceOf(BackendError);
    expect(error).toMatchObject({ errorId: undefined });
  });

  it('caches the document types and option sets, and nothing else', async () => {
    reply = (request) => ({ status: 200, body: { data: [request.url] } });

    await expect(client().documentTypes()).resolves.toEqual(['/api/document-types']);
    await expect(new BackendClient('cp_pat_other', baseUrl).documentTypes()).resolves.toEqual([
      '/api/document-types',
    ]);
    await client().optionSets();
    await client().optionSets();
    await client().get('/api/form-connections');
    await client().get('/api/form-connections');

    expect(seen.map((each) => each.url)).toEqual([
      '/api/document-types',
      '/api/option-sets',
      '/api/form-connections',
      '/api/form-connections',
    ]);
  });

  it('fetches the catalog again after 60 seconds', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    await client().optionSets();
    now.mockReturnValue(1_000_000 + CATALOG_TTL_MS - 1);
    await client().optionSets();
    now.mockReturnValue(1_000_000 + CATALOG_TTL_MS);
    await client().optionSets();
    now.mockRestore();

    expect(seen).toHaveLength(2);
  });

  it('does not cache a failed catalog call', async () => {
    reply = () => ({ status: 500, body: { error: 'x', message: 'y' } });
    await expect(client().documentTypes()).rejects.toBeInstanceOf(BackendError);

    reply = () => ({ status: 200, body: { data: [] } });
    await expect(client().documentTypes()).resolves.toEqual([]);
    expect(seen).toHaveLength(2);
  });
});
