import type { AccessLevel } from '@connection-portal/api-types/agent-access';

import { ApiError } from '../../api/client';
import { CONSENT_COPY, INITIAL_CONSENT_STATE, REQUIRED_PARAMETERS } from './constants';
import type { ConsentAction, ConsentState, RequestReading } from './types';

// The levels from the least to the most access
const LEVEL_ORDER: AccessLevel[] = ['read', 'drafts', 'manage'];

/**
 * Reads the authorization request from the page's query string (contracts/oauth.md
 * "Authorization"). Every parameter but `scope` is required, and an empty one counts as missing;
 * the server checks the values themselves.
 */
export function requestOf(searchParams: URLSearchParams): RequestReading {
  const missing = REQUIRED_PARAMETERS.filter((name) => !searchParams.get(name));
  if (missing.length > 0) {
    return { ok: false, message: CONSENT_COPY.missing(missing) };
  }
  if (searchParams.get('response_type') !== 'code') {
    return { ok: false, message: CONSENT_COPY.responseType };
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
 * The level to preselect for a requested scope: the highest level its words name
 * (`read drafts manage` → `manage`, `read drafts` → `drafts`), "Read only" otherwise
 */
export function preselectedLevelOf(scope: string | null | undefined): AccessLevel {
  const words = new Set((scope ?? '').split(/\s+/));
  if (words.has('manage')) return 'manage';
  if (words.has('drafts')) return 'drafts';
  return 'read';
}

/** Whether a client with an existing connection asks for more than that connection's level */
export function isStepUp(current: AccessLevel | null, requested: AccessLevel): boolean {
  return current !== null && LEVEL_ORDER.indexOf(requested) > LEVEL_ORDER.indexOf(current);
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
        level: action.level,
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
