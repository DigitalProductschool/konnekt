// Mirrors the OAuth schemas in backend/app/schemas.py that the consent page uses
// (specs/007-agent-mcp-server/contracts/oauth.md)
import type { AccessLevel } from './agent-access';

/** An OAuth client, as the consent page shows it */
export interface OauthClientView {
  client_id: string;
  client_name: string;
  kind: 'cimd' | 'dcr';
  /** The signed-in account's existing agent connection's level for this client */
  current_access_level: AccessLevel | null;
}

/** The consent page's decision */
export interface AuthorizeRequest {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  state: string;
  /** '' by default */
  scope?: string;
  resource: string;
  decision: 'allow' | 'deny';
  access_level?: AccessLevel | null;
}

/** Where the consent page sends the browser: the client's redirect URI */
export interface AuthorizeResponse {
  redirect_to: string;
}
