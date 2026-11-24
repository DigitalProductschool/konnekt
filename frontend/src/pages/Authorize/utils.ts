import type { AccessLevel } from '@konnekt/api-types/agent-access';
import type { OauthClientView } from '@konnekt/api-types/oauth';
import type { Language } from '@konnekt/rules/language';

import { ApiError } from '../../api/client';
import { CONSENT_COPY, INITIAL_CONSENT_STATE, REQUIRED_PARAMETERS } from './constants';
import type {
  ConsentAction,
  ConsentState,
  NameSource,
  RedirectTarget,
  RequestReading,
} from './types';

// The levels from the least to the most access
const LEVEL_ORDER: AccessLevel[] = ['read', 'drafts', 'manage'];

/**
 * Reads the authorization request from the page's query string (contracts/oauth.md
 * "Authorization"). Every parameter but `scope` is required, and an empty one counts as missing;
 * the server checks the values themselves. Why a request can't be used is worded in `language`.
 */
export function requestOf(searchParams: URLSearchParams, language: Language): RequestReading {
  const copy = CONSENT_COPY[language];
  const missing = REQUIRED_PARAMETERS.filter((name) => !searchParams.get(name));
  if (missing.length > 0) {
    return { ok: false, message: copy.missing(missing) };
  }
  if (searchParams.get('response_type') !== 'code') {
    return { ok: false, message: copy.responseType };
  }
  const value = (name: string) => searchParams.get(name) ?? '';
  return {
    ok: true,
    request: {
      client_id: value('client_id'),
      redirect_uri: value('redirect_uri'),
      code_challenge: value('code_challenge'),
      code_challenge_method: value('code_challenge_method'),
      state: value('state'),
      scope: value('scope'),
      resource: value('resource'),
    },
  };
}

/**
 * The level a requested scope asks for: the highest level its words name
 * (`read drafts manage` → `manage`, `read drafts` → `drafts`), "Read only" otherwise
 */
export function requestedLevelOf(scope: string | null | undefined): AccessLevel {
  const words = new Set((scope ?? '').split(/\s+/));
  if (words.has('manage')) return 'manage';
  if (words.has('drafts')) return 'drafts';
  return 'read';
}

/**
 * The level the form starts with (spec 012, research R6, finding 6): "Read only" for a client
 * the account has no connection with, whatever the request asks for, so that a first connection
 * gets more only when the member chooses it; the requested level for a client with a connection
 * (a step-up, or a lower level the member confirms)
 */
export function preselectedLevelOf(
  requested: AccessLevel,
  current: AccessLevel | null
): AccessLevel {
  return current === null ? 'read' : requested;
}

/**
 * Whether a client with an existing connection asks for more than that connection's level. It
 * compares the requested level, not the preselected one: with a connection they are the same
 */
export function isStepUp(current: AccessLevel | null, requested: AccessLevel): boolean {
  return current !== null && LEVEL_ORDER.indexOf(requested) > LEVEL_ORDER.indexOf(current);
}

// The loopback addresses a redirect URI's host may name, as `URL` writes them: `localhost`,
// 127.0.0.0/8 (`URL` turns `127.1` and `0x7f000001` into dotted quads) and `[::1]`
const LOOPBACK_HOSTNAME = /^(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])$/;

// Schemes the browser handles itself instead of handing the URI to an app; the server refuses
// them as redirect URIs (backend/app/services/oauth.py `_UNSAFE_SCHEMES`)
const BROWSER_SCHEMES = new Set([
  'javascript:',
  'data:',
  'vbscript:',
  'file:',
  'blob:',
  'about:',
  'filesystem:',
]);

/** `uri` parsed as the browser parses a URI it navigates to, or null */
function urlOf(uri: string): URL | null {
  try {
    return new URL(uri);
  } catch {
    return null;
  }
}

/**
 * Where the browser takes the answer, from the request's redirect URI (spec 012, research R6,
 * finding 6). The server accepts a decision only for a redirect URI that is one of the client's
 * and sends the browser to it with the code or the refusal added to its query, which leaves its
 * host as it is; the browser parses it as `URL` does. So the host shown is where any decision
 * that can succeed leads: the host itself, never the user info before an `@`, lower case, an
 * international name in its `xn--` form, without the port. A loopback host is an app on this
 * computer; another scheme an app the operating system opens for that scheme. A URI that can't
 * be parsed, or that the browser would run itself (`javascript:`), is `unknown`: the server
 * refuses it.
 */
export function redirectTargetOf(uri: string): RedirectTarget {
  const url = urlOf(uri);
  if (url === null || BROWSER_SCHEMES.has(url.protocol)) return { kind: 'unknown' };
  if (url.protocol === 'https:' || url.protocol === 'http:') {
    if (url.hostname === '') return { kind: 'unknown' };
    return LOOPBACK_HOSTNAME.test(url.hostname)
      ? { kind: 'loopback' }
      : { kind: 'web', host: url.hostname };
  }
  return { kind: 'app', scheme: url.protocol };
}

/**
 * Who gives the client's name (spec 012, research R6, finding 6). A dynamically registered
 * client registered itself; a Client ID Metadata Document's client is an `https://` URL whose
 * document gives the name, so its host is where the name is published. The server accepts only
 * such URLs as a document's client id; one the page can't parse counts as registered.
 */
export function nameSourceOf(client: Pick<OauthClientView, 'kind' | 'client_id'>): NameSource {
  if (client.kind === 'cimd') {
    const url = urlOf(client.client_id);
    if (url !== null && url.protocol === 'https:' && url.hostname !== '') {
      return { kind: 'published', host: url.hostname };
    }
  }
  return { kind: 'registered' };
}

/** A refusal of the request itself, which the page shows instead of redirecting */
export function isInvalidRequestError(error: unknown): error is ApiError {
  return (
    error instanceof ApiError &&
    ((error.status === 400 && error.data.error === 'invalid_request') ||
      (error.status === 404 && error.data.error === 'invalid_client'))
  );
}

/** Where the page starts: loading the client, or the alert for a request it can't use */
export function initialConsentState(reading: RequestReading): ConsentState {
  return reading.ok ? INITIAL_CONSENT_STATE : { status: 'invalid', message: reading.message };
}

export function consentReducer(state: ConsentState, action: ConsentAction): ConsentState {
  switch (action.type) {
    case 'loaded':
      return {
        status: 'ready',
        client: action.client,
        level: preselectedLevelOf(action.requested, action.client.current_access_level),
        sending: false,
        leaving: null,
        error: null,
      };
    case 'invalid':
      return { status: 'invalid', message: action.message };
    case 'failed':
      return { status: 'failed', notice: action.notice };
    case 'choose':
      return state.status === 'ready' && state.leaving === null
        ? { ...state, level: action.level }
        : state;
    case 'send':
      return state.status === 'ready' ? { ...state, sending: true, error: null } : state;
    case 'sent':
      return state.status === 'ready'
        ? { ...state, sending: false, leaving: action.decision }
        : state;
    case 'sendFailed':
      return state.status === 'ready' ? { ...state, sending: false, error: action.notice } : state;
  }
}
