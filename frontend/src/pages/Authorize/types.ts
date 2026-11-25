import type { AccessLevel } from '@konnekt/api-types/agent-access';
import type { ErrorNotice } from '@konnekt/api-types/api';
import type { AuthorizeRequest, OauthClientView } from '@konnekt/api-types/oauth';

/** The authorization request of the page's query string, as the decision sends it back */
export type ConsentRequest = Omit<AuthorizeRequest, 'decision' | 'access_level' | 'scope'> & {
  /** '' when the request names no scope */
  scope: string;
};

/** The query string read: the request, or why it can't be used */
export type RequestReading = { ok: true; request: ConsentRequest } | { ok: false; message: string };

export type ConsentDecision = AuthorizeRequest['decision'];

export type ConsentState =
  | { status: 'loading' }
  /** A bad request: the alert in place of the form, with no redirect */
  | { status: 'invalid'; message: string }
  /** The client couldn't be loaded for another reason (network, 5xx) */
  | { status: 'failed'; notice: ErrorNotice }
  | {
      status: 'ready';
      client: OauthClientView;
      level: AccessLevel;
      /** A decision is on its way to the server */
      sending: boolean;
      /** The decision sent; the browser is leaving for the client's redirect URI */
      leaving: ConsentDecision | null;
      error: ErrorNotice | null;
    };

export type ConsentAction =
  /** The client is known; `requested` is the level the request's scope asks for */
  | { type: 'loaded'; client: OauthClientView; requested: AccessLevel }
  | { type: 'invalid'; message: string }
  | { type: 'failed'; notice: ErrorNotice }
  | { type: 'choose'; level: AccessLevel }
  | { type: 'send' }
  | { type: 'sent'; decision: ConsentDecision }
  | { type: 'sendFailed'; notice: ErrorNotice };

export interface ConsentFormProps {
  clientName: string;
  level: AccessLevel;
  onLevelChange: (level: AccessLevel) => void;
  /** The client asks for more than its existing connection's level */
  stepUp: boolean;
  sending: boolean;
  leaving: ConsentDecision | null;
  error: ErrorNotice | null;
  onDecide: (decision: ConsentDecision) => void;
}

/**
 * Where the browser takes the answer, read from the request's redirect URI (spec 012, research
 * R6, finding 6): a website's host, an app on this computer through a loopback address or
 * through its own scheme (with the colon, `cursor:`), or nothing the page can name (a URI no
 * decision can succeed with)
 */
export type RedirectTarget =
  | { kind: 'web'; host: string }
  | { kind: 'loopback' }
  | { kind: 'app'; scheme: string }
  | { kind: 'unknown' };

/**
 * Who gives the client's name: the client itself either way. `registered`: it registered itself
 * (dynamic registration); `published`: it publishes the name in its metadata document on `host`
 */
export type NameSource = { kind: 'registered' } | { kind: 'published'; host: string };

export interface ClientFactsProps {
  client: OauthClientView;
  /** The request's redirect URI, which the server requires to be one of the client's */
  redirectUri: string;
}

export interface EmphasizedFactProps {
  /** The sentence up to the emphasized part, without the space before it */
  before: string;
  /** A host or a scheme */
  emphasis: string;
  /** The rest of the sentence, with its own leading space where the language wants one */
  after: string;
}

export interface InvalidRequestAlertProps {
  message: string;
}

export interface LoadFailedAlertProps {
  /** Why the client couldn't be loaded, with a 5xx answer's error ID */
  notice: ErrorNotice;
}
