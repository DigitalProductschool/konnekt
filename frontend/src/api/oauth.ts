import type {
  AuthorizeRequest,
  AuthorizeResponse,
  OauthClientView,
} from '@konnekt/api-types/oauth';

import { apiFetch } from './client';

// The consent page's endpoints (specs/007-agent-mcp-server/contracts/oauth.md "Authorization")

export function getOauthClient(clientId: string): Promise<OauthClientView> {
  return apiFetch<OauthClientView>(`/oauth/clients/${encodeURIComponent(clientId)}`);
}

/** The page's decision; the answer says where to send the browser */
export function authorize(body: AuthorizeRequest): Promise<AuthorizeResponse> {
  return apiFetch<AuthorizeResponse>('/oauth/authorize', { method: 'POST', body });
}
