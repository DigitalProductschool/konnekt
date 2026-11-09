import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { AgentMe } from '@connection-portal/api-types/agent-access';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  type Caller,
  callerOf,
  HttpRefusal,
  insufficientAccessError,
  LEVEL_NAMES,
  levelAllows,
  protectedResourceMetadata,
  stepUpResponse,
} from './auth';
import { BackendError } from './backend';
import { config } from './config';

const LEVELS = [
  { level: 'read', name: 'Read only', allows: 'Every read' },
  { level: 'drafts', name: 'Read and edit drafts', allows: 'Also drafts' },
  { level: 'manage', name: 'Read, edit drafts and manage live connections', allows: 'Also live' },
] as const;

const ME: AgentMe = {
  username: 'anna',
  client_name: 'Claude Code',
  kind: 'oauth',
  access_level: 'drafts',
  levels: [...LEVELS],
};

let server: Server;
let backendUrl: string;
let seenAuthorization: (string | undefined)[] = [];
let status = 200;

beforeAll(async () => {
  server = createServer((request, response) => {
    seenAuthorization.push(request.headers.authorization);
    const known = request.url === '/api/agent/me' && status === 200;
    response.writeHead(known ? 200 : status, { 'Content-Type': 'application/json' });
    response.end(
      JSON.stringify(
        known
          ? { data: ME }
          : status === 401
            ? { error: 'Unauthorized', message: 'Sign in to continue' }
            : { error: 'Internal server error', message: 'x', error_id: 'e-1' }
      )
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  backendUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  seenAuthorization = [];
  status = 200;
});

function caller(accessLevel: Caller['accessLevel']): Caller {
  return {
    token: 'cp_at_x',
    username: 'anna',
    clientName: null,
    kind: 'token',
    accessLevel,
    levels: [...LEVELS],
  };
}

async function refusalOf(promise: Promise<unknown>): Promise<HttpRefusal> {
  const error = await promise.catch((failure: unknown) => failure);
  expect(error).toBeInstanceOf(HttpRefusal);
  return error as HttpRefusal;
}

const UNAUTHORIZED = {
  status: 401,
  headers: {
    'WWW-Authenticate': `Bearer resource_metadata="${config.mcpOrigin}/.well-known/oauth-protected-resource/mcp"`,
  },
  body: null,
};

describe('callerOf', () => {
  it('resolves the bearer with GET /api/agent/me', async () => {
    const request = { headers: { authorization: 'Bearer cp_at_abc' } };

    await expect(callerOf(request, backendUrl)).resolves.toEqual({
      token: 'cp_at_abc',
      username: 'anna',
      clientName: 'Claude Code',
      kind: 'oauth',
      accessLevel: 'drafts',
      levels: LEVELS,
    });
    expect(seenAuthorization).toEqual(['Bearer cp_at_abc']);
  });

  it('reads the header of a web Request too', async () => {
    const request = new Request('http://localhost/mcp', {
      headers: { Authorization: 'bearer cp_pat_abc' },
    });
    await expect(callerOf(request, backendUrl)).resolves.toMatchObject({ token: 'cp_pat_abc' });
  });

  it.each([{}, { authorization: 'Basic YW5uYTp4' }, { authorization: 'Bearer ' }])(
    'answers 401 with the resource metadata and no body without a bearer (%o)',
    async (headers) => {
      const refusal = await refusalOf(callerOf({ headers }, backendUrl));
      expect(refusal.answer).toEqual(UNAUTHORIZED);
      expect(seenAuthorization).toEqual([]);
    }
  );

  it("answers 401 with the resource metadata on the backend's 401", async () => {
    status = 401;
    const request = { headers: { authorization: 'Bearer cp_at_expired' } };

    const refusal = await refusalOf(callerOf(request, backendUrl));
    expect(refusal.answer).toEqual(UNAUTHORIZED);
  });

  it("passes the backend's other failures on", async () => {
    status = 500;
    const request = { headers: { authorization: 'Bearer cp_at_abc' } };

    await expect(callerOf(request, backendUrl)).rejects.toBeInstanceOf(BackendError);
  });
});

describe('levelAllows', () => {
  it('orders the levels read < drafts < manage', () => {
    const allowed = (['read', 'drafts', 'manage'] as const).map((have) =>
      (['read', 'drafts', 'manage'] as const).map((need) => levelAllows(caller(have), need))
    );
    expect(allowed).toEqual([
      [true, false, false],
      [true, true, false],
      [true, true, true],
    ]);
  });
});

describe('insufficientAccessError', () => {
  it('names the current level, the level needed and the two ways to get it', () => {
    expect(insufficientAccessError(caller('read'), 'drafts')).toEqual({
      code: 'insufficient_access',
      message:
        "Your access is read only. Changing drafts needs the access level 'Read and edit " +
        "drafts'. Ask for it with request_access, or the team member raises it on their user " +
        'page.',
      needs_access_level: 'drafts',
    });
  });

  it('names what manage allows', () => {
    expect(insufficientAccessError(caller('drafts'), 'manage')).toEqual({
      code: 'insufficient_access',
      message:
        'Your access is read and edit drafts. Deactivating, reactivating and deleting ' +
        "published connections needs the access level 'Read, edit drafts and manage live " +
        "connections'. Ask for it with request_access, or the team member raises it on their " +
        'user page.',
      needs_access_level: 'manage',
    });
  });
});

describe('stepUpResponse', () => {
  it('answers 403 insufficient_scope with the scopes of drafts', () => {
    expect(stepUpResponse('drafts')).toEqual({
      status: 403,
      headers: {
        'WWW-Authenticate':
          'Bearer error="insufficient_scope", scope="read drafts", error_description="Changing ' +
          "drafts needs the access level 'Read and edit drafts'. Reconnect with that level, or " +
          'ask the team member to raise it on their user page."',
      },
      body: null,
    });
  });

  it('answers the scopes of manage', () => {
    const header = stepUpResponse('manage').headers['WWW-Authenticate'];
    expect(header).toContain('scope="read drafts manage"');
    expect(header).toContain(`'${LEVEL_NAMES.manage}'`);
  });
});

describe('protectedResourceMetadata', () => {
  it('names the resource, its issuer and the three scopes', () => {
    expect(protectedResourceMetadata()).toEqual({
      resource: config.mcpUrl,
      authorization_servers: [config.oauthIssuer],
      scopes_supported: ['read', 'drafts', 'manage'],
      bearer_methods_supported: ['header'],
      resource_name: 'Konnekt',
    });
  });
});
