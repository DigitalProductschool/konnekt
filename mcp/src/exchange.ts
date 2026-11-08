// One HTTP request to /mcp, as the tools see it: the caller resolved for it, and an answer at the
// HTTP level that replaces the SDK's where the response hasn't started yet. It reaches the tool
// handlers as the SDK's pass-through `authInfo` (`req.auth`), in both protocol eras
import type { AccessLevel } from '@connection-portal/api-types/agent-access';
import type { AuthInfo, ServerContext } from '@modelcontextprotocol/server';

import type { Caller, HttpAnswer } from './auth';

/** The state of one HTTP request to /mcp. */
export interface Exchange {
  /** Resolved with `callerOf()` for this request, so the level is the one of this call. */
  caller: Caller;
  /** Set by a tool: the HTTP answer to send instead of the SDK's (the `401`, the step-up). */
  httpAnswer: HttpAnswer | null;
  /** Whether a tool call wrote this request's log line. */
  logged: boolean;
}

const LEVELS: readonly AccessLevel[] = ['read', 'drafts', 'manage'];

/** A new exchange for `caller`. */
export function exchangeFor(caller: Caller): Exchange {
  return { caller, httpAnswer: null, logged: false };
}

/** The `authInfo` that carries `exchange` through the SDK; the scopes are the level's (R5). */
export function authInfoOf(exchange: Exchange): AuthInfo {
  const { caller } = exchange;
  return {
    token: caller.token,
    clientId: caller.clientName ?? caller.kind,
    scopes: LEVELS.slice(0, LEVELS.indexOf(caller.accessLevel) + 1),
    extra: { exchange },
  };
}

/** The exchange a tool call belongs to, from the SDK's context; `null` outside /mcp. */
export function exchangeOf(authInfo: AuthInfo | undefined): Exchange | null {
  const exchange = authInfo?.extra?.exchange;
  return typeof exchange === 'object' && exchange !== null && 'caller' in exchange
    ? (exchange as Exchange)
    : null;
}

/** The exchange of a tool call's context. */
export function exchangeOfContext(context: ServerContext): Exchange | null {
  return exchangeOf(context.http?.authInfo);
}
