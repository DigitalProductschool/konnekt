import type { OauthClientView } from '@connection-portal/api-types/oauth';
import { describe, expect, it } from 'vitest';

import { ApiError } from '../../api/client';
import { CONSENT_COPY } from './constants';
import type { ConsentState } from './types';
import {
  consentReducer,
  initialConsentState,
  isInvalidRequestError,
  isStepUp,
  preselectedLevelOf,
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

describe('preselectedLevelOf', () => {
  it('maps the levels’ scopes to their levels', () => {
    expect(preselectedLevelOf('read drafts manage')).toBe('manage');
    expect(preselectedLevelOf('read drafts')).toBe('drafts');
    expect(preselectedLevelOf('read')).toBe('read');
  });

  it('preselects "Read only" without a scope', () => {
    expect(preselectedLevelOf('')).toBe('read');
    expect(preselectedLevelOf(null)).toBe('read');
    expect(preselectedLevelOf(undefined)).toBe('read');
    expect(preselectedLevelOf('profile')).toBe('read');
  });

  it('takes the highest level named, in any order and spacing', () => {
    expect(preselectedLevelOf('manage  read drafts')).toBe('manage');
    expect(preselectedLevelOf(' drafts read ')).toBe('drafts');
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
  it('shows the form with the preselected level once the client is loaded', () => {
    expect(
      consentReducer({ status: 'loading' }, { type: 'loaded', client: CLIENT, level: 'drafts' })
    ).toEqual(ready({ level: 'drafts' }));
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
