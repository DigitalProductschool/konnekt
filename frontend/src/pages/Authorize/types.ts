import type { AccessLevel } from '@connection-portal/api-types/agent-access';
import type { ErrorNotice } from '@connection-portal/api-types/api';
import type { AuthorizeRequest, OauthClientView } from '@connection-portal/api-types/oauth';

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
  | { type: 'loaded'; client: OauthClientView; level: AccessLevel }
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

export interface InvalidRequestAlertProps {
  message: string;
}

export interface LoadFailedAlertProps {
  /** Why the client couldn't be loaded, with a 5xx answer's error ID */
  notice: ErrorNotice;
}
