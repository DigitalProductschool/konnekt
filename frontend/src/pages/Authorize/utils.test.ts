import type { AccessLevel } from '@konnekt/api-types/agent-access';
import type { OauthClientView } from '@konnekt/api-types/oauth';
import { describe, expect, it } from 'vitest';

import { ApiError } from '../../api/client';
import { CONSENT_COPY } from './constants';
import type { ConsentState } from './types';
import {
  consentReducer,
  initialConsentState,
  isInvalidRequestError,
  isStepUp,
  nameSourceOf,
  preselectedLevelOf,
  redirectTargetOf,
  requestedLevelOf,
  requestOf,
} from './utils';

const FULL_QUERY =
  'response_type=code&client_id=https%3A%2F%2Fclaude.ai%2Fclient.json' +
  '&redirect_uri=http%3A%2F%2F127.0.0.1%3A3118%2Fcallback&code_challenge=abc' +
  '&code_challenge_method=S256&state=xyz&scope=read+drafts' +
  '&resource=https%3A%2F%2Fportal.example%2Fmcp';

function paramsWithout(...names: string[]): URLSearchParams {
  const params = new URLSearchParams(FULL_QUERY);
  names.forEach((name) => params.delete(name));
  return params;
}

const CLIENT: OauthClientView = {
  client_id: 'https://claude.ai/client.json',
  client_name: 'Claude Code',
  kind: 'cimd',
  current_access_level: null,
};

function ready(overrides: Partial<Extract<ConsentState, { status: 'ready' }>> = {}): ConsentState {
  return {
    status: 'ready',
    client: CLIENT,
    level: 'read',
    sending: false,
    leaving: null,
    error: null,
    ...overrides,
  };
}

describe('requestOf', () => {
  it('reads every parameter of a complete request', () => {
    expect(requestOf(new URLSearchParams(FULL_QUERY), 'en')).toEqual({
      ok: true,
      request: {
        client_id: 'https://claude.ai/client.json',
        redirect_uri: 'http://127.0.0.1:3118/callback',
        code_challenge: 'abc',
        code_challenge_method: 'S256',
        state: 'xyz',
        scope: 'read drafts',
        resource: 'https://portal.example/mcp',
      },
    });
  });

  it('accepts a request without a scope, as an empty one', () => {
    const reading = requestOf(paramsWithout('scope'), 'en');
    expect(reading.ok && reading.request.scope).toBe('');
  });

  it('names what is missing, in the order of the request', () => {
    expect(requestOf(paramsWithout('state', 'client_id'), 'en')).toEqual({
      ok: false,
      message: 'The request is missing client_id, state.',
    });
    expect(requestOf(new URLSearchParams(), 'en')).toEqual({
      ok: false,
      message: CONSENT_COPY.en.missing([
        'response_type',
        'client_id',
        'redirect_uri',
        'code_challenge',
        'code_challenge_method',
        'state',
        'resource',
      ]),
    });
  });

  it('counts an empty parameter as missing', () => {
    const params = new URLSearchParams(FULL_QUERY);
    params.set('resource', '');
    expect(requestOf(params, 'en')).toEqual({
      ok: false,
      message: 'The request is missing resource.',
    });
  });

  it('refuses a response type other than code', () => {
    const params = new URLSearchParams(FULL_QUERY);
    params.set('response_type', 'token');
    expect(requestOf(params, 'en')).toEqual({ ok: false, message: CONSENT_COPY.en.responseType });
  });

  it('says why in German, with the verb agreeing with what is missing', () => {
    expect(requestOf(paramsWithout('state'), 'de')).toEqual({
      ok: false,
      message: 'In der Anfrage fehlt state.',
    });
    expect(requestOf(paramsWithout('state', 'client_id'), 'de')).toEqual({
      ok: false,
      message: 'In der Anfrage fehlen client_id, state.',
    });
    const params = new URLSearchParams(FULL_QUERY);
    params.set('response_type', 'token');
    expect(requestOf(params, 'de')).toEqual({
      ok: false,
      message: 'Die Anfrage muss einen Autorisierungscode anfordern (response_type=code).',
    });
  });

  it('reads the same request in either language', () => {
    expect(requestOf(new URLSearchParams(FULL_QUERY), 'de')).toEqual(
      requestOf(new URLSearchParams(FULL_QUERY), 'en')
    );
  });
});

describe('requestedLevelOf', () => {
  it('maps the levels’ scopes to their levels', () => {
    expect(requestedLevelOf('read drafts manage')).toBe('manage');
    expect(requestedLevelOf('read drafts')).toBe('drafts');
    expect(requestedLevelOf('read')).toBe('read');
  });

  it('asks for "Read only" without a scope', () => {
    expect(requestedLevelOf('')).toBe('read');
    expect(requestedLevelOf(null)).toBe('read');
    expect(requestedLevelOf(undefined)).toBe('read');
    expect(requestedLevelOf('profile')).toBe('read');
  });

  it('takes the highest level named, in any order and spacing', () => {
    expect(requestedLevelOf('manage  read drafts')).toBe('manage');
    expect(requestedLevelOf(' drafts read ')).toBe('drafts');
  });
});

describe('isStepUp', () => {
  it('is no step-up without an existing connection', () => {
    expect(isStepUp(null, 'manage')).toBe(false);
  });

  it('is a step-up when the requested level is above the current one', () => {
    expect(isStepUp('read', 'drafts')).toBe(true);
    expect(isStepUp('read', 'manage')).toBe(true);
    expect(isStepUp('drafts', 'manage')).toBe(true);
  });

  it('is no step-up for the same or a lower level', () => {
    expect(isStepUp('drafts', 'drafts')).toBe(false);
    expect(isStepUp('manage', 'read')).toBe(false);
  });
});

const LEVELS: AccessLevel[] = ['read', 'drafts', 'manage'];

describe('preselectedLevelOf', () => {
  it('preselects "Read only" for a client without a connection, whatever is requested', () => {
    expect(preselectedLevelOf('read', null)).toBe('read');
    expect(preselectedLevelOf('drafts', null)).toBe('read');
    expect(preselectedLevelOf('manage', null)).toBe('read');
  });

  it('preselects the requested level for a client with a connection, above or below it', () => {
    for (const current of LEVELS) {
      for (const requested of LEVELS) {
        expect(preselectedLevelOf(requested, current)).toBe(requested);
      }
    }
  });

  it('leaves the step-up to the requested level, so a first connection is never one', () => {
    // A first connection asking for manage: "Read only" checked, no step-up line
    expect(preselectedLevelOf('manage', null)).toBe('read');
    expect(isStepUp(null, 'manage')).toBe(false);
    // A step-up: the requested level checked, and the line says the client asks for more
    expect(preselectedLevelOf('manage', 'read')).toBe('manage');
    expect(isStepUp('read', 'manage')).toBe(true);
  });
});

describe('redirectTargetOf', () => {
  it('names the host of an https redirect URI, never its path, query or port', () => {
    expect(redirectTargetOf('https://claude.ai/api/mcp/auth_callback')).toEqual({
      kind: 'web',
      host: 'claude.ai',
    });
    expect(redirectTargetOf('https://agent.example:8443/cb?state=secret#x')).toEqual({
      kind: 'web',
      host: 'agent.example',
    });
  });

  it('names the real host, never the user info before an @', () => {
    expect(redirectTargetOf('https://evil@good.example/')).toEqual({
      kind: 'web',
      host: 'good.example',
    });
    expect(redirectTargetOf('https://good.example@evil.example/cb')).toEqual({
      kind: 'web',
      host: 'evil.example',
    });
    expect(redirectTargetOf('https://good.example:secret@evil.example/cb')).toEqual({
      kind: 'web',
      host: 'evil.example',
    });
  });

  it('names the host the browser goes to where a backslash ends it', () => {
    // The browser reads `\` as `/` in an https URI: the rest is the path
    expect(redirectTargetOf('https://good.example\\@evil.example/cb')).toEqual({
      kind: 'web',
      host: 'good.example',
    });
  });

  it('writes the host in lower case, and an international name in its xn-- form', () => {
    expect(redirectTargetOf('HTTPS://Good.EXAMPLE/Callback')).toEqual({
      kind: 'web',
      host: 'good.example',
    });
    expect(redirectTargetOf('https://bücher.example/cb')).toEqual({
      kind: 'web',
      host: 'xn--bcher-kva.example',
    });
    // A look-alike in another script stays visibly different
    expect(redirectTargetOf('https://аpple.com/cb')).toEqual({
      kind: 'web',
      host: 'xn--pple-43d.com',
    });
  });

  it('calls a loopback redirect URI an app on this computer, in both spellings and any port', () => {
    expect(redirectTargetOf('http://127.0.0.1:3118/callback')).toEqual({ kind: 'loopback' });
    expect(redirectTargetOf('http://localhost:33418/')).toEqual({ kind: 'loopback' });
    expect(redirectTargetOf('http://127.0.0.1/callback')).toEqual({ kind: 'loopback' });
    expect(redirectTargetOf('http://LOCALHOST:8080/cb')).toEqual({ kind: 'loopback' });
    expect(redirectTargetOf('https://localhost:8443/cb')).toEqual({ kind: 'loopback' });
    expect(redirectTargetOf('http://[::1]:8080/cb')).toEqual({ kind: 'loopback' });
    // Other spellings of 127.0.0.0/8, as the browser reads them
    expect(redirectTargetOf('https://127.1/cb')).toEqual({ kind: 'loopback' });
    expect(redirectTargetOf('https://0x7f000001/cb')).toEqual({ kind: 'loopback' });
    expect(redirectTargetOf('http://127.10.0.2:9000/')).toEqual({ kind: 'loopback' });
  });

  it('names the host of a name that only starts or ends like a loopback one', () => {
    expect(redirectTargetOf('https://127.0.0.1.nip.io/cb')).toEqual({
      kind: 'web',
      host: '127.0.0.1.nip.io',
    });
    expect(redirectTargetOf('https://localhost.evil.example/cb')).toEqual({
      kind: 'web',
      host: 'localhost.evil.example',
    });
    expect(redirectTargetOf('https://evil-localhost/cb')).toEqual({
      kind: 'web',
      host: 'evil-localhost',
    });
  });

  it('names the host of a plain http redirect URI, which the server refuses anyway', () => {
    expect(redirectTargetOf('http://evil.example/cb')).toEqual({
      kind: 'web',
      host: 'evil.example',
    });
  });

  it('names the scheme of an app’s own redirect URI, in lower case with its colon', () => {
    expect(redirectTargetOf('cursor://anysphere.cursor-retrieval/oauth/callback')).toEqual({
      kind: 'app',
      scheme: 'cursor:',
    });
    expect(redirectTargetOf('vscode://vscode.github-authentication/did-authenticate')).toEqual({
      kind: 'app',
      scheme: 'vscode:',
    });
    expect(redirectTargetOf('com.example.app:/oauth2redirect')).toEqual({
      kind: 'app',
      scheme: 'com.example.app:',
    });
    expect(redirectTargetOf('Cursor://x/cb?state=secret')).toEqual({
      kind: 'app',
      scheme: 'cursor:',
    });
  });

  it('names nothing for a URI that can’t be parsed or that the browser runs itself', () => {
    expect(redirectTargetOf('')).toEqual({ kind: 'unknown' });
    expect(redirectTargetOf('not a uri')).toEqual({ kind: 'unknown' });
    expect(redirectTargetOf('//evil.example/cb')).toEqual({ kind: 'unknown' });
    expect(redirectTargetOf('/callback')).toEqual({ kind: 'unknown' });
    expect(redirectTargetOf('https://')).toEqual({ kind: 'unknown' });
    expect(redirectTargetOf('https://exa mple.com/')).toEqual({ kind: 'unknown' });
    expect(redirectTargetOf('javascript:alert(1)')).toEqual({ kind: 'unknown' });
    expect(redirectTargetOf('JavaScript:alert(1)')).toEqual({ kind: 'unknown' });
    expect(redirectTargetOf('data:text/html,hi')).toEqual({ kind: 'unknown' });
    expect(redirectTargetOf('file:///etc/passwd')).toEqual({ kind: 'unknown' });
    expect(redirectTargetOf('blob:https://evil.example/1')).toEqual({ kind: 'unknown' });
    expect(redirectTargetOf('about:blank')).toEqual({ kind: 'unknown' });
  });
});

describe('nameSourceOf', () => {
  it('says a dynamically registered client registered itself', () => {
    expect(nameSourceOf({ kind: 'dcr', client_id: 'cp_client_3f2c9a7e' })).toEqual({
      kind: 'registered',
    });
  });

  it('names the host that publishes a metadata document’s name', () => {
    expect(nameSourceOf(CLIENT)).toEqual({ kind: 'published', host: 'claude.ai' });
    expect(
      nameSourceOf({ kind: 'cimd', client_id: 'https://Evil@Agents.Example:8443/client.json' })
    ).toEqual({ kind: 'published', host: 'agents.example' });
  });

  it('counts a document client id the page can’t read as registered', () => {
    expect(nameSourceOf({ kind: 'cimd', client_id: 'not a url' })).toEqual({
      kind: 'registered',
    });
    expect(nameSourceOf({ kind: 'cimd', client_id: 'http://agents.example/c.json' })).toEqual({
      kind: 'registered',
    });
  });
});

describe('the client facts’ copy', () => {
  it('composes the sentences around a host or a scheme with one space before it', () => {
    const compose = (before: string, emphasis: string, after: string) =>
      `${before} ${emphasis}${after}`;
    const { en, de } = CONSENT_COPY;
    expect(compose(en.goesToWeb, 'claude.ai', en.goesToWebEnd)).toBe(
      'After you answer, your browser goes to claude.ai.'
    );
    expect(compose(de.goesToWeb, 'claude.ai', de.goesToWebEnd)).toBe(
      'Nach Ihrer Antwort wechselt Ihr Browser zu claude.ai.'
    );
    expect(compose(en.goesToApp, 'cursor:', en.goesToAppEnd)).toBe(
      'After you answer, your browser opens the app on this computer that handles cursor: links.'
    );
    expect(compose(de.goesToApp, 'cursor:', de.goesToAppEnd)).toBe(
      'Nach Ihrer Antwort öffnet Ihr Browser die App auf diesem Computer, die cursor:\u2011Links ' +
        'verarbeitet.'
    );
    expect(compose(en.namePublished, 'claude.ai', en.namePublishedEnd)).toBe(
      'The agent chose this name itself and publishes it on claude.ai.'
    );
    expect(compose(de.namePublished, 'claude.ai', de.namePublishedEnd)).toBe(
      'Der Agent hat diesen Namen selbst gewählt und veröffentlicht ihn auf claude.ai.'
    );
  });
});

describe('isInvalidRequestError', () => {
  it('matches a 400 invalid_request and a 404 invalid_client', () => {
    expect(
      isInvalidRequestError(new ApiError(400, { error: 'invalid_request', message: 'Bad' }))
    ).toBe(true);
    expect(
      isInvalidRequestError(new ApiError(404, { error: 'invalid_client', message: 'Unknown' }))
    ).toBe(true);
  });

  it('leaves other failures to the generic notice', () => {
    expect(isInvalidRequestError(new ApiError(500, { error: 'x', message: 'Oops' }))).toBe(false);
    expect(
      isInvalidRequestError(new ApiError(401, { error: 'Unauthorized', message: 'Sign in' }))
    ).toBe(false);
    expect(
      isInvalidRequestError(new ApiError(404, { error: 'not_found', message: 'Missing' }))
    ).toBe(false);
    expect(isInvalidRequestError(new TypeError('Failed to fetch'))).toBe(false);
  });
});

describe('initialConsentState', () => {
  it('loads the client for a usable request', () => {
    expect(initialConsentState(requestOf(new URLSearchParams(FULL_QUERY), 'en'))).toEqual({
      status: 'loading',
    });
  });

  it('shows the alert for a request it can’t use', () => {
    expect(initialConsentState(requestOf(paramsWithout('state'), 'en'))).toEqual({
      status: 'invalid',
      message: 'The request is missing state.',
    });
  });
});

describe('consentReducer', () => {
  it('shows the form at "Read only" for a client without a connection, whatever it asks for', () => {
    expect(
      consentReducer({ status: 'loading' }, { type: 'loaded', client: CLIENT, requested: 'drafts' })
    ).toEqual(ready({ level: 'read' }));
    expect(
      consentReducer({ status: 'loading' }, { type: 'loaded', client: CLIENT, requested: 'manage' })
    ).toEqual(ready({ level: 'read' }));
  });

  it('shows the form at the requested level for a client with a connection', () => {
    const connected: OauthClientView = { ...CLIENT, current_access_level: 'read' };
    expect(
      consentReducer(
        { status: 'loading' },
        { type: 'loaded', client: connected, requested: 'manage' }
      )
    ).toEqual(ready({ client: connected, level: 'manage' }));
  });

  it('changes the chosen level', () => {
    expect(consentReducer(ready(), { type: 'choose', level: 'manage' })).toEqual(
      ready({ level: 'manage' })
    );
  });

  it('keeps the level once the browser is leaving', () => {
    const leaving = ready({ leaving: 'allow' });
    expect(consentReducer(leaving, { type: 'choose', level: 'manage' })).toBe(leaving);
  });

  it('clears an earlier error when a decision is sent', () => {
    expect(consentReducer(ready({ error: { message: 'Oops' } }), { type: 'send' })).toEqual(
      ready({ sending: true })
    );
  });

  it('records the decision the browser leaves with', () => {
    expect(consentReducer(ready({ sending: true }), { type: 'sent', decision: 'deny' })).toEqual(
      ready({ leaving: 'deny' })
    );
  });

  it('shows a failure and lets the decision be sent again', () => {
    const notice = { message: 'Something went wrong', error_id: 'abc123' };
    expect(consentReducer(ready({ sending: true }), { type: 'sendFailed', notice })).toEqual(
      ready({ error: notice })
    );
  });

  it('replaces the form with the alert for an invalid request', () => {
    expect(
      consentReducer(ready({ sending: true }), { type: 'invalid', message: 'Bad redirect' })
    ).toEqual({ status: 'invalid', message: 'Bad redirect' });
  });

  it('ignores form actions while the form isn’t shown', () => {
    const loading: ConsentState = { status: 'loading' };
    expect(consentReducer(loading, { type: 'send' })).toBe(loading);
    expect(consentReducer(loading, { type: 'choose', level: 'manage' })).toBe(loading);
  });
});
